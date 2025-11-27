import express from 'express';
import {
    getAllCoaches,
    getActiveCoaches,
    getCoachById,
    createCoach,
    updateCoach,
    deleteCoach,
    getCoachAvailableSlots,
    updateCoachAvailability,
} from '../controllers/coachController.js';
import { authenticateToken, requireAdmin, requireCoachOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveCoaches);
router.get('/:id/available-slots', getCoachAvailableSlots);

// Protected routes (require authentication)
router.get('/', authenticateToken, getAllCoaches);
router.get('/:id', authenticateToken, getCoachById);

// Admin only routes
router.post('/', authenticateToken, requireAdmin, createCoach);
router.delete('/:id', authenticateToken, requireAdmin, deleteCoach);

// Coach or Admin routes
router.put('/:id', authenticateToken, updateCoach);
router.put('/:id/availability', authenticateToken, updateCoachAvailability);

export default router;
