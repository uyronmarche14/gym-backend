import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAdminStats = async (req, res) => {
    try {
        // 1. User Counts
        const totalUsers = await prisma.user.count({ where: { role: 'user' } });
        const activeUsers = await prisma.user.count({ where: { role: 'user', status: 'active' } });
        const newUsersThisMonth = await prisma.user.count({
            where: {
                role: 'user',
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        });

        // 2. Revenue Stats
        const totalRevenueAgg = await prisma.payment.aggregate({
            where: { status: 'approved' },
            _sum: { amount: true }
        });
        const totalRevenue = totalRevenueAgg._sum.amount || 0;

        const monthlyRevenueAgg = await prisma.payment.aggregate({
            where: {
                status: 'approved',
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            },
            _sum: { amount: true }
        });
        const monthlyRevenue = monthlyRevenueAgg._sum.amount || 0;

        // 3. Recent Activity
        const recentPayments = await prisma.payment.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { firstName: true, lastName: true, email: true, username: true } } }
        });

        const recentCheckIns = await prisma.checkIn.findMany({
            take: 5,
            orderBy: { checkInTime: 'desc' },
            include: { user: { select: { firstName: true, lastName: true, username: true } } }
        });

        res.json({
            success: true,
            stats: {
                users: { total: totalUsers, active: activeUsers, new: newUsersThisMonth },
                revenue: { total: totalRevenue, monthly: monthlyRevenue },
                recentPayments,
                recentCheckIns
            }
        });
    } catch (error) {
        console.error('Get Admin Stats Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch admin stats' });
    }
};

export const getUserStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                membershipType: true,
                status: true,
                expiryDate: true,
                joinDate: true
            }
        });

        const recentCheckIns = await prisma.checkIn.findMany({
            where: { userId },
            take: 5,
            orderBy: { checkInTime: 'desc' }
        });

        const recentPayments = await prisma.payment.findMany({
            where: { userId },
            take: 3,
            orderBy: { createdAt: 'desc' }
        });

        // Calculate days remaining
        let daysRemaining = 0;
        if (user.expiryDate && new Date(user.expiryDate) > new Date()) {
            const diffTime = Math.abs(new Date(user.expiryDate) - new Date());
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        res.json({
            success: true,
            stats: {
                membership: { ...user, daysRemaining },
                recentCheckIns,
                recentPayments
            }
        });
    } catch (error) {
        console.error('Get User Stats Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user stats' });
    }
};

export const checkInUser = async (req, res) => {
    try {
        const { userId } = req.body; // If admin checking in someone else
        const targetUserId = userId || req.user.id; // Default to self if not specified (and allowed)

        const checkIn = await prisma.checkIn.create({
            data: {
                userId: parseInt(targetUserId)
            },
            include: { user: { select: { firstName: true, lastName: true, username: true } } }
        });

        res.json({
            success: true,
            message: `Checked in ${checkIn.user.firstName || checkIn.user.username} successfully`,
            checkIn
        });
    } catch (error) {
        console.error('Check-in Error:', error);
        res.status(500).json({ success: false, message: 'Check-in failed' });
    }
};

export const getRevenueStats = async (req, res) => {
    try {
        // Get all approved payments
        const payments = await prisma.payment.findMany({
            where: { status: 'approved' },
            select: { amount: true, createdAt: true }
        });

        // Helper to format date keys
        const getWeekKey = (date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
            return d.toISOString().split('T')[0];
        };
        const getMonthKey = (date) => date.toISOString().slice(0, 7); // YYYY-MM
        const getYearKey = (date) => date.getFullYear().toString();

        const weekly = {};
        const monthly = {};
        const yearly = {};

        payments.forEach(p => {
            const amount = p.amount;
            const date = new Date(p.createdAt);

            const wKey = getWeekKey(date);
            const mKey = getMonthKey(date);
            const yKey = getYearKey(date);

            weekly[wKey] = (weekly[wKey] || 0) + amount;
            monthly[mKey] = (monthly[mKey] || 0) + amount;
            yearly[yKey] = (yearly[yKey] || 0) + amount;
        });

        // Convert to arrays for frontend graph (sorted)
        const formatData = (obj) => Object.entries(obj)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([label, value]) => ({ label, value }));

        // Limit to last 12 periods for cleanliness
        res.json({
            success: true,
            revenue: {
                weekly: formatData(weekly).slice(-12),
                monthly: formatData(monthly).slice(-12),
                yearly: formatData(yearly).slice(-5)
            }
        });

    } catch (error) {
        console.error('Get Revenue Stats Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch revenue stats' });
    }
};
