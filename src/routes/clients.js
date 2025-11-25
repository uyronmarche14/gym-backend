import express from 'express';
import {
    getClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    getClientStats
} from '../controllers/clientController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/clients
 * @desc    Get all clients with optional filtering
 * @query   search - Search term for name/email
 * @query   status - Filter by status (active, pending, expired, all)
 * @access  Private
 */
router.get('/', getClients);

/**
 * @route   GET /api/clients/stats
 * @desc    Get client statistics
 * @access  Private
 */
router.get('/stats', getClientStats);

/**
 * @route   GET /api/clients/:id
 * @desc    Get a single client by ID
 * @access  Private
 */
router.get('/:id', getClientById);

/**
 * @route   POST /api/clients
 * @desc    Create a new client
 * @body    firstName, lastName, email, phone, membershipType, expiryDate, etc.
 * @access  Private
 */
router.post('/', createClient);

/**
 * @route   PUT /api/clients/:id
 * @desc    Update a client
 * @access  Private
 */
router.put('/:id', updateClient);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Delete a client
 * @access  Private
 */
router.delete('/:id', deleteClient);

export default router;
