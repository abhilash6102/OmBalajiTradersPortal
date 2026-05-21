import express from "express";
import KathaBook from "../models/kathabook.js";

const router = express.Router();

/* =========================
   CREATE ENTRY (SAFE)
========================= */
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    if (!data.record_type || !data.amount || !data.date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 🔥 COMMISSION HANDLING (IMPORTANT FIX)
    if (data.record_type === "commission") {
      delete data.trader_name;

      // ✅ CREATE MONTH FIELD FOR GROUPING
      const d = new Date(data.date);
      data.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    const exists = await KathaBook.findOne({
      kanta_entry_id: data.kanta_entry_id,
      record_type: data.record_type,
      date: data.date,
      amount: data.amount,
    });

    if (exists) {
      return res.status(200).json(exists);
    }

    const entry = new KathaBook({
      ...data
    });

    const saved = await entry.save();

    res.status(201).json(saved);

  } catch (error) {
    console.error("KathaBook Save Error:", error);
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   GET ALL
========================= */
router.get("/", async (req, res) => {
  try {
    const data = await KathaBook.find().sort({ date: -1, createdAt: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   UPDATE
========================= */
router.put("/:id", async (req, res) => {
  try {
    const updateData = { ...req.body };

    // ✅ If date is updated, re-calculate the month field
    if (updateData.date && updateData.record_type === "commission") {
      const d = new Date(updateData.date);
      updateData.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    const updated = await KathaBook.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   DELETE
========================= */
router.delete("/:id", async (req, res) => {
  try {
    await KathaBook.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;