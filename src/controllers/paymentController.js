import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create a new payment request
 */
export const createPayment = async (req, res) => {
    try {
        const { planName, amount, paymentMethod, receiptUrl, membershipPlanId } = req.body;
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

        const payment = await prisma.payment.create({
            data: {
                userId,
                planName: planDetails ? planDetails.name : (planName || 'Custom'),
                membershipPlanId: membershipPlanId ? parseInt(membershipPlanId) : null,
                amount: parseFloat(amount),
                paymentMethod,
                receiptUrl,
                status: 'pending'
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
 * Update payment status (Approve/Reject)
 */
export const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Start a transaction to update payment and user membership if approved
        const result = await prisma.$transaction(async (prisma) => {
            // 1. Update Payment Status
            const payment = await prisma.payment.update({
                where: { id: parseInt(id) },
                data: { status },
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
