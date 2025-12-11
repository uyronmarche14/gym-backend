import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create a new payment request with detailed transaction tracking
 */
export const createPayment = async (req, res) => {
    try {
        const { 
            planName, 
            amount, 
            paymentMethod, 
            receiptUrl, 
            membershipPlanId,
            description,
            taxAmount,
            discountAmount,
            paymentGateway,
            transactionId
        } = req.body;
        const userId = req.user.id;

        if (!amount || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate membership plan if provided
        let planDetails = null;
        if (membershipPlanId) {
            planDetails = await prisma.membershipPlan.findUnique({
                where: { id: parseInt(membershipPlanId) }
            });
            if (!planDetails) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid membership plan'
                });
            }
        }

        // Calculate net amount
        const baseAmount = parseFloat(amount);
        const tax = parseFloat(taxAmount || 0);
        const discount = parseFloat(discountAmount || 0);
        const netAmount = baseAmount + tax - discount;

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${userId}`;

        const payment = await prisma.payment.create({
            data: {
                userId,
                planName: planDetails ? planDetails.name : (planName || 'Custom'),
                membershipPlanId: membershipPlanId ? parseInt(membershipPlanId) : null,
                amount: baseAmount,
                paymentMethod,
                receiptUrl,
                status: 'pending',
                description: description || null,
                taxAmount: tax || 0,
                discountAmount: discount || 0,
                netAmount: netAmount,
                paymentGateway: paymentGateway || 'manual',
                transactionId: transactionId || null,
                invoiceNumber: invoiceNumber
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Payment request submitted successfully',
            payment
        });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment request',
            error: error.message
        });
    }
};

/**
 * Get all payments (Admin only)
 */
export const getPayments = async (req, res) => {
    try {
        const payments = await prisma.payment.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments',
            error: error.message
        });
    }
};

/**
 * Get user's payments
 */
export const getUserPayments = async (req, res) => {
    try {
        const userId = req.user.id;
        const payments = await prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error('Error fetching user payments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your payments',
            error: error.message
        });
    }
};

/**
 * Update payment status (Approve/Reject) with admin tracking
 */
export const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approvalNotes } = req.body; // 'approved' or 'rejected'
        const adminId = req.user.id;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Start a transaction to update payment and user membership if approved
        const result = await prisma.$transaction(async (prisma) => {
            // 1. Update Payment Status with admin approval tracking
            const payment = await prisma.payment.update({
                where: { id: parseInt(id) },
                data: { 
                    status,
                    approvedBy: adminId,
                    approvalNotes: approvalNotes || null,
                    approvedAt: new Date()
                },
                include: { user: true, membershipPlan: true }
            });

            // 2. If approved, update User Membership
            if (status === 'approved') {
                // Calculate new expiry date
                const today = new Date();
                let durationDays = 30; // Default fallback

                if (payment.membershipPlan) {
                    durationDays = payment.membershipPlan.durationDays;
                } else {
                    // Try to infer from planName (Legacy support)
                    const name = payment.planName.toLowerCase();
                    if (name.includes('week')) durationDays = 7;
                    else if (name.includes('half month')) durationDays = 15;
                    else if (name.includes('3 month')) durationDays = 90;
                    else if (name.includes('6 month')) durationDays = 180;
                    else if (name.includes('year')) durationDays = 365;
                    else if (name.includes('walk-in') || name.includes('daily')) durationDays = 1;
                }

                // If user already has an active future expiry, add to it? 
                // For now, let's just set it from today or extend current expiry if it's in the future.
                let startDate = today;
                if (payment.user.expiryDate && payment.user.expiryDate > today) {
                    startDate = payment.user.expiryDate;
                }

                const expiryDate = new Date(startDate);
                expiryDate.setDate(expiryDate.getDate() + durationDays);

                await prisma.user.update({
                    where: { id: payment.userId },
                    data: {
                        membershipType: payment.planName,
                        status: 'active',
                        expiryDate: expiryDate
                    }
                });
            }

            return payment;
        });

        res.json({
            success: true,
            message: `Payment ${status} successfully`,
            payment: result
        });
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status',
            error: error.message
        });
    }
};

/**
 * Get detailed payment information
 */
export const getPaymentDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const payment = await prisma.payment.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                },
                membershipPlan: true
            }
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.json({
            success: true,
            payment
        });
    } catch (error) {
        console.error('Error fetching payment details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment details',
            error: error.message
        });
    }
};

/**
 * Process refund for a payment
 */
export const refundPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { refundAmount, refundReason } = req.body;
        const adminId = req.user.id;

        // Get payment
        const payment = await prisma.payment.findUnique({
            where: { id: parseInt(id) }
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Only approved payments can be refunded'
            });
        }

        const refundAmt = parseFloat(refundAmount || payment.netAmount);

        if (refundAmt > payment.netAmount) {
            return res.status(400).json({
                success: false,
                message: 'Refund amount cannot exceed payment amount'
            });
        }

        // Update payment with refund details
        const updatedPayment = await prisma.payment.update({
            where: { id: parseInt(id) },
            data: {
                status: 'refunded',
                refundAmount: refundAmt,
                refundReason: refundReason || null,
                refundedAt: new Date(),
                refundStatus: 'completed',
                approvedBy: adminId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        res.json({
            success: true,
            message: 'Payment refunded successfully',
            payment: updatedPayment
        });
    } catch (error) {
        console.error('Error refunding payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refund payment',
            error: error.message
        });
    }
};
