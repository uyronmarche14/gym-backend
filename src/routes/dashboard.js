import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAdminStats, getUserStats, checkInUser, getRevenueStats } from '../controllers/dashboardController.js';

const router = express.Router();

// Admin routes
router.get('/admin/stats', authenticateToken, getAdminStats);
router.get('/admin/revenue', authenticateToken, getRevenueStats);

// User routes
router.get('/user/stats', authenticateToken, getUserStats);

// Shared/Action routes
router.post('/check-in', authenticateToken, checkInUser);

export default router;
