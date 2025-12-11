import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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

// Update user (admin can update any user, user can update themselves)
export const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { firstName, lastName, email, phone, status } = req.body;
        const requesterId = req.user.id;
        const requesterRole = req.user.role;

        // Check authorization
        if (requesterRole !== 'admin' && parseInt(userId) !== requesterId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Build update data
        const updateData = {};
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (status !== undefined && requesterRole === 'admin') updateData.status = status;

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: updateData,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                status: true
            }
        });

        res.json({
            success: true,
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
};

// Change user password (admin can change any user's password)
export const changeUserPassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        const requesterRole = req.user.role;

        // Only admin can change other users' passwords
        if (requesterRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only admin can change user passwords' });
        }

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { password: hashedPassword }
        });

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
};
