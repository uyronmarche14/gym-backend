import express from "express";
import { getNotes, getNote, createNote, updateNote, deleteNote } from "../controllers/notesController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/notes - Get all notes for authenticated user
router.get("/", getNotes);

// GET /api/notes/:id - Get a specific note
router.get("/:id", getNote);

// POST /api/notes - Create a new note
router.post("/", createNote);

// PUT /api/notes/:id - Update a note
router.put("/:id", updateNote);

// DELETE /api/notes/:id - Delete a note
router.delete("/:id", deleteNote);

export default router;