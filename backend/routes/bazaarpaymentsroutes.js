import express from "express";
import BazaarPayment from "../models/bazaarpayments.js";
import KathaBook from "../models/kathabook.js";

const router = express.Router();

// CREATE
router.post("/", async (req, res) => {
  try {
    const { book_no, sl_no, trader_name, crop_type, crop_date, expected_payment_date, amount, kanta_entry_id } = req.body;
    if (!book_no || !sl_no) return res.status(400).json({ message: "book_no and sl_no are required" });
    if (!trader_name || !amount || !crop_date) return res.status(400).json({ message: "Missing required fields" });

    const payment = await BazaarPayment.create({
      book_no, sl_no, trader_name, crop_type, crop_date, expected_payment_date, amount, kanta_entry_id,
      is_credited: false,
    });
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET ALL
router.get("/", async (req, res) => {
  try {
    const data = await BazaarPayment.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE + SYNC to KathaBook (using book_no + sl_no as unique key)
router.put("/:id", async (req, res) => {
  try {
    const payment = await BazaarPayment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const uniqueKey = payment._id.toString();

    if (payment.is_credited === true) {
      if (!payment.credited_date) {
        return res.status(400).json({ message: "credited_date is required when marking credited" });
      }

      // Create or update the credit entry using a deterministic unique key
      await KathaBook.findOneAndUpdate(
        { sync_key: uniqueKey, record_type: "credit" },
        {
          sync_key: uniqueKey,
          record_type: "credit",
          trader_name: payment.trader_name,
          date: payment.credited_date,
          amount: payment.amount,
          book_no: payment.book_no,
          sl_no: payment.sl_no,
          kanta_entry_id: payment.kanta_entry_id,
          is_auto_generated: true,
        },
        { upsert: true, new: true }
      );
    } else {
      // Unmarked – remove the credit entry
      await KathaBook.deleteOne({ sync_key: uniqueKey, record_type: "credit" });
    }

    res.json(payment);
  } catch (error) {
    console.error("PUT error:", error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const payment = await BazaarPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const uniqueKey = payment._id.toString();
    await KathaBook.deleteMany({ sync_key: uniqueKey, record_type: "credit" });
    await payment.deleteOne();
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;