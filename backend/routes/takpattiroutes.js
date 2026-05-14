import express from "express";
import TakPatti from "../models/takpatti.js";

const router = express.Router();

// 🔹 CREATE ENTRY
router.post("/", async (req, res) => {
  try {
    const takPatti = new TakPatti(req.body);
    const saved = await takPatti.save();

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔹 GET ALL ENTRIES
router.get("/", async (req, res) => {
  try {
    const data = await TakPatti.find().sort({ date: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔹 DELETE ENTRY
router.delete("/:id", async (req, res) => {
  try {
    await TakPatti.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔹 UPDATE ENTRY
router.put("/:id", async (req, res) => {
  try {
    const updated = await TakPatti.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;