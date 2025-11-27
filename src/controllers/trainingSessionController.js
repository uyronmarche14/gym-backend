import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Book a training session
export const bookSession = async (req, res) => {
    try {
        const {
            coachId,
            purchaseId,
            sessionDate,
            startTime,
            endTime,
            sessionType,
            location,
            clientNotes,
        } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!coachId || !sessionDate || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate coach exists and is active
        const coach = await prisma.coach.findUnique({
            where: { id: parseInt(coachId) },
        });

        if (!coach || !coach.isActive) {
            return res.status(400).json({ error: 'Coach not available' });
        }

        // If purchaseId provided, validate and check sessions remaining
        if (purchaseId) {
            const purchase = await prisma.packagePurchase.findUnique({
                where: { id: parseInt(purchaseId) },
            });

            if (!purchase) {
                return res.status(404).json({ error: 'Package purchase not found' });
            }

            if (purchase.userId !== userId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            if (purchase.status !== 'active') {
                return res.status(400).json({ error: 'Package is not active' });
            }

            if (purchase.sessionsRemaining <= 0) {
                return res.status(400).json({ error: 'No sessions remaining in package' });
            }

            if (new Date(purchase.expiryDate) < new Date()) {
                return res.status(400).json({ error: 'Package has expired' });
            }
        }

        // Check for booking conflicts
        const sessionDateTime = new Date(sessionDate);
        const conflict = await prisma.trainingSession.findFirst({
            where: {
                coachId: parseInt(coachId),
                sessionDate: {
                    gte: new Date(sessionDate + 'T00:00:00'),
                    lt: new Date(sessionDate + 'T23:59:59'),
                },
                status: {
                    in: ['scheduled'],
                },
                OR: [
                    {
                        AND: [
                            { startTime: { lte: startTime } },
                            { endTime: { gt: startTime } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { lt: endTime } },
                            { endTime: { gte: endTime } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { gte: startTime } },
                            { endTime: { lte: endTime } },
                        ],
                    },
                ],
            },
        });

        if (conflict) {
            return res.status(400).json({
                error: 'Time slot is already booked',
                conflictingSession: conflict,
            });
        }

        // Calculate duration
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const durationMinutes = (end - start) / (1000 * 60);

        // Create session
        const session = await prisma.trainingSession.create({
            data: {
                userId,
                coachId: parseInt(coachId),
                purchaseId: purchaseId ? parseInt(purchaseId) : null,
                sessionType: sessionType || 'one_on_one',
                sessionDate: sessionDateTime,
                startTime,
                endTime,
                durationMinutes,
                location,
                clientNotes,
                status: 'scheduled',
            },
            include: {
                coach: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        // Decrement sessions remaining if using a package
        if (purchaseId) {
            await prisma.packagePurchase.update({
                where: { id: parseInt(purchaseId) },
                data: {
                    sessionsRemaining: {
                        decrement: 1,
                    },
                },
            });
        }

        res.status(201).json({
            message: 'Session booked successfully',
            session,
        });
    } catch (error) {
        console.error('Error booking session:', error);
        res.status(500).json({ error: 'Failed to book session' });
    }
};

// Get user's sessions
export const getUserSessions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, upcoming } = req.query;

        const where = { userId };

        if (status) {
            where.status = status;
        }

        if (upcoming === 'true') {
            where.sessionDate = {
                gte: new Date(),
            };
            where.status = 'scheduled';
        }

        const sessions = await prisma.trainingSession.findMany({
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
                purchase: {
                    select: {
                        packageName: true,
                    },
                },
            },
            orderBy: {
                sessionDate: 'desc',
            },
        });

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching user sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};

// Get coach's sessions
export const getCoachSessions = async (req, res) => {
    try {
        const { status, date } = req.query;

        // Find coach profile for current user
        const coach = await prisma.coach.findUnique({
            where: { userId: req.user.id },
        });

        if (!coach) {
            // Return empty array instead of error - user might not be a coach yet
            return res.json([]);
        }

        const where = { coachId: coach.id };

        if (status) {
            where.status = status;
        }

        if (date) {
            where.sessionDate = {
                gte: new Date(date + 'T00:00:00'),
                lt: new Date(date + 'T23:59:59'),
            };
        }

        if (req.query.upcoming === 'true') {
            where.sessionDate = {
                gte: new Date(),
            };
            where.status = 'scheduled';
        }

        const sessions = await prisma.trainingSession.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                purchase: {
                    select: {
                        packageName: true,
                    },
                },
            },
            orderBy: {
                sessionDate: 'asc',
            },
        });

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching coach sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};

