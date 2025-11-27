import express from 'express';
import {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
    purchasePackage,
    getPackageStats,
} from '../controllers/coachingPackageController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public/User routes
router.get('/', getAllPackages);
router.get('/:id', getPackageById);

// User routes (require authentication)
router.post('/:id/purchase', authenticateToken, purchasePackage);

// Admin only routes
router.post('/', authenticateToken, requireAdmin, createPackage);
router.put('/:id', authenticateToken, requireAdmin, updatePackage);
router.delete('/:id', authenticateToken, requireAdmin, deletePackage);
router.get('/stats/overview', authenticateToken, requireAdmin, getPackageStats);

export default router;
