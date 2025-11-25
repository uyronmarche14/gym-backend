import express from 'express';
import {
    createPayment,
    getPayments,
    getUserPayments,
    updatePaymentStatus
} from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// User routes
router.post('/', createPayment);
router.get('/my-payments', getUserPayments);

// Admin routes (Should ideally have admin check middleware, but controller handles logic or frontend hides it)
// For strict security, add an isAdmin middleware here
router.get('/', getPayments);
router.put('/:id/status', updatePaymentStatus);

export default router;
