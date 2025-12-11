import express from 'express';
import {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  resetStaffPassword
} from '../controllers/staffController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All staff routes require authentication and admin role
router.use(authenticateToken);
router.use(isAdmin);

// Create new staff member
router.post('/', createStaff);

// Get all staff members
router.get('/', getAllStaff);

// Get single staff member
router.get('/:id', getStaffById);

// Update staff member
router.put('/:id', updateStaff);

// Delete staff member
router.delete('/:id', deleteStaff);

// Reset staff password (admin-controlled)
router.post('/:id/reset-password', resetStaffPassword);

export default router;
