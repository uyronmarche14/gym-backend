import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import oauthRoutes from "./routes/oauth.js";
import webhookRoutes from "./routes/webhooks.js";
import notesRoutes from "./routes/notes.js";
import clientRoutes from "./routes/clients.js";
import paymentRoutes from "./routes/payments.js";
import dashboardRoutes from "./routes/dashboard.js";
import notificationRoutes from "./routes/notifications.js";
import membershipRoutes from "./routes/membership.js";
import reportRoutes from "./routes/reports.js";
import coachRoutes from "./routes/coaches.js";
import coachingPackageRoutes from "./routes/coachingPackages.js";
import trainingSessionRoutes from "./routes/trainingSessions.js";
import packagePurchaseRoutes from "./routes/packagePurchases.js";
import { testEmailConfiguration } from "./services/emailService.js";
import { checkExpiringMemberships } from "./services/membershipService.js";
import cron from 'node-cron';

const app = express();

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    credentials: true
}));

app.use(express.json());

// Session configuration for OAuth
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);
app.use("/auth", oauthRoutes);
app.use("/webhook", webhookRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/coaches", coachRoutes);
app.use("/api/coaching-packages", coachingPackageRoutes);
app.use("/api/training-sessions", trainingSessionRoutes);
app.use("/api/package-purchases", packagePurchaseRoutes);

// Run expiry check on startup
checkExpiringMemberships();

// Schedule expiry check daily at 9:00 AM
cron.schedule('0 9 * * *', () => {
    console.log('Running daily membership expiry check...');
    checkExpiringMemberships();
});

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        message: "Backend running successfully 🚀",
        features: [
            "JWT Authentication",
            "Google OAuth",
            "Email Service",
            "Real-time Webhooks",
            "Coaching & Training Services",
            "Membership Management",
            "Payment Processing"
        ]
    });
});

// Email configuration test endpoint
app.get("/test/email", async (req, res) => {
    try {
        const isValid = await testEmailConfiguration();
        res.json({
            emailConfigValid: isValid,
            message: isValid ? "Email configuration is working" : "Email configuration has issues"
        });
    } catch (error) {
        res.status(500).json({
            error: "Email test failed",
            message: error.message
        });
    }
});

export default app;
