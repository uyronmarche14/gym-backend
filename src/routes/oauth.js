import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Google OAuth login route
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

// Google OAuth callback route
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
    session: false 
  }),
  async (req, res) => {
    try {
      // Check if user requires password change (new OAuth flow)
      if (req.user.requiresPasswordChange) {
        // Generate a temporary token for password change process
        const tempToken = jwt.sign(
          { 
            userId: req.user.id,
            email: req.user.email,
            isOAuth: true,
            isPasswordChangeToken: true
          },
          process.env.JWT_SECRET,
          { expiresIn: '24h' } // Temporary token expires in 24 hours
        );

        // Redirect to password change page with temporary token
        const redirectUrl = `${process.env.FRONTEND_URL}/change-password?token=${tempToken}&oauth=true`;
        
        console.log('OAuth user requires password change, redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
      } else {
        // Normal OAuth flow for existing users who already have passwords
        const token = jwt.sign(
          { 
            userId: req.user.id,
            email: req.user.email,
            isOAuth: true 
          },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Redirect to frontend with token
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&success=true`;
        
        console.log('OAuth callback successful, redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
      }
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

// OAuth logout route
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get OAuth user info (protected route)
router.get('/user', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      isVerified: req.user.isVerified,
      isOAuth: !!req.user.googleId
    }
  });
});

export default router;