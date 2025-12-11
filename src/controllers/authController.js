import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { triggerWebhookEvent } from "../services/webhookService.js";
import crypto from "crypto";

const prisma = new PrismaClient();

// Generate username from email
const generateUsername = (email) => {
  const baseUsername = email.split('@')[0];
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `${baseUsername}_${randomSuffix}`;
};

export const register = async (req, res) => {
  const { email, password, firstName, lastName, username } = req.body;

  try {
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if user already exists by email
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Generate username if not provided
    const finalUsername = username || generateUsername(email);

    // Check if username is already taken
    const existingByUsername = await prisma.user.findUnique({ where: { username: finalUsername } });
    if (existingByUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username: finalUsername,
        password: hashed,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'user', // Public registration is always 'user'
        isVerified: false
      }
    });

    // Trigger webhook for user creation with credentials
    await triggerWebhookEvent('user.created', {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      credentials: {
        username: finalUsername,
        password // Send original password via email
      },
      loginUrl: `${process.env.FRONTEND_URL}/login`
    });

    res.json({
      message: "Registration successful! Check your email for login credentials.",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Admin only: Create user
export const createUser = async (req, res) => {
  const { email, password: providedPassword, firstName, lastName, username, role } = req.body;

  try {
    // Check if requester is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Validate required fields
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user already exists by email
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Generate username if not provided
    const finalUsername = username || generateUsername(email);

    // Check if username is already taken
    const existingByUsername = await prisma.user.findUnique({ where: { username: finalUsername } });
    if (existingByUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Generate random password if not provided
    const password = providedPassword || crypto.randomBytes(8).toString('hex');

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username: finalUsername,
        password: hashed,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'user', // Enforce 'user' role for all created accounts
        isVerified: false
      }
    });

    // Trigger webhook for user creation with credentials
    await triggerWebhookEvent('user.created', {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      credentials: {
        username: finalUsername,
        password // Send original password via email
      },
      loginUrl: `${process.env.FRONTEND_URL}/login`
    });

    res.json({
      message: "User created successfully! Credentials sent to email.",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: "Email/username and password are required" });
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      },
      include: {
        coachProfile: true // Include coach profile to determine if user is a coach
      }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user has a password set
    if (!user.password) {
      // This might be an OAuth user who hasn't completed password setup
      if (user.googleId && user.requiresPasswordChange) {
        return res.status(400).json({
          message: "Please complete your password setup first. Check your email for instructions.",
          requiresPasswordChange: true
        });
      } else {
        return res.status(401).json({ message: "Invalid credentials" });
      }
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user still requires password change (shouldn't happen after successful password change)
    if (user.requiresPasswordChange) {
      return res.status(400).json({
        message: "Please complete your password setup first. Check your email for instructions.",
        requiresPasswordChange: true
      });
    }

    // Determine user role: admin > coach > user
    const userRole = user.role === 'admin' ? 'admin' :
      (user.coachProfile && user.coachProfile.isActive) ? 'coach' : 'user';

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: userRole, // Use determined role
        isOAuth: !!user.googleId
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Automatic Check-in
    try {
      await prisma.checkIn.create({
        data: { userId: user.id }
      });

      // Welcome Notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome Back!',
          message: `Successfully checked in at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          type: 'success'
        }
      });
    } catch (checkInError) {
      console.error('Auto check-in failed:', checkInError);
      // Don't fail login if check-in fails
    }

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRole, // Use determined role
        isVerified: user.isVerified,
        isOAuth: !!user.googleId
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const verifyToken = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user details with coach profile
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        coachProfile: true // Include coach profile to determine if user is a coach
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Determine user role: admin > coach > user
    const userRole = user.role === 'admin' ? 'admin' :
      (user.coachProfile && user.coachProfile.isActive) ? 'coach' : 'user';

    res.json({
      message: "Token valid",
      userId: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: userRole, // Use determined role
      user: {
        ...user,
        isOAuth: !!user.googleId
      }
    });
  } catch (err) {
    console.error('Token verification error:', err);
    
    // Handle specific JWT errors
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: "Token expired. Please login again.",
        code: "TOKEN_EXPIRED",
        expiredAt: err.expiredAt
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        message: "Invalid token",
        code: "INVALID_TOKEN"
      });
    }
    
    res.status(403).json({ message: "Invalid token" });
  }
};

export const changePassword = async (req, res) => {
  const { newPassword, tempPassword } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  try {
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if this is a password change token
    if (!decoded.isPasswordChangeToken) {
      return res.status(403).json({ message: "Invalid token for password change" });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        tempPassword: true,
        tempPasswordExpiry: true,
        requiresPasswordChange: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user requires password change
    if (!user.requiresPasswordChange) {
      return res.status(400).json({ message: "Password change not required" });
    }

    // Verify temporary password if provided
    if (tempPassword) {
      if (!user.tempPassword) {
        return res.status(400).json({ message: "No temporary password set" });
      }

      // Check if temporary password has expired
      if (user.tempPasswordExpiry && new Date() > user.tempPasswordExpiry) {
        return res.status(400).json({ message: "Temporary password has expired" });
      }

      // Verify temporary password
      const tempPasswordValid = await bcrypt.compare(tempPassword, user.tempPassword);
      if (!tempPasswordValid) {
        return res.status(400).json({ message: "Invalid temporary password" });
      }
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update user with new password and clear temporary password fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        tempPassword: null,
        tempPasswordExpiry: null,
        requiresPasswordChange: false
      }
    });

    // Generate new JWT token for login
    const loginToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        isOAuth: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: "Password changed successfully",
      token: loginToken,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Password change error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: "Invalid token" });
    }
    res.status(500).json({ error: err.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.user; // From auth middleware
    const { firstName, lastName, username } = req.body;

    // Check if username is being changed and if it's available
    if (username) {
      const existingUser = await prisma.user.findUnique({
        where: { username }
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(username && { username })
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update user password
export const updatePassword = async (req, res) => {
  try {
    const { userId } = req.user; // From auth middleware
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ error: err.message });
  }
};

