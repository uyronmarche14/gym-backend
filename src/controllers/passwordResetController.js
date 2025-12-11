import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendPasswordResetEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

/**
 * Request password reset (Forgot Password)
 * User provides email, receives reset link
 */
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      });
    }

    // Generate password reset token (1 hour expiry)
    const resetToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        isPasswordResetToken: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Generate reset token expiry
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetTokenExpiry
      }
    });

    // Send password reset email
    await sendPasswordResetEmail({
      email: user.email,
      firstName: user.firstName || 'User',
      lastName: user.lastName || '',
      resetToken,
      resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    });

    res.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent'
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: error.message
    });
  }
};

/**
 * Verify password reset token
 */
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Check if token is a password reset token
    if (!decoded.isPasswordResetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user and verify token matches
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.passwordResetToken !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Check if token has expired
    if (user.passwordResetExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      email: user.email
    });
  } catch (error) {
    console.error('Error verifying reset token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify reset token',
      error: error.message
    });
  }
};

/**
 * Reset password with token (Forgot Password Flow)
 */
export const resetPasswordWithToken = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Check if token is a password reset token
    if (!decoded.isPasswordResetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user and verify token matches
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.passwordResetToken !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Check if token has expired
    if (user.passwordResetExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        lastPasswordChangedAt: new Date(),
        requiresPasswordChange: false
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });

    // Generate login token
    const loginToken = jwt.sign(
      {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Password reset successfully',
      token: loginToken,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
};

/**
 * Change password (Authenticated user)
 * User provides old password and new password
 */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        lastPasswordChangedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};
