import { PrismaClient } from '@prisma/client';
import { SessionService } from '../services/sessionService.js';

const prisma = new PrismaClient();

// Book a training session
export const bookSession = async (req, res) => {
    try {
        // Validate required fields
        const { coachId, sessionDate, startTime, endTime } = req.body;
        if (!coachId || !sessionDate || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const session = await SessionService.bookSession(req.body, req.user.id);
        
        res.status(201).json({
            message: 'Session booked successfully',
            session,
        });
    } catch (error) {
        console.error('Error booking session:', error);
        
        // Handle specific error types
        const statusCode = error.message.includes('not found') ? 404 :
                          error.message.includes('Unauthorized') ? 403 :
                          error.message.includes('already booked') ? 409 : 400;
        
        res.status(statusCode).json({ error: error.message });
    }
};

// Get user's sessions
export const getUserSessions = async (req, res) => {
    try {
        const sessions = await SessionService.getSessions({
            userId: req.user.id,
            ...req.query,
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
        // Find coach profile for current user
        const coach = await prisma.coach.findUnique({
            where: { userId: req.user.id },
        });

        if (!coach) {
            // Return empty array instead of error - user might not be a coach yet
            return res.json([]);
        }

        const sessions = await SessionService.getSessions({
            coachId: coach.id,
            ...req.query,
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
        const sessions = await SessionService.getSessions(req.query);
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

        const session = await SessionService.cancelSession(
            id,
            req.user.id,
            req.user.role,
            reason
        );

        res.json({
            message: 'Session cancelled successfully',
            session,
        });
    } catch (error) {
        console.error('Error cancelling session:', error);
        const statusCode = error.message === 'Unauthorized' ? 403 :
                          error.message === 'Session not found' ? 404 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

// Reschedule session
export const rescheduleSession = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await SessionService.rescheduleSession(
            id,
            req.user.id,
            req.user.role,
            req.body
        );

        res.json({
            message: 'Session rescheduled successfully',
            session,
        });
    } catch (error) {
        console.error('Error rescheduling session:', error);
        
        const statusCode = error.message === 'Unauthorized' ? 403 :
                          error.message === 'Session not found' ? 404 :
                          error.message === 'Time slot is already booked' ? 409 : 400;
        
        res.status(statusCode).json({ error: error.message });
    }
};

// Complete session (Coach or Admin)
export const completeSession = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await SessionService.completeSession(
            id,
            req.user.id,
            req.user.role,
            req.body
        );

        res.json({
            message: 'Session marked as completed',
            session,
        });
    } catch (error) {
        console.error('Error completing session:', error);
        
        const statusCode = error.message === 'Unauthorized' ? 403 :
                          error.message === 'Session not found' ? 404 : 400;
        
        res.status(statusCode).json({ error: error.message });
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
        const stats = await SessionService.getSessionStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching session stats:', error);
        res.status(500).json({ error: 'Failed to fetch session statistics' });
    }
};

// Get available slots for a coach on a specific date
export const getAvailableSlots = async (req, res) => {
    try {
        const { coachId, date } = req.query;
        
        if (!coachId || !date) {
            return res.status(400).json({ error: 'Coach ID and date are required' });
        }

        const slots = await SessionService.getAvailableSlots(coachId, date);
        res.json(slots);
    } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({ error: 'Failed to fetch available slots' });
    }
};
