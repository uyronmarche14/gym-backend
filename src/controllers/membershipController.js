import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all active membership plans
 */
export const getMembershipPlans = async (req, res) => {
    try {
        const plans = await prisma.membershipPlan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });

        res.json({
            success: true,
            plans
        });
    } catch (error) {
        console.error('Error fetching membership plans:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch membership plans',
            error: error.message
        });
    }
};

/**
 * Create a new membership plan (Admin only)
 */
export const createMembershipPlan = async (req, res) => {
    try {
        const { name, durationDays, price, studentPrice, description } = req.body;

        if (!name || !durationDays || !price) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const plan = await prisma.membershipPlan.create({
            data: {
                name,
                durationDays: parseInt(durationDays),
                price: parseFloat(price),
                studentPrice: studentPrice ? parseFloat(studentPrice) : null,
                description
            }
        });

        res.status(201).json({
            success: true,
            message: 'Membership plan created successfully',
            plan
        });
    } catch (error) {
        console.error('Error creating membership plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create membership plan',
            error: error.message
        });
    }
};

/**
 * Update a membership plan
 */
export const updateMembershipPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, durationDays, price, studentPrice, description, isActive } = req.body;

        const plan = await prisma.membershipPlan.update({
            where: { id: parseInt(id) },
            data: {
                name,
                durationDays: durationDays ? parseInt(durationDays) : undefined,
                price: price ? parseFloat(price) : undefined,
                studentPrice: studentPrice !== undefined ? (studentPrice ? parseFloat(studentPrice) : null) : undefined,
                description,
                isActive
            }
        });

        res.json({
            success: true,
            message: 'Membership plan updated successfully',
            plan
        });
    } catch (error) {
        console.error('Error updating membership plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update membership plan',
            error: error.message
        });
    }
};
