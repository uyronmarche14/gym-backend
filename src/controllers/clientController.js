import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { triggerWebhookEvent } from '../services/webhookService.js';

const prisma = new PrismaClient();

// Generate username from email
const generateUsername = (email) => {
    const baseUsername = email.split('@')[0];
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    return `${baseUsername}_${randomSuffix}`;
};

/**
 * Get all clients (Users who are not admins)
 */
export const getClients = async (req, res) => {
    try {
        const { search, status } = req.query;

        // Build where clause - Get all users who are NOT admins
        const where = {
            role: 'user' // Only fetch regular users (clients)
        };

        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } }
            ];
        }

        if (status && status !== 'all') {
            where.status = status;
        }

        const clients = await prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                membershipType: true,
                status: true,
                expiryDate: true,
                address: true,
                emergencyContact: true,
                username: true,
                isVerified: true,
                createdAt: true
            }
        });

        res.json({
            success: true,
            clients
        });
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch clients',
            error: error.message
        });
    }
};

/**
 * Get a single client by ID
 */
export const getClientById = async (req, res) => {
    try {
        const { id } = req.params;

        const client = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                membershipType: true,
                status: true,
                expiryDate: true,
                address: true,
                emergencyContact: true,
                username: true,
                notes: true
            }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.json({
            success: true,
            client
        });
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch client',
            error: error.message
        });
    }
};

/**
 * Create a new client (User with membership)
 */
export const createClient = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            membershipType,
            status,
            expiryDate,
            address,
            emergencyContact,
            // notes removed - it's a relation, not a string field
            age,
            isStudent,
            studentIdUrl,
            photoUrl
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !membershipType || !expiryDate) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }

        // Generate credentials
        const username = generateUsername(email);
        const password = crypto.randomBytes(8).toString('hex'); // Random password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create User with Membership details
        const client = await prisma.user.create({
            data: {
                // User fields
                email,
                username,
                password: hashedPassword,
                firstName,
                lastName,
                role: 'user', // Always user
                isVerified: false,

                // Membership fields
                phone,
                membershipType,
                status: status || 'pending',
                expiryDate: new Date(expiryDate),
                address,
                emergencyContact,
                // notes is a relation, not a string field - removed
                age: age ? parseInt(age) : null,
                isStudent: isStudent || false,
                studentIdUrl,
                photoUrl
            }
        });

        // Trigger webhook to send email with credentials (non-blocking)
        try {
            await triggerWebhookEvent('user.created', {
                user: {
                    id: client.id,
                    email: client.email,
                    firstName: client.firstName,
                    lastName: client.lastName
                },
                credentials: {
                    username,
                    password // Send plain password
                },
                loginUrl: `${process.env.FRONTEND_URL}/login`
            });
        } catch (webhookError) {
            console.error('Webhook failed (non-critical):', webhookError);
            // Don't fail the request if webhook fails
        }

        res.status(201).json({
            success: true,
            message: 'Client created successfully! Login credentials sent via email.',
            client
        });
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create client',
            error: error.message
        });
    }
};

/**
 * Update a client
 */
export const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            firstName,
            lastName,
            email,
            phone,
            membershipType,
            status,
            expiryDate,
            address,
            emergencyContact,
            // notes removed - it's a relation, not a string field
            age,
            isStudent,
            studentIdUrl,
            photoUrl
        } = req.body;

        // Check if client exists
        const existingClient = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingClient) {
            return res.status(400).json({
                success: false,
                message: 'Client not found'
            });
        }

        // Update client
        const updatedClient = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                firstName,
                lastName,
                email,
                phone,
                membershipType,
                status,
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                address,
                emergencyContact,
                // notes is a relation, not a string field - removed
                age: age ? parseInt(age) : undefined,
                isStudent: isStudent !== undefined ? isStudent : undefined,
                studentIdUrl,
                photoUrl
            }
        });

        res.json({
            success: true,
            message: 'Client updated successfully',
            client: updatedClient
        });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update client',
            error: error.message
        });
    }
};

/**
 * Delete a client
 */
export const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;

        // Delete user
        await prisma.user.delete({
            where: { id: parseInt(id) }
        });

        res.json({
            success: true,
            message: 'Client deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete client',
            error: error.message
        });
    }
};

/**
 * Get client statistics
 */
export const getClientStats = async (req, res) => {
    try {
        const total = await prisma.user.count({ where: { role: 'user' } });
        const active = await prisma.user.count({ where: { role: 'user', status: 'active' } });
        const pending = await prisma.user.count({ where: { role: 'user', status: 'pending' } });
        const expired = await prisma.user.count({ where: { role: 'user', status: 'expired' } });

        res.json({
            success: true,
            stats: {
                total,
                active,
                pending,
                expired
            }
        });
    } catch (error) {
        console.error('Error fetching client stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch client statistics',
            error: error.message
        });
    }
};
