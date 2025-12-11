import express from 'express';
import {
    createPayment,
    getPayments,
    getUserPayments,
    updatePaymentStatus,
    getPaymentDetails,
    refundPayment
} from '../controllers/paymentController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// User routes
router.post('/', createPayment);
router.get('/my-payments', getUserPayments);

// Payment details (both user and admin)
router.get('/:id', getPaymentDetails);

// Admin routes
router.get('/', isAdmin, getPayments);
router.put('/:id/status', isAdmin, updatePaymentStatus);
router.post('/:id/refund', isAdmin, refundPayment);

export default router;
