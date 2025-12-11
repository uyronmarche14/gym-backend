import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SessionService {
    /**
     * Get standard session includes for consistent data structure
     */
    static getSessionIncludes() {
        return {
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
                    id: true,
                    packageName: true,
                    sessionsRemaining: true,
                    totalSessions: true,
                },
            },
        };
    }

    /**
     * Build where clause for session queries
     */
    static buildWhereClause(filters) {
        const where = {};

        if (filters.userId) where.userId = parseInt(filters.userId);
        if (filters.coachId) where.coachId = parseInt(filters.coachId);
        if (filters.status) where.status = filters.status;
        
        if (filters.date) {
            where.sessionDate = {
                gte: new Date(filters.date + 'T00:00:00'),
                lt: new Date(filters.date + 'T23:59:59'),
            };
        }

        if (filters.upcoming === 'true') {
            where.sessionDate = { gte: new Date() };
            where.status = 'scheduled';
        }

        return where;
    }

    /**
     * Calculate duration in minutes between two times
     */
    static calculateDuration(startTime, endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        return (end - start) / (1000 * 60);
    }

    /**
     * Validate coach exists and is active
     */
    static async validateCoach(coachId) {
        const coach = await prisma.coach.findUnique({
            where: { id: parseInt(coachId) },
        });

        if (!coach || !coach.isActive) {
            throw new Error('Coach not available');
        }

        return coach;
    }

    /**
     * Validate package purchase
     */
    static async validatePackagePurchase(purchaseId, userId) {
        const purchase = await prisma.packagePurchase.findUnique({
            where: { id: parseInt(purchaseId) },
            include: {
                package: true,
            },
        });

        if (!purchase) {
            throw new Error('Package purchase not found');
        }

        if (purchase.userId !== userId) {
            throw new Error('Unauthorized access to package');
        }

        if (purchase.status !== 'active') {
            throw new Error('Package is not active');
        }

        if (purchase.sessionsRemaining <= 0) {
            throw new Error('No sessions remaining in package');
        }

        if (new Date(purchase.expiryDate) < new Date()) {
            throw new Error('Package has expired');
        }

        return purchase;
    }

    /**
     * Check for booking conflicts
     */
    static async checkBookingConflict({ coachId, sessionDate, startTime, endTime, excludeSessionId = null }) {
        const where = {
            coachId: parseInt(coachId),
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
                {
                    AND: [
                        { startTime: { gte: startTime } },
                        { endTime: { lte: endTime } },
                    ],
                },
            ],
        };

        if (excludeSessionId) {
            where.id = { not: parseInt(excludeSessionId) };
        }

        const conflict = await prisma.trainingSession.findFirst({ where });

        if (conflict) {
            throw new Error('Time slot is already booked');
        }
    }

    /**
     * Book a new training session
     */
    static async bookSession(data, userId) {
        const {
            coachId,
            purchaseId,
            sessionDate,
            startTime,
            endTime,
            sessionType,
            location,
            clientNotes,
        } = data;

        // Validate coach
        await this.validateCoach(coachId);
        
        // Validate package if provided
        if (purchaseId) {
            await this.validatePackagePurchase(purchaseId, userId);
        }

        // Check for conflicts
        await this.checkBookingConflict({
            coachId,
            sessionDate,
            startTime,
            endTime,
        });

        // Calculate duration
        const durationMinutes = this.calculateDuration(startTime, endTime);

        // Create session in transaction
        const session = await prisma.$transaction(async (tx) => {
            const newSession = await tx.trainingSession.create({
                data: {
                    userId,
                    coachId: parseInt(coachId),
                    purchaseId: purchaseId ? parseInt(purchaseId) : null,
                    sessionType: sessionType || 'one_on_one',
                    sessionDate: new Date(sessionDate),
                    startTime,
                    endTime,
                    durationMinutes,
                    location,
                    clientNotes,
                    status: 'scheduled',
                },
                include: this.getSessionIncludes(),
            });

            // Decrement package sessions if applicable
            if (purchaseId) {
                await tx.packagePurchase.update({
                    where: { id: parseInt(purchaseId) },
                    data: {
                        sessionsRemaining: { decrement: 1 },
                    },
                });
            }

            return newSession;
        });

        return session;
    }

    /**
     * Get sessions with filters
     */
    static async getSessions(filters = {}) {
        const where = this.buildWhereClause(filters);
        
        return await prisma.trainingSession.findMany({
            where,
            include: this.getSessionIncludes(),
            orderBy: { sessionDate: 'desc' },
        });
    }

    /**
     * Get session by ID
     */
    static async getSessionById(sessionId) {
        const session = await prisma.trainingSession.findUnique({
            where: { id: parseInt(sessionId) },
            include: {
                coach: true,
                user: true,
                purchase: true,
            },
        });

        if (!session) {
            throw new Error('Session not found');
        }

        return session;
    }

    /**
     * Check cancellation authorization
     */
    static checkCancellationAuth(session, userId, userRole) {
        const isCoach = session.coach.userId === userId;
        const isClient = session.userId === userId;
        const isAdmin = userRole === 'admin';

        if (!isCoach && !isClient && !isAdmin) {
            throw new Error('Unauthorized');
        }

        if (session.status !== 'scheduled') {
            throw new Error('Can only cancel scheduled sessions');
        }
    }

    /**
     * Determine who cancelled the session
     */
    static determineCancelledBy(session, userId, userRole) {
        if (session.userId === userId) return 'user';
        if (session.coach.userId === userId) return 'coach';
        return 'admin';
    }

    /**
     * Cancel a session
     */
    static async cancelSession(sessionId, userId, userRole, reason) {
        const session = await this.getSessionById(sessionId);
        
        // Check authorization
        this.checkCancellationAuth(session, userId, userRole);

        // Determine who cancelled
        const cancelledBy = this.determineCancelledBy(session, userId, userRole);

        // Update session and refund package in transaction
        const updatedSession = await prisma.$transaction(async (tx) => {
            const updated = await tx.trainingSession.update({
                where: { id: parseInt(sessionId) },
                data: {
                    status: 'cancelled',
                    cancelledBy,
                    cancellationReason: reason,
                    cancelledAt: new Date(),
                },
                include: this.getSessionIncludes(),
            });

            // Refund session to package
            if (session.purchaseId) {
                await tx.packagePurchase.update({
                    where: { id: session.purchaseId },
                    data: {
                        sessionsRemaining: { increment: 1 },
                    },
                });
            }

            return updated;
        });

        return updatedSession;
    }

    /**
     * Reschedule a session
     */
    static async rescheduleSession(sessionId, userId, userRole, data) {
        const { sessionDate, startTime, endTime } = data;
        
        const session = await this.getSessionById(sessionId);

        // Check authorization
        const isCoach = session.coach.userId === userId;
        const isClient = session.userId === userId;
        const isAdmin = userRole === 'admin';

        if (!isCoach && !isClient && !isAdmin) {
            throw new Error('Unauthorized');
        }

        if (session.status !== 'scheduled') {
            throw new Error('Can only reschedule scheduled sessions');
        }

        // Check for conflicts
        await this.checkBookingConflict({
            coachId: session.coachId,
            sessionDate,
            startTime,
            endTime,
            excludeSessionId: sessionId,
        });

        // Calculate new duration
        const durationMinutes = this.calculateDuration(startTime, endTime);

        const updatedSession = await prisma.trainingSession.update({
            where: { id: parseInt(sessionId) },
            data: {
                sessionDate: new Date(sessionDate),
                startTime,
                endTime,
                durationMinutes,
            },
            include: this.getSessionIncludes(),
        });

        return updatedSession;
    }

    /**
     * Complete a session
     */
    static async completeSession(sessionId, userId, userRole, data) {
        const { coachNotes, exercisesPerformed } = data;
        
        const session = await this.getSessionById(sessionId);

        // Check authorization (coach or admin)
        if (userRole !== 'admin' && session.coach.userId !== userId) {
            throw new Error('Unauthorized');
        }

        if (session.status !== 'scheduled') {
            throw new Error('Can only complete scheduled sessions');
        }

        const updatedSession = await prisma.$transaction(async (tx) => {
            const updated = await tx.trainingSession.update({
                where: { id: parseInt(sessionId) },
                data: {
                    status: 'completed',
                    coachNotes,
                    exercisesPerformed: exercisesPerformed ? JSON.stringify(exercisesPerformed) : null,
                },
                include: this.getSessionIncludes(),
            });

            // Update coach's total sessions count
            await tx.coach.update({
                where: { id: session.coachId },
                data: {
                    totalSessions: { increment: 1 },
                },
            });

            return updated;
        });

        return updatedSession;
    }

    /**
     * Get available slots for a coach on a specific date
     */
    static async getAvailableSlots(coachId, date) {
        const coach = await prisma.coach.findUnique({
            where: { id: parseInt(coachId) },
        });

        if (!coach || !coach.availableSlots) {
            return [];
        }

        const dateObj = new Date(date);
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateObj.getDay()];
        
        const availableSlots = JSON.parse(coach.availableSlots);
        const daySlots = availableSlots[dayName] || [];

        // Get booked sessions for this date
        const bookedSessions = await prisma.trainingSession.findMany({
            where: {
                coachId: parseInt(coachId),
                sessionDate: {
                    gte: new Date(date + 'T00:00:00'),
                    lt: new Date(date + 'T23:59:59'),
                },
                status: 'scheduled',
            },
            select: {
                startTime: true,
                endTime: true,
            },
        });

        // Filter out booked slots
        return daySlots.filter(slot => {
            const [slotStart, slotEnd] = slot.split('-');
            return !bookedSessions.some(session => 
                this.slotsOverlap(slotStart, slotEnd, session.startTime, session.endTime)
            );
        });
    }

    /**
     * Check if two time slots overlap
     */
    static slotsOverlap(start1, end1, start2, end2) {
        return (start1 < end2 && end1 > start2);
    }

    /**
     * Get session statistics
     */
    static async getSessionStats() {
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

        return {
            totalSessions,
            scheduledSessions,
            completedSessions,
            cancelledSessions,
            upcomingSessions,
            topCoaches,
        };
    }
}
