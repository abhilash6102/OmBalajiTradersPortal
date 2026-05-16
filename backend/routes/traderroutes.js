import express from "express";
import Trader from "../models/traders.js";

const router = express.Router();

// 🔹 CREATE TRADER
router.post("/", async (req, res) => {
  try {
    const trader = new Trader(req.body);
    const saved = await trader.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("🔥 Trader Save Error:", error);

    // Duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Ref No already exists. Please use a different number.",
      });
    }

    res.status(500).json({ message: error.message });
  }
});

// 🔹 GET ALL TRADERS
router.get("/", async (req, res) => {
  try {
    const data = await Trader.find().sort({ ref_no: 1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔹 UPDATE TRADER
router.put("/:id", async (req, res) => {
  try {
    const updated = await Trader.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    res.json(updated);
  } catch (error) {
    console.error("🔥 Update Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Ref No already exists.",
      });
    }

    res.status(500).json({ message: error.message });
  }
});

// 🔹 DELETE TRADER
router.delete("/:id", async (req, res) => {
  try {
    await Trader.findByIdAndDelete(req.params.id);
    res.json({ message: "Trader deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;