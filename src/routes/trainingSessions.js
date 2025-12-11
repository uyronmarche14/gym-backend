import express from 'express';
import {
    bookSession,
    getUserSessions,
    getCoachSessions,
    getAllSessions,
    getSessionById,
    cancelSession,
    rescheduleSession,
    completeSession,
    addSessionNotes,
    getSessionStats,
    getAvailableSlots,
} from '../controllers/trainingSessionController.js';
import { authenticateToken, requireAdmin, requireCoach } from '../middleware/auth.js';

const router = express.Router();

// POST routes first
router.post('/book', authenticateToken, bookSession);

// Named GET routes (specific paths before generic ones)
router.get('/my-sessions', authenticateToken, getUserSessions);
router.get('/coach', authenticateToken, requireCoach, getCoachSessions);

router.get('/stats/overview', authenticateToken, requireAdmin, getSessionStats);
router.get('/available-slots', getAvailableSlots); // Public or protected depending on needs, usually protected but can be public for browsing

// Admin routes
router.get('/', authenticateToken, requireAdmin, getAllSessions);

// PUT routes
router.put('/:id/cancel', authenticateToken, cancelSession);
router.put('/:id/reschedule', authenticateToken, rescheduleSession);
router.put('/:id/complete', authenticateToken, requireCoach, completeSession);
router.put('/:id/notes', authenticateToken, requireCoach, addSessionNotes);

// Generic GET route (must be last)
router.get('/:id', authenticateToken, getSessionById);

export default router;
