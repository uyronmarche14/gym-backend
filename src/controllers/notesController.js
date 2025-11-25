import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get all notes for a user
export const getNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: "Error fetching notes" });
  }
};

// Get a single note by ID
export const getNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const note = await prisma.note.findFirst({
      where: { 
        id: parseInt(id),
        userId 
      }
    });
    
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    
    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ message: "Error fetching note" });
  }
};

// Create a new note
export const createNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;
    
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }
    
    const note = await prisma.note.create({
      data: {
        title,
        content,
        userId
      }
    });
    
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: "Error creating note" });
  }
};

// Update a note
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;
    
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }
    
    // Check if note exists and belongs to user
    const existingNote = await prisma.note.findFirst({
      where: { 
        id: parseInt(id),
        userId 
      }
    });
    
    if (!existingNote) {
      return res.status(404).json({ message: "Note not found" });
    }
    
    const note = await prisma.note.update({
      where: { id: parseInt(id) },
      data: {
        title,
        content
      }
    });
    
    res.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ message: "Error updating note" });
  }
};

// Delete a note
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if note exists and belongs to user
    const existingNote = await prisma.note.findFirst({
      where: { 
        id: parseInt(id),
        userId 
      }
    });
    
    if (!existingNote) {
      return res.status(404).json({ message: "Note not found" });
    }
    
    await prisma.note.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: "Error deleting note" });
  }
};