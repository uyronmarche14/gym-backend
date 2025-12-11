import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
    try {
        const { role, status, search } = req.query;

        let where = {};

        // Filter by role
        if (role) {
            where.role = role;
        }

        // Filter by status
        if (status) {
            where.status = status;
        }

        // Search by name, email, or username
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } }
            ];
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                email: true,
                role: true,
                status: true,
                membershipType: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

// Get users by role (for dropdowns)
export const getUsersByRole = async (req, res) => {
    try {
        const { role = 'user' } = req.query;

        const users = await prisma.user.findMany({
            where: { role },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                email: true,
                status: true
            },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
            take: 200
        });

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Get Users By Role Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

// Search users (for dynamic search)
export const searchUsers = async (req, res) => {
    try {
        const { query, limit = 20 } = req.query;

        if (!query || query.length < 2) {
            return res.json({ success: true, users: [] });
        }

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { username: { contains: query, mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                email: true,
                status: true
            },
            take: parseInt(limit)
        });

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Search Users Error:', error);
        res.status(500).json({ success: false, message: 'Failed to search users' });
    }
};

// Get user by ID
export const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                email: true,
                role: true,
                status: true,
                membershipType: true,
                joinDate: true,
                expiryDate: true
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get User By ID Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
};
