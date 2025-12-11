import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
    createCheckIn,
    quickCheckIn,
    getAllCheckIns,
    getUserCheckIns,
    getTodayCheckIns,
    getCheckInStats,
    deleteCheckIn
} from '../controllers/checkInController.js';

const router = express.Router();

// Middleware to check if user is admin or staff
const requireAdminOrStaff = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ message: 'Admin or staff access required' });
    }

    next();
};

// ===== AUTHENTICATED ROUTES (Admin/Staff) =====

// Admin/Staff: Create check-in for a user (manual check-in)
router.post('/', authenticateToken, requireAdminOrStaff, createCheckIn);

// Admin/Staff: Get all check-ins with filters
router.get('/all', authenticateToken, requireAdminOrStaff, getAllCheckIns);

// Admin/Staff: Get today's check-ins
router.get('/today', authenticateToken, requireAdminOrStaff, getTodayCheckIns);

// Admin/Staff: Get check-in statistics
router.get('/stats', authenticateToken, requireAdminOrStaff, getCheckInStats);

// Admin: Delete a check-in
router.delete('/:checkInId', authenticateToken, requireAdmin, deleteCheckIn);

// ===== PUBLIC ROUTES (No authentication required) =====

// Quick Check-in by Phone/Email/Username (for gym kiosk or self-service)
// This is the GYM CHECK-IN endpoint - no login required
router.post('/quick', quickCheckIn);

// ===== USER ROUTES =====

// User/Admin: Get check-ins for a specific user
router.get('/user/:userId', authenticateToken, getUserCheckIns);

export default router;
