import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all coaching packages (with optional filters)
export const getAllPackages = async (req, res) => {
    try {
        const { packageType, isActive, coachId } = req.query;

        const where = {};

        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        if (packageType) {
            where.packageType = packageType;
        }

        if (coachId) {
            where.coachId = parseInt(coachId);
        }

        const packages = await prisma.coachingPackage.findMany({
            where,
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
                _count: {
                    select: {
                        purchases: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json(packages);
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
};

// Get package by ID
export const getPackageById = async (req, res) => {
    try {
        const { id } = req.params;

        const package_ = await prisma.coachingPackage.findUnique({
            where: { id: parseInt(id) },
            include: {
                coach: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        purchases: true,
                    },
                },
            },
        });

        if (!package_) {
            return res.status(404).json({ error: 'Package not found' });
        }

        res.json(package_);
    } catch (error) {
        console.error('Error fetching package:', error);
        res.status(500).json({ error: 'Failed to fetch package' });
    }
};

// Create new package (Admin only)
export const createPackage = async (req, res) => {
    try {
        const {
            name,
            description,
            packageType,
            sessionsIncluded,
            sessionDuration,
            validityDays,
            maxParticipants,
            price,
            studentPrice,
            coachId,
            isCoachSpecific,
        } = req.body;

        // Validate required fields
        if (!name || !packageType || !sessionsIncluded || !sessionDuration || !validityDays || !price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // If coach-specific, validate coach exists
        if (isCoachSpecific && coachId) {
            const coach = await prisma.coach.findUnique({
                where: { id: parseInt(coachId) },
            });

            if (!coach) {
                return res.status(404).json({ error: 'Coach not found' });
            }
        }

        const package_ = await prisma.coachingPackage.create({
            data: {
                name,
                description,
                packageType,
                sessionsIncluded: parseInt(sessionsIncluded),
                sessionDuration: parseInt(sessionDuration),
                validityDays: parseInt(validityDays),
                maxParticipants: maxParticipants ? parseInt(maxParticipants) : 1,
                price: parseFloat(price),
                studentPrice: studentPrice ? parseFloat(studentPrice) : null,
                coachId: coachId ? parseInt(coachId) : null,
                isCoachSpecific: isCoachSpecific || false,
            },
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
        });

        res.status(201).json(package_);
    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ error: 'Failed to create package' });
    }
};

// Update package (Admin only)
export const updatePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            packageType,
            sessionsIncluded,
            sessionDuration,
            validityDays,
            maxParticipants,
            price,
            studentPrice,
            coachId,
            isCoachSpecific,
            isActive,
        } = req.body;

        const package_ = await prisma.coachingPackage.findUnique({
            where: { id: parseInt(id) },
        });

        if (!package_) {
            return res.status(404).json({ error: 'Package not found' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (packageType !== undefined) updateData.packageType = packageType;
        if (sessionsIncluded !== undefined) updateData.sessionsIncluded = parseInt(sessionsIncluded);
        if (sessionDuration !== undefined) updateData.sessionDuration = parseInt(sessionDuration);
        if (validityDays !== undefined) updateData.validityDays = parseInt(validityDays);
        if (maxParticipants !== undefined) updateData.maxParticipants = parseInt(maxParticipants);
        if (price !== undefined) updateData.price = parseFloat(price);
        if (studentPrice !== undefined) updateData.studentPrice = parseFloat(studentPrice);
        if (coachId !== undefined) updateData.coachId = coachId ? parseInt(coachId) : null;
        if (isCoachSpecific !== undefined) updateData.isCoachSpecific = isCoachSpecific;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedPackage = await prisma.coachingPackage.update({
            where: { id: parseInt(id) },
            data: updateData,
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
        });

        res.json(updatedPackage);
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ error: 'Failed to update package' });
    }
};

// Delete/Deactivate package (Admin only)
export const deletePackage = async (req, res) => {
    try {
        const { id } = req.params;

        const package_ = await prisma.coachingPackage.findUnique({
            where: { id: parseInt(id) },
        });

        if (!package_) {
            return res.status(404).json({ error: 'Package not found' });
        }

        // Soft delete - just deactivate
        await prisma.coachingPackage.update({
            where: { id: parseInt(id) },
            data: { isActive: false },
        });

        res.json({ message: 'Package deactivated successfully' });
    } catch (error) {
        console.error('Error deleting package:', error);
        res.status(500).json({ error: 'Failed to delete package' });
    }
};

// Purchase a package (User)
export const purchasePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, receiptUrl } = req.body;
        const userId = req.user.id;

        // Get package details
        const package_ = await prisma.coachingPackage.findUnique({
            where: { id: parseInt(id) },
        });

        if (!package_) {
            return res.status(404).json({ error: 'Package not found' });
        }

        if (!package_.isActive) {
            return res.status(400).json({ error: 'Package is not available' });
        }

        // Get user details to check if student
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        // Calculate price (student or regular)
        const amount = user.isStudent && package_.studentPrice
            ? package_.studentPrice
            : package_.price;

        // Calculate expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + package_.validityDays);

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${userId}`;

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                userId,
                planName: package_.name,
                amount,
                paymentMethod,
                paymentType: 'coaching_package',
                status: 'pending',
                receiptUrl,
                invoiceNumber, // Added invoiceNumber
            },
        });

        // Create package purchase (pending until payment approved)
        const purchase = await prisma.packagePurchase.create({
            data: {
                userId,
                packageId: package_.id,
                packageName: package_.name,
                totalSessions: package_.sessionsIncluded,
                sessionsRemaining: package_.sessionsIncluded,
                paymentId: payment.id,
                amount,
                expiryDate,
                status: 'pending', // Will be activated when payment is approved
            },
            include: {
                package: true,
                payment: true,
            },
        });

        res.status(201).json({
            message: 'Package purchase created. Awaiting payment approval.',
            purchase,
            payment,
        });
    } catch (error) {
        console.error('Error purchasing package:', error);
        res.status(500).json({ error: 'Failed to purchase package' });
    }
};

// Get package statistics (Admin)
export const getPackageStats = async (req, res) => {
    try {
        const totalPackages = await prisma.coachingPackage.count();
        const activePackages = await prisma.coachingPackage.count({
            where: { isActive: true },
        });

        const totalPurchases = await prisma.packagePurchase.count();
        const activePurchases = await prisma.packagePurchase.count({
            where: { status: 'active' },
        });

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

        // Most popular packages
        const popularPackages = await prisma.coachingPackage.findMany({
            include: {
                _count: {
                    select: {
                        purchases: true,
                    },
                },
            },
            orderBy: {
                purchases: {
                    _count: 'desc',
                },
            },
            take: 5,
        });

        res.json({
            totalPackages,
            activePackages,
            totalPurchases,
            activePurchases,
            totalRevenue: totalRevenue._sum.amount || 0,
            popularPackages,
        });
    } catch (error) {
        console.error('Error fetching package stats:', error);
        res.status(500).json({ error: 'Failed to fetch package statistics' });
    }
};