// Get all sessions (Admin)
export const getAllSessions = async (req, res) => {
    try {
        const { status, coachId, userId, date } = req.query;

        const where = {};

        if (status) {
            where.status = status;
        }

        if (coachId) {
            where.coachId = parseInt(coachId);
        }

        if (userId) {
            where.userId = parseInt(userId);
        }

        if (date) {
            where.sessionDate = {
                gte: new Date(date + 'T00:00:00'),
                lt: new Date(date + 'T23:59:59'),
            };
        }

        const sessions = await prisma.trainingSession.findMany({
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
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                purchase: {
                    select: {
                        packageName: true,
                    },
                },
            },
            orderBy: {
                sessionDate: 'desc',
            },
        });

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};

// Get session by ID
export const getSessionById = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await prisma.trainingSession.findUnique({
            where: { id: parseInt(id) },
            include: {
                coach: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                purchase: true,
            },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check authorization
        if (
            req.user.role !== 'admin' &&
            session.userId !== req.user.id &&
            session.coach.userId !== req.user.id
        ) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json(session);
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
};

// Cancel session
export const cancelSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const session = await prisma.trainingSession.findUnique({
            where: { id: parseInt(id) },
            include: {
                coach: true,
                purchase: true,
            },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check authorization
        const isCoach = session.coach.userId === req.user.id;
        const isClient = session.userId === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isCoach && !isClient && !isAdmin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (session.status !== 'scheduled') {
            return res.status(400).json({ error: 'Can only cancel scheduled sessions' });
        }

        // Determine who cancelled
        let cancelledBy = 'admin';
        if (isClient) cancelledBy = 'user';
        if (isCoach) cancelledBy = 'coach';

        // Update session
        const updatedSession = await prisma.trainingSession.update({
            where: { id: parseInt(id) },
            data: {
                status: 'cancelled',
                cancelledBy,
                cancellationReason: reason,
                cancelledAt: new Date(),
            },
        });

        // Refund session to package if applicable
        if (session.purchaseId) {
            await prisma.packagePurchase.update({
                where: { id: session.purchaseId },
                data: {
                    sessionsRemaining: {
                        increment: 1,
                    },
                },
            });
        }

        res.json({
            message: 'Session cancelled successfully',
            session: updatedSession,
        });
    } catch (error) {
        console.error('Error cancelling session:', error);
        res.status(500).json({ error: 'Failed to cancel session' });
    }
};

// Reschedule session
export const rescheduleSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionDate, startTime, endTime } = req.body;

        const session = await prisma.trainingSession.findUnique({
            where: { id: parseInt(id) },
            include: {
                coach: true,
            },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check authorization
        if (
            req.user.role !== 'admin' &&
            session.userId !== req.user.id &&
            session.coach.userId !== req.user.id
        ) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (session.status !== 'scheduled') {
            return res.status(400).json({ error: 'Can only reschedule scheduled sessions' });
        }

        // Check for conflicts
        const conflict = await prisma.trainingSession.findFirst({
            where: {
                coachId: session.coachId,
                id: { not: parseInt(id) },
                sessionDate: {
                    gte: new Date(sessionDate + 'T00:00:00'),
                    lt: new Date(sessionDate + 'T23:59:59'),
                },
                status: 'scheduled',
                OR: [
                    {
                        AND: [
                            { startTime: { lte: startTime } },
                            { endTime: { gt: startTime } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { lt: endTime } },
                            { endTime: { gte: endTime } },
                        ],
                    },
                ],
            },
        });

        if (conflict) {
            return res.status(400).json({ error: 'Time slot is already booked' });
        }

        // Calculate new duration
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const durationMinutes = (end - start) / (1000 * 60);

        const updatedSession = await prisma.trainingSession.update({
            where: { id: parseInt(id) },
            data: {
                sessionDate: new Date(sessionDate),
                startTime,
                endTime,
                durationMinutes,
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

        res.json({
            message: 'Session rescheduled successfully',
            session: updatedSession,
        });
    } catch (error) {
        console.error('Error rescheduling session:', error);
        res.status(500).json({ error: 'Failed to reschedule session' });
    }
};

// Complete session (Coach or Admin)
export const completeSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { coachNotes, exercisesPerformed } = req.body;

        const session = await prisma.trainingSession.findUnique({
            where: { id: parseInt(id) },
            include: {
                coach: true,
            },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check authorization (coach or admin)
        if (req.user.role !== 'admin' && session.coach.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (session.status !== 'scheduled') {
            return res.status(400).json({ error: 'Can only complete scheduled sessions' });
        }

        const updatedSession = await prisma.trainingSession.update({
            where: { id: parseInt(id) },
            data: {
                status: 'completed',
                coachNotes,
                exercisesPerformed: exercisesPerformed ? JSON.stringify(exercisesPerformed) : null,
            },
        });

        // Update coach's total sessions count
        await prisma.coach.update({
            where: { id: session.coachId },
            data: {
                totalSessions: {
                    increment: 1,
                },
            },
        });

        res.json({
            message: 'Session marked as completed',
            session: updatedSession,
        });
    } catch (error) {
        console.error('Error completing session:', error);
        res.status(500).json({ error: 'Failed to complete session' });
    }
};

// Add session notes (Coach)
export const addSessionNotes = async (req, res) => {
    try {
        const { id } = req.params;
        const { coachNotes, exercisesPerformed } = req.body;

        const session = await prisma.trainingSession.findUnique({
            where: { id: parseInt(id) },
            include: {
                coach: true,
            },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check authorization (coach only)
        if (session.coach.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updatedSession = await prisma.trainingSession.update({
            where: { id: parseInt(id) },
            data: {
                coachNotes,
                exercisesPerformed: exercisesPerformed ? JSON.stringify(exercisesPerformed) : null,
            },
        });

        res.json(updatedSession);
    } catch (error) {
        console.error('Error adding session notes:', error);
        res.status(500).json({ error: 'Failed to add session notes' });
    }
};

// Get session statistics (Admin)
export const getSessionStats = async (req, res) => {
    try {
        const totalSessions = await prisma.trainingSession.count();
        const scheduledSessions = await prisma.trainingSession.count({
            where: { status: 'scheduled' },
        });
        const completedSessions = await prisma.trainingSession.count({
            where: { status: 'completed' },
        });
        const cancelledSessions = await prisma.trainingSession.count({
            where: { status: 'cancelled' },
        });

        // Upcoming sessions
        const upcomingSessions = await prisma.trainingSession.count({
            where: {
                status: 'scheduled',
                sessionDate: {
                    gte: new Date(),
                },
            },
        });

        // Sessions by coach
        const sessionsByCoach = await prisma.trainingSession.groupBy({
            by: ['coachId'],
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: 5,
        });

        // Get coach details for top coaches
        const topCoaches = await Promise.all(
            sessionsByCoach.map(async (item) => {
                const coach = await prisma.coach.findUnique({
                    where: { id: item.coachId },
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                });
                return {
                    coach,
                    sessionCount: item._count.id,
                };
            })
        );

        res.json({
            totalSessions,
            scheduledSessions,
            completedSessions,
            cancelledSessions,
            upcomingSessions,
            topCoaches,
        });
    } catch (error) {
        console.error('Error fetching session stats:', error);
        res.status(500).json({ error: 'Failed to fetch session statistics' });
    }
};
