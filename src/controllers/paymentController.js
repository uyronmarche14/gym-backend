import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create a new payment request
 */
export const createPayment = async (req, res) => {
    try {
        const { planName, amount, paymentMethod, receiptUrl } = req.body;
        const userId = req.user.id;

        if (!planName || !amount || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const payment = await prisma.payment.create({
            data: {
                userId,
                planName,
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
                include: { user: true }
            });

            // 2. If approved, update User Membership
            if (status === 'approved') {
                // Calculate new expiry date (e.g., +30 days)
                const today = new Date();
                const expiryDate = new Date(today.setDate(today.getDate() + 30));

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
