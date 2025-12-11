import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Create a new staff or semi-admin user (Admin only)
 */
export const createStaff = async (req, res) => {
  try {
    const { email, firstName, lastName, role, phone } = req.body;
    const adminId = req.user.id;

    // Validate role
    if (!['staff', 'semi_admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be staff or semi_admin'
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create staff user
    const staff = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role,
        phone,
        staffStatus: 'active',
        createdBy: adminId,
        isVerified: true,
        tempPassword: tempPassword,
        tempPasswordExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        requiresPasswordChange: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        staffStatus: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      staff,
      tempPassword // Return temp password so admin can share it
    });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create staff member',
      error: error.message
    });
  }
};

/**
 * Get all staff and semi-admin users (Admin only)
 */
export const getAllStaff = async (req, res) => {
  try {
    const { role, status } = req.query;

    const where = {
      role: {
        in: ['staff', 'semi_admin']
      }
    };

    if (role && ['staff', 'semi_admin'].includes(role)) {
      where.role = role;
    }

    if (status && ['active', 'inactive'].includes(status)) {
      where.staffStatus = status;
    }

    const staff = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        staffStatus: true,
        createdAt: true,
        updatedAt: true,
        lastPasswordChangedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      count: staff.length,
      staff
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff members',
      error: error.message
    });
  }
};

/**
 * Get single staff member details (Admin only)
 */
export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        staffStatus: true,
        createdAt: true,
        updatedAt: true,
        lastPasswordChangedAt: true
      }
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Check if user is actually staff/semi_admin
    if (!['staff', 'semi_admin'].includes(staff.role)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a staff member'
      });
    }

    res.json({
      success: true,
      staff
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff member',
      error: error.message
    });
  }
};

/**
 * Update staff member details (Admin only)
 */
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, role, staffStatus } = req.body;

    // Get existing staff member
    const existingStaff = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    if (!['staff', 'semi_admin'].includes(existingStaff.role)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a staff member'
      });
    }

    // Validate role if being changed
    if (role && !['staff', 'semi_admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be staff or semi_admin'
      });
    }

    // Validate status
    if (staffStatus && !['active', 'inactive'].includes(staffStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active or inactive'
      });
    }

    // Update staff member
    const updatedStaff = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(role && { role }),
        ...(staffStatus && { staffStatus })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        staffStatus: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Staff member updated successfully',
      staff: updatedStaff
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff member',
      error: error.message
    });
  }
};

/**
 * Delete staff member (Admin only)
 */
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // Prevent admin from deleting themselves
    if (parseInt(id) === adminId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Get existing staff member
    const existingStaff = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    if (!['staff', 'semi_admin'].includes(existingStaff.role)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a staff member'
      });
    }

    // Delete staff member
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff member',
      error: error.message
    });
  }
};

/**
 * Reset staff password (Admin only)
 */
export const resetStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing staff member
    const existingStaff = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    if (!['staff', 'semi_admin'].includes(existingStaff.role)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a staff member'
      });
    }

    // Generate new temporary password
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update staff member with new temp password
    const updatedStaff = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        password: hashedPassword,
        tempPassword: tempPassword,
        tempPasswordExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        requiresPasswordChange: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    res.json({
      success: true,
      message: 'Staff password reset successfully',
      staff: updatedStaff,
      tempPassword // Return temp password so admin can share it
    });
  } catch (error) {
    console.error('Error resetting staff password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset staff password',
      error: error.message
    });
  }
};
