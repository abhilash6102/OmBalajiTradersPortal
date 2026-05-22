import express from "express";
import BazaarPayment from "../models/bazaarpayments.js";
import KathaBook from "../models/kathabook.js";

const router = express.Router();

/* =========================
   CREATE PAYMENT
========================= */
router.post("/", async (req, res) => {
  try {
    const {
      book_no,
      sl_no,
      trader_name,
      crop_type,
      crop_date,
      expected_payment_date,
      amount,
      kanta_entry_id,
    } = req.body;

    if (!book_no || !sl_no) {
      return res.status(400).json({ message: "book_no and sl_no are required" });
    }

    if (!trader_name || !amount || !crop_date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const payment = await BazaarPayment.create({
      book_no,
      sl_no,
      trader_name,
      crop_type,
      crop_date,
      expected_payment_date,
      amount,
      kanta_entry_id,
      is_credited: false,
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   GET ALL
========================= */
router.get("/", async (req, res) => {
  try {
    const data = await BazaarPayment.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   GENERIC UPDATE & SYNC
========================= */
router.put("/:id", async (req, res) => {
  try {
    const payment = await BazaarPayment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // 🔥 FIX: Include trader_name in the find filter so A and B get separate rows
    const filter = { 
      kanta_entry_id: payment.kanta_entry_id, 
      record_type: "credit",
      trader_name: payment.trader_name // <--- THIS IS THE MISSING LINK
    };

    if (payment.is_credited === true) {
      await KathaBook.findOneAndUpdate(
        filter, // Uses the filter with trader_name
        {
          kanta_entry_id: payment.kanta_entry_id,
          record_type: "credit",
          trader_name: payment.trader_name,
          date: payment.credited_date,
          amount: payment.amount,
          book_no: payment.book_no,
          sl_no: payment.sl_no,
          is_auto_generated: true
        },
        { upsert: true, new: true }
      );
    } else {
      // Unmark: delete only the specific credit for this trader
      await KathaBook.deleteOne(filter);
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   DELETE PAYMENT
========================= */
router.delete("/:id", async (req, res) => {
  try {
    const payment = await BazaarPayment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

await KathaBook.deleteMany({
      kanta_entry_id: payment.kanta_entry_id,
      record_type: "credit",
    });

    await payment.deleteOne();

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;