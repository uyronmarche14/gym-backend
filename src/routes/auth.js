import express from "express";
import { register, login, verifyToken, changePassword, updateProfile, updatePassword, createUser } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify", verifyToken);
router.post("/change-password", changePassword);

// Protected routes - require authentication
router.post("/create-user", authenticateToken, createUser); // Admin only
router.put("/update-profile", authenticateToken, updateProfile);
router.put("/update-password", authenticateToken, updatePassword);

export default router;
