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
import Padam from "../models/padam.js";
import BazaarPayment from "../models/bazaarpayments.js";
import BazaarBill from "../models/bazaarbills.js";
import Takpatti from "../models/takpatti.js";
import Kanta from "../models/kantabook.js";

router.delete("/:id", async (req, res) => {
  try {
    const kantaId = req.params.id;

    // 1. Delete main record
    await Kanta.findByIdAndDelete(kantaId);

    // 2. Cascade delete ALL related modules
    await Padam.deleteMany({ kanta_entry_id: kantaId });
    await BazaarPayment.deleteMany({ kanta_entry_id: kantaId });
    await BazaarBill.deleteMany({ kanta_entry_id: kantaId });
    await Takpatti.deleteMany({ kanta_entry_id: kantaId });

    res.json({
      message: "Kanta + all related records deleted successfully"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
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