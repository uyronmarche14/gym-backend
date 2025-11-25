import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { generateIncomeReport } from '../controllers/reportController.js';

const router = express.Router();

// Admin only routes
router.get('/income', authenticateToken, isAdmin, generateIncomeReport);

export default router;
