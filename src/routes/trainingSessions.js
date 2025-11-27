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
} from '../controllers/trainingSessionController.js';
import { authenticateToken, requireAdmin, requireCoach } from '../middleware/auth.js';

const router = express.Router();

// User routes
router.post('/book', authenticateToken, bookSession);
router.get('/my-sessions', authenticateToken, getUserSessions);
router.get('/:id', authenticateToken, getSessionById);
router.put('/:id/cancel', authenticateToken, cancelSession);
router.put('/:id/reschedule', authenticateToken, rescheduleSession);

// Coach routes
router.get('/coach', authenticateToken, requireCoach, getCoachSessions);
router.put('/:id/complete', authenticateToken, requireCoach, completeSession);
router.put('/:id/notes', authenticateToken, requireCoach, addSessionNotes);

// Admin routes
router.get('/', authenticateToken, requireAdmin, getAllSessions);
router.get('/stats/overview', authenticateToken, requireAdmin, getSessionStats);

export default router;
