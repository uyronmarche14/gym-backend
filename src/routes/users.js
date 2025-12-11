import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
    getAllUsers,
    getUsersByRole,
    searchUsers,
    getUserById
} from '../controllers/usersController.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, getAllUsers);

// Get users by role (for dropdowns)
router.get('/role/:role', authenticateToken, requireAdmin, getUsersByRole);

// Search users (dynamic search)
router.get('/search', authenticateToken, requireAdmin, searchUsers);

// Get user by ID
router.get('/:userId', authenticateToken, getUserById);

export default router;
