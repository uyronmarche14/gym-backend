import express from 'express';
import {
  requestPasswordReset,
  verifyResetToken,
  resetPasswordWithToken,
  changePassword
} from '../controllers/passwordResetController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Request password reset (public - no auth required)
router.post('/request', requestPasswordReset);

// Verify reset token (public - no auth required)
router.post('/verify-token', verifyResetToken);

// Reset password with token (public - no auth required)
router.post('/reset', resetPasswordWithToken);

// Change password (authenticated users only)
router.post('/change', authenticateToken, changePassword);

export default router;
