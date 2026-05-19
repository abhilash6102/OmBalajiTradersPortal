import express from "express";
import Kanta from "../models/kanta.js";
import Padam from "../models/padam.js";
import BazaarPayment from "../models/bazaarpayments.js";
import BazaarBill from "../models/bazaarbills.js";
import Takpatti from "../models/takpatti.js";
import KathaBook from "../models/kathabook.js";

const router = express.Router();


// 🔹 CREATE ENTRY
router.post("/", async (req, res) => {
  try {
    const kanta = new Kanta(req.body);
    const saved = await kanta.save();

    const {
      trader_name,
      crop_type,
      total_amount,
      date,
      commission
    } = req.body;

    // 🔹 STEP 1: CREATE BAZAAR BILL
    const bazaarBill = await BazaarBill.create({
      kanta_entry_id: saved._id,
      trader_name,
      crop_type,
      amount: total_amount,
      date
    });

    // 🔹 STEP 2: CREATE BAZAAR PAYMENT
    const bazaarPayment = await BazaarPayment.create({
      kanta_entry_id: saved._id,
      trader_name,
      amount: total_amount,
      date,
      bill_no: bazaarBill._id,
      status: "pending"
    });

    // 🔹 STEP 3: AUTO DEBIT ENTRY (KATHABOOK)
    await KathaBook.create({
      kanta_entry_id: saved._id,
      record_type: "debit",
      trader_name,
      amount: total_amount,
      date,
      bill_no: bazaarBill._id,
      is_auto_generated: true
    });

    // 🔹 STEP 4: COMMISSION ENTRY
    if (commission && Number(commission) > 0) {
      await KathaBook.create({
        kanta_entry_id: saved._id,
        record_type: "commission",
        amount: commission,
        date,
        is_auto_generated: true
      });
    }

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
    const kantaId = req.params.id;

    // 1. Delete main record
    await Kanta.findByIdAndDelete(kantaId);

    // 2. Cascade delete ALL related modules
    await Padam.deleteMany({ kanta_entry_id: kantaId });
    await BazaarPayment.deleteMany({ kanta_entry_id: kantaId });
    await BazaarBill.deleteMany({ kanta_entry_id: kantaId });
    await Takpatti.deleteMany({ kanta_entry_id: kantaId });
    await KathaBook.deleteMany({ kanta_entry_id: kantaId });
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