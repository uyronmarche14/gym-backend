import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Admin/Staff: Create check-in for a user (manual check-in - requires authentication)
export const createCheckIn = async (req, res) => {
    try {
        const { userId } = req.body;
        const staffId = req.user.id; // Admin/Staff who is performing the check-in

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Create check-in record
        const checkIn = await prisma.checkIn.create({
            data: {
                userId: parseInt(userId),
                checkInTime: new Date()
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                        email: true,
                        membershipType: true,
                        status: true
                    }
                }
            }
        });

        res.json({
            success: true,
            message: `${checkIn.user.firstName || checkIn.user.username} checked in successfully`,
            checkIn,
            checkedInBy: staffId
        });
    } catch (error) {
        console.error('Create Check-in Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create check-in' });
    }
};

// Quick Check-in by Phone/Email (No authentication required - for gym kiosk/QR code)
export const quickCheckIn = async (req, res) => {
    try {
        const { phone, email, username } = req.body;

        // Find user by phone, email, or username
        let user = null;

        if (phone) {
            user = await prisma.user.findFirst({
                where: { phone }
            });
        } else if (email) {
            user = await prisma.user.findUnique({
                where: { email }
            });
        } else if (username) {
            user = await prisma.user.findUnique({
                where: { username }
            });
        }

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Member not found. Please contact staff.' 
            });
        }

        // Check if user has active membership
        if (user.status !== 'active') {
            return res.status(403).json({ 
                success: false, 
                message: `Membership status: ${user.status}. Please contact staff.`,
                userStatus: user.status
            });
        }

        // Create check-in record
        const checkIn = await prisma.checkIn.create({
            data: {
                userId: user.id,
                checkInTime: new Date()
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                        email: true,
                        membershipType: true,
                        status: true
                    }
                }
            }
        });

        res.json({
            success: true,
            message: `Welcome ${checkIn.user.firstName || checkIn.user.username}!`,
            checkIn,
            membershipType: checkIn.user.membershipType
        });
    } catch (error) {
        console.error('Quick Check-in Error:', error);
        res.status(500).json({ success: false, message: 'Check-in failed. Please try again.' });
    }
};

// Get all check-ins (Admin/Staff view)
export const getAllCheckIns = async (req, res) => {
    try {
        const { startDate, endDate, userId, status } = req.query;

        let where = {};

        // Filter by date range
        if (startDate || endDate) {
            where.checkInTime = {};
            if (startDate) {
                where.checkInTime.gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.checkInTime.lte = end;
            }
        }

        // Filter by user
        if (userId) {
            where.userId = parseInt(userId);
        }

        const checkIns = await prisma.checkIn.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                        email: true,
                        membershipType: true,
                        status: true
                    }
                }
            },
            orderBy: { checkInTime: 'desc' },
            take: 100
        });

        // Calculate stats
        const totalCheckIns = checkIns.length;
        const uniqueUsers = new Set(checkIns.map(c => c.userId)).size;

        res.json({
            success: true,
            data: {
                checkIns,
                stats: {
                    totalCheckIns,
                    uniqueUsers,
                    dateRange: { startDate, endDate }
                }
            }
        });
    } catch (error) {
        console.error('Get All Check-ins Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch check-ins' });
    }
};

// Get check-ins for a specific user
export const getUserCheckIns = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { startDate, endDate } = req.query;

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let where = { userId };

        // Filter by date range
        if (startDate || endDate) {
            where.checkInTime = {};
            if (startDate) {
                where.checkInTime.gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.checkInTime.lte = end;
            }
        }

        const checkIns = await prisma.checkIn.findMany({
            where,
            orderBy: { checkInTime: 'desc' },
            take: 50
        });

        // Calculate stats
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const thisMonthCheckIns = checkIns.filter(c => new Date(c.checkInTime) >= thisMonth).length;

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    email: user.email
                },
                checkIns,
                stats: {
                    totalCheckIns: checkIns.length,
                    thisMonthCheckIns,
                    lastCheckIn: checkIns[0]?.checkInTime || null
                }
            }
        });
    } catch (error) {
        console.error('Get User Check-ins Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user check-ins' });
    }
};

// Get today's check-ins
export const getTodayCheckIns = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const checkIns = await prisma.checkIn.findMany({
            where: {
                checkInTime: {
                    gte: today,
                    lt: tomorrow
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                        email: true,
                        membershipType: true,
                        status: true
                    }
                }
            },
            orderBy: { checkInTime: 'desc' }
        });

        const uniqueUsers = new Set(checkIns.map(c => c.userId)).size;

        res.json({
            success: true,
            data: {
                date: today.toISOString().split('T')[0],
                checkIns,
                stats: {
                    totalCheckIns: checkIns.length,
                    uniqueUsers
                }
            }
        });
    } catch (error) {
        console.error('Get Today Check-ins Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch today\'s check-ins' });
    }
};

// Get check-in statistics
export const getCheckInStats = async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        startDate.setHours(0, 0, 0, 0);

        const checkIns = await prisma.checkIn.findMany({
            where: {
                checkInTime: {
                    gte: startDate
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        // Group by date
        const byDate = {};
        checkIns.forEach(checkIn => {
            const date = new Date(checkIn.checkInTime).toISOString().split('T')[0];
            if (!byDate[date]) {
                byDate[date] = { count: 0, users: new Set() };
            }
            byDate[date].count++;
            byDate[date].users.add(checkIn.userId);
        });

        // Convert to array format for charts
        const chartData = Object.entries(byDate)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, data]) => ({
                date,
                totalCheckIns: data.count,
                uniqueUsers: data.users.size
            }));

        // Overall stats
        const totalCheckIns = checkIns.length;
        const uniqueUsers = new Set(checkIns.map(c => c.userId)).size;
        const avgCheckInsPerDay = (totalCheckIns / parseInt(days)).toFixed(2);

        res.json({
            success: true,
            data: {
                stats: {
                    totalCheckIns,
                    uniqueUsers,
                    avgCheckInsPerDay,
                    period: `Last ${days} days`
                },
                chartData
            }
        });
    } catch (error) {
        console.error('Get Check-in Stats Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch check-in statistics' });
    }
};

// Delete a check-in (Admin only)
export const deleteCheckIn = async (req, res) => {
    try {
        const { checkInId } = req.params;

        const checkIn = await prisma.checkIn.findUnique({
            where: { id: parseInt(checkInId) }
        });

        if (!checkIn) {
            return res.status(404).json({ success: false, message: 'Check-in not found' });
        }

        await prisma.checkIn.delete({
            where: { id: parseInt(checkInId) }
        });

        res.json({
            success: true,
            message: 'Check-in deleted successfully'
        });
    } catch (error) {
        console.error('Delete Check-in Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete check-in' });
    }
};
