import express from "express";
import Kanta from "../models/kanta.js";

const router = express.Router();


// 🔹 CREATE ENTRY
router.post("/", async (req, res) => {
  try {
    const kanta = new Kanta(req.body);
    const saved = await kanta.save();

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 🔹 GET ALL ENTRIES
router.get("/", async (req, res) => {
  try {
    const data = await Kanta.find().sort({ date: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 🔹 DELETE ENTRY
router.delete("/:id", async (req, res) => {
  try {
    await Kanta.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 🔹 UPDATE ENTRY
router.put("/:id", async (req, res) => {
  try {
    const updated = await Kanta.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;