import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all coaches (with optional filters)
export const getAllCoaches = async (req, res) => {
    try {
        const { specialization, isActive } = req.query;

        const where = {};

        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        const coaches = await prisma.coach.findMany({
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
                _count: {
                    select: {
                        sessions: true,
                        packages: true,
                    },
                },
            },
            orderBy: {
                rating: 'desc',
            },
        });

        // Filter by specialization if provided
        let filteredCoaches = coaches;
        if (specialization) {
            filteredCoaches = coaches.filter((coach) => {
                const specs = JSON.parse(coach.specializations || '[]');
                return specs.some((spec) =>
                    spec.toLowerCase().includes(specialization.toLowerCase())
                );
            });
        }

        // Parse JSON fields
        const parsedCoaches = filteredCoaches.map((coach) => ({
            ...coach,
            specializations: JSON.parse(coach.specializations || '[]'),
            certifications: JSON.parse(coach.certifications || '[]'),
            availableSlots: JSON.parse(coach.availableSlots || '{}'),
        }));

        res.json(parsedCoaches);
    } catch (error) {
        console.error('Error fetching coaches:', error);
        res.status(500).json({ error: 'Failed to fetch coaches' });
    }
};

// Get active coaches (public endpoint)
export const getActiveCoaches = async (req, res) => {
    try {
        const coaches = await prisma.coach.findMany({
            where: { isActive: true },
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
            orderBy: {
                rating: 'desc',
            },
        });

        const parsedCoaches = coaches.map((coach) => ({
            ...coach,
            specializations: JSON.parse(coach.specializations || '[]'),
            certifications: JSON.parse(coach.certifications || '[]'),
            availableSlots: JSON.parse(coach.availableSlots || '{}'),
        }));

        res.json(parsedCoaches);
    } catch (error) {
        console.error('Error fetching active coaches:', error);
        res.status(500).json({ error: 'Failed to fetch active coaches' });
    }
};

// Get coach by ID
export const getCoachById = async (req, res) => {
    try {
        const { id } = req.params;

        const coach = await prisma.coach.findUnique({
            where: { id: parseInt(id) },
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
                packages: {
                    where: { isActive: true },
                },
                sessions: {
                    where: {
                        status: 'completed',
                    },
                    take: 10,
                    orderBy: {
                        sessionDate: 'desc',
                    },
                },
                _count: {
                    select: {
                        sessions: true,
                    },
                },
            },
        });

        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        const parsedCoach = {
            ...coach,
            specializations: JSON.parse(coach.specializations || '[]'),
            certifications: JSON.parse(coach.certifications || '[]'),
            availableSlots: JSON.parse(coach.availableSlots || '{}'),
        };

        res.json(parsedCoach);
    } catch (error) {
        console.error('Error fetching coach:', error);
        res.status(500).json({ error: 'Failed to fetch coach' });
    }
};

// Create new coach (Admin only)
export const createCoach = async (req, res) => {
    try {
        const {
            userId,
            specializations,
            bio,
            certifications,
            photoUrl,
            hourlyRate,
            availableSlots,
        } = req.body;

        // Validate user exists and is not already a coach
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { coachProfile: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.coachProfile) {
            return res.status(400).json({ error: 'User is already a coach' });
        }

        // Update user role to coach
        await prisma.user.update({
            where: { id: userId },
            data: { role: 'coach' },
        });

        const coach = await prisma.coach.create({
            data: {
                userId,
                specializations: JSON.stringify(specializations || []),
                bio,
                certifications: JSON.stringify(certifications || []),
                photoUrl,
                hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
                availableSlots: JSON.stringify(availableSlots || {}),
            },
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
        });

        const parsedCoach = {
            ...coach,
            specializations: JSON.parse(coach.specializations),
            certifications: JSON.parse(coach.certifications),
            availableSlots: JSON.parse(coach.availableSlots),
        };

        res.status(201).json(parsedCoach);
    } catch (error) {
        console.error('Error creating coach:', error);
        res.status(500).json({ error: 'Failed to create coach' });
    }
};

