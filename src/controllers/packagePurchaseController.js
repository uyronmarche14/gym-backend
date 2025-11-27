import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get user's package purchases
export const getUserPackages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;

        const where = { userId };

        if (status) {
            where.status = status;
        }

        const purchases = await prisma.packagePurchase.findMany({
            where,
            include: {
                package: {
                    include: {
                        coach: {
                            include: {
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                    },
                },
                payment: {
                    select: {
                        status: true,
                        paymentMethod: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        sessions: true,
                    },
                },
            },
            orderBy: {
                purchaseDate: 'desc',
            },
        });

        res.json(purchases);
    } catch (error) {
        console.error('Error fetching user packages:', error);
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
};

// Get all package purchases (Admin)
export const getAllPurchases = async (req, res) => {
    try {
        const { status, userId, packageId } = req.query;

        const where = {};

        if (status) {
            where.status = status;
        }

        if (userId) {
            where.userId = parseInt(userId);
        }

        if (packageId) {
            where.packageId = parseInt(packageId);
        }

        const purchases = await prisma.packagePurchase.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                package: {
                    select: {
                        id: true,
                        name: true,
                        packageType: true,
                    },
                },
                payment: {
                    select: {
                        status: true,
                        paymentMethod: true,
                        amount: true,
                    },
                },
                _count: {
                    select: {
                        sessions: true,
                    },
                },
            },
            orderBy: {
                purchaseDate: 'desc',
            },
        });

        res.json(purchases);
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ error: 'Failed to fetch purchases' });
    }
};

// Get purchase by ID
export const getPurchaseById = async (req, res) => {
    try {
        const { id } = req.params;

        const purchase = await prisma.packagePurchase.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                package: true,
                payment: true,
                sessions: {
                    orderBy: {
                        sessionDate: 'desc',
                    },
                },
            },
        });

        if (!purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        // Check authorization
        if (req.user.role !== 'admin' && purchase.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json(purchase);
    } catch (error) {
        console.error('Error fetching purchase:', error);
        res.status(500).json({ error: 'Failed to fetch purchase' });
    }
};

// Get purchase statistics (Admin)
export const getPurchaseStats = async (req, res) => {
    try {
        const totalPurchases = await prisma.packagePurchase.count();
        const activePurchases = await prisma.packagePurchase.count({
            where: { status: 'active' },
        });
        const expiredPurchases = await prisma.packagePurchase.count({
            where: { status: 'expired' },
        });

        // Total revenue from approved payments
        const totalRevenue = await prisma.packagePurchase.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                payment: {
                    status: 'approved',
                },
            },
        });

        // Revenue this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyRevenue = await prisma.packagePurchase.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                purchaseDate: {
                    gte: startOfMonth,
                },
                payment: {
                    status: 'approved',
                },
            },
        });

        // Purchases by package type
        const purchasesByType = await prisma.packagePurchase.groupBy({
            by: ['packageId'],
            _count: {
                id: true,
            },
            _sum: {
                amount: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: 5,
        });

        // Get package details for top packages
        const topPackages = await Promise.all(
            purchasesByType.map(async (item) => {
                const package_ = await prisma.coachingPackage.findUnique({
                    where: { id: item.packageId },
                });
                return {
                    package: package_,
                    purchaseCount: item._count.id,
                    totalRevenue: item._sum.amount,
                };
            })
        );

        // Expiring soon (within 7 days)
        const expiringSoon = await prisma.packagePurchase.count({
            where: {
                status: 'active',
                expiryDate: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            },
        });

        res.json({
            totalPurchases,
            activePurchases,
            expiredPurchases,
            expiringSoon,
            totalRevenue: totalRevenue._sum.amount || 0,
            monthlyRevenue: monthlyRevenue._sum.amount || 0,
            topPackages,
        });
    } catch (error) {
        console.error('Error fetching purchase stats:', error);
        res.status(500).json({ error: 'Failed to fetch purchase statistics' });
    }
};

// Check and expire packages (Cron job helper)
export const expirePackages = async (req, res) => {
    try {
        const now = new Date();

        // Find all active packages that have expired
        const expiredPackages = await prisma.packagePurchase.findMany({
            where: {
                status: 'active',
                expiryDate: {
                    lt: now,
                },
            },
        });

        // Update them to expired
        const updatePromises = expiredPackages.map((purchase) =>
            prisma.packagePurchase.update({
                where: { id: purchase.id },
                data: { status: 'expired' },
            })
        );

        await Promise.all(updatePromises);

        res.json({
            message: `Expired ${expiredPackages.length} packages`,
            count: expiredPackages.length,
        });
    } catch (error) {
        console.error('Error expiring packages:', error);
        res.status(500).json({ error: 'Failed to expire packages' });
    }
};
