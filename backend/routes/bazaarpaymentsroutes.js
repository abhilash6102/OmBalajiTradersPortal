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

    // 🔥 THE CRAZY BUG FIX: 
    // We use the Payment's own unique Database ID as the anchor so they never overwrite each other!
    const filter = { 
      kanta_entry_id: payment._id.toString(), // <--- PERFECT UNIQUE LINK
      record_type: "credit"
    };

    if (payment.is_credited === true) {
      await KathaBook.findOneAndUpdate(
        filter,
        {
          kanta_entry_id: payment._id.toString(), // Save the unique ID here
          record_type: "credit",
          trader_name: payment.trader_name,
          date: payment.credited_date,
          amount: payment.amount,
          book_no: payment.book_no, // Stays in sync with Bazaar Bills
          sl_no: payment.sl_no,     // Stays in sync with Bazaar Bills
          is_auto_generated: true
        },
        { upsert: true, new: true }
      );
    } else {
      // Unmark: wipe the credit record safely
      await KathaBook.deleteMany(filter);
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

    // 🔥 Clean up using the unique Payment ID
    await KathaBook.deleteMany({
      kanta_entry_id: payment._id.toString(),
      record_type: "credit",
    });

    await payment.deleteOne();

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;