// Update coach (Admin or Coach themselves)
export const updateCoach = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            specializations,
            bio,
            certifications,
            photoUrl,
            hourlyRate,
            isActive,
            availableSlots,
        } = req.body;

        const coach = await prisma.coach.findUnique({
            where: { id: parseInt(id) },
        });

        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        // Check authorization (admin or the coach themselves)
        if (req.user.role !== 'admin' && coach.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updateData = {};
        if (specializations !== undefined)
            updateData.specializations = JSON.stringify(specializations);
        if (bio !== undefined) updateData.bio = bio;
        if (certifications !== undefined)
            updateData.certifications = JSON.stringify(certifications);
        if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
        if (hourlyRate !== undefined) updateData.hourlyRate = parseFloat(hourlyRate);
        if (isActive !== undefined && req.user.role === 'admin')
            updateData.isActive = isActive;
        if (availableSlots !== undefined)
            updateData.availableSlots = JSON.stringify(availableSlots);

        const updatedCoach = await prisma.coach.update({
            where: { id: parseInt(id) },
            data: updateData,
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
        });

        const parsedCoach = {
            ...updatedCoach,
            specializations: JSON.parse(updatedCoach.specializations),
            certifications: JSON.parse(updatedCoach.certifications),
            availableSlots: JSON.parse(updatedCoach.availableSlots),
        };

        res.json(parsedCoach);
    } catch (error) {
        console.error('Error updating coach:', error);
        res.status(500).json({ error: 'Failed to update coach' });
    }
};

// Delete/Deactivate coach (Admin only)
export const deleteCoach = async (req, res) => {
    try {
        const { id } = req.params;

        const coach = await prisma.coach.findUnique({
            where: { id: parseInt(id) },
        });

        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        // Soft delete - just deactivate
        await prisma.coach.update({
            where: { id: parseInt(id) },
            data: { isActive: false },
        });

        res.json({ message: 'Coach deactivated successfully' });
    } catch (error) {
        console.error('Error deleting coach:', error);
        res.status(500).json({ error: 'Failed to delete coach' });
    }
};

// Get coach's available slots for a specific date
export const getCoachAvailableSlots = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query; // Format: YYYY-MM-DD

        const coach = await prisma.coach.findUnique({
            where: { id: parseInt(id) },
        });

        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        if (!coach.isActive) {
            return res.status(400).json({ error: 'Coach is not active' });
        }

        const availableSlots = JSON.parse(coach.availableSlots || '{}');
        const requestedDate = new Date(date);
        const dayOfWeek = requestedDate
            .toLocaleDateString('en-US', { weekday: 'long' })
            .toLowerCase();

        // Get coach's general availability for this day
        const daySlots = availableSlots[dayOfWeek] || [];

        // Get booked sessions for this date
        const bookedSessions = await prisma.trainingSession.findMany({
            where: {
                coachId: parseInt(id),
                sessionDate: {
                    gte: new Date(date + 'T00:00:00'),
                    lt: new Date(date + 'T23:59:59'),
                },
                status: {
                    in: ['scheduled', 'completed'],
                },
            },
            select: {
                startTime: true,
                endTime: true,
            },
        });

        // Filter out booked slots
        const availableTimeSlots = daySlots.filter((slot) => {
            const [slotStart, slotEnd] = slot.split('-');
            return !bookedSessions.some((session) => {
                // Check if there's any overlap
                return (
                    (session.startTime >= slotStart && session.startTime < slotEnd) ||
                    (session.endTime > slotStart && session.endTime <= slotEnd) ||
                    (session.startTime <= slotStart && session.endTime >= slotEnd)
                );
            });
        });

        res.json({
            date,
            dayOfWeek,
            availableSlots: availableTimeSlots,
            bookedSlots: bookedSessions.map((s) => `${s.startTime}-${s.endTime}`),
        });
    } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({ error: 'Failed to fetch available slots' });
    }
};

// Update coach availability (Coach or Admin)
export const updateCoachAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { availableSlots } = req.body;

        const coach = await prisma.coach.findUnique({
            where: { id: parseInt(id) },
        });

        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        // Check authorization
        if (req.user.role !== 'admin' && coach.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updatedCoach = await prisma.coach.update({
            where: { id: parseInt(id) },
            data: {
                availableSlots: JSON.stringify(availableSlots),
            },
        });

        res.json({
            ...updatedCoach,
            availableSlots: JSON.parse(updatedCoach.availableSlots),
        });
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
};
