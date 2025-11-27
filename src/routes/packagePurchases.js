import express from 'express';
import {
    getUserPackages,
    getAllPurchases,
    getPurchaseById,
    getPurchaseStats,
    expirePackages,
} from '../controllers/packagePurchaseController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// User routes
router.get('/my-packages', authenticateToken, getUserPackages);
router.get('/:id', authenticateToken, getPurchaseById);

// Admin routes
router.get('/', authenticateToken, requireAdmin, getAllPurchases);
router.get('/stats/overview', authenticateToken, requireAdmin, getPurchaseStats);
router.post('/expire', authenticateToken, requireAdmin, expirePackages);

export default router;
