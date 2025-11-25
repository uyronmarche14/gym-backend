import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import {
    getMembershipPlans,
    createMembershipPlan,
    updateMembershipPlan
} from '../controllers/membershipController.js';

const router = express.Router();

// Public/User routes (Authenticated users can see plans)
router.get('/', authenticateToken, getMembershipPlans);

// Admin routes
router.post('/', authenticateToken, isAdmin, createMembershipPlan);
router.put('/:id', authenticateToken, isAdmin, updateMembershipPlan);

export default router;
