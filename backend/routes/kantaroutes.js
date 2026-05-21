import express from "express";
import Kanta from "../models/kanta.js";

const router = express.Router();

// 🔹 CREATE ENTRY
router.post("/", async (req, res) => {
  try {
    const kanta = new Kanta(req.body);
    const saved = await kanta.save();
    
    // 🔥 We only save the Kanta entry and send it back. 
    // The frontend uses this ID to create Takpatti, KathaBook, etc!
    res.status(201).json(saved); 
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    // 🔥 We only delete Kanta here because your frontend handleDelete 
    // already fetches and deletes everything else perfectly!
    await Kanta.findByIdAndDelete(req.params.id);
    res.json({ message: "Kanta record deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 UPDATE ENTRY
router.put("/:id", async (req, res) => {
  try {
    // 🔥 Pure update. Frontend handles updating the other collections!
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