import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { sendTempPasswordEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

// Generate random password for OAuth users
const generateRandomPassword = () => {
  return crypto.randomBytes(12).toString('hex');
};

// Generate username from email
const generateUsername = (email) => {
  const baseUsername = email.split('@')[0];
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `${baseUsername}_${randomSuffix}`;
};

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google OAuth callback received:', {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName
    });

    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email found in Google profile'), null);
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    // Generate temporary password
    const tempPassword = generateRandomPassword();
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);
    
    // Set expiry time (24 hours from now)
    const tempPasswordExpiry = new Date();
    tempPasswordExpiry.setHours(tempPasswordExpiry.getHours() + 24);

    if (user) {
      // Check if user has already completed password setup
      if (user.requiresPasswordChange === false && user.password && !user.tempPassword) {
        // User has already completed password setup, just update googleId if needed
        user = await prisma.user.update({
          where: { id: user.id },
          data: { 
            googleId: profile.id
          }
        });

        console.log('Existing user with completed password setup:', {
          id: user.id,
          email: user.email,
          requiresPasswordChange: false
        });
      } else {
        // User exists but hasn't completed password setup, update with temporary password
        user = await prisma.user.update({
          where: { id: user.id },
          data: { 
            googleId: profile.id,
            tempPassword: hashedTempPassword,
            tempPasswordExpiry,
            requiresPasswordChange: true
          }
        });

        console.log('Existing user updated with temporary password:', {
          id: user.id,
          email: user.email,
          requiresPasswordChange: true
        });
      }
    } else {
      // Create new user with temporary password
      const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User';
      const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
      
      // Create a placeholder password (user will be required to change it)
      const placeholderPassword = await bcrypt.hash('placeholder', 10);

      user = await prisma.user.create({
        data: {
          email,
          password: placeholderPassword,
          firstName,
          lastName,
          googleId: profile.id,
          isVerified: true,
          tempPassword: hashedTempPassword,
          tempPasswordExpiry,
          requiresPasswordChange: true
        }
      });

      console.log('New user created via Google OAuth with temporary password:', {
        id: user.id,
        email: user.email,
        requiresPasswordChange: true
      });
    }

    // Send temporary password email only if user requires password change
    if (user.requiresPasswordChange) {
      await sendTempPasswordEmail({
        email: user.email,
        firstName: user.firstName || 'User',
        lastName: user.lastName || '',
        tempPassword,
        changePasswordUrl: `${process.env.FRONTEND_URL}/change-password?email=${encodeURIComponent(user.email)}`
      });

      console.log('Temporary password email sent to:', user.email);
    }

    // Return user with appropriate flags
    return done(null, { 
      ...user, 
      requiresPasswordChange: user.requiresPasswordChange,
      isOAuthFlow: true 
    });
  } catch (error) {
    console.error('Error in Google OAuth strategy:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        googleId: true,
        isVerified: true,
        createdAt: true
      }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;