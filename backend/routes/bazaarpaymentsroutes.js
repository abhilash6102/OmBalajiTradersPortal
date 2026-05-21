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
      bill_no, // ✅ coming from JSX
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
      bill_no, // ✅ store as-is from frontend
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

router.put("/:id", async (req, res) => {
  try {
    // Update the payment record
    const updatedPayment = await BazaarPayment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPayment) return res.status(404).json({ message: "Payment not found" });

    // 🔥 SYNC TO KATHA BOOK
    if (updatedPayment.is_credited === true) {
      // Use the database record to ensure we have book/sl numbers
      const billNo = `${updatedPayment.book_no || 1}-${updatedPayment.sl_no || 1}`;
      
      await KathaBook.findOneAndUpdate(
        { 
          kanta_entry_id: updatedPayment.kanta_entry_id, 
          record_type: "credit",
          book_no: updatedPayment.book_no,
          sl_no: updatedPayment.sl_no
        },
        {
          kanta_entry_id: updatedPayment.kanta_entry_id,
          record_type: "credit",
          trader_name: updatedPayment.trader_name,
          date: updatedPayment.credited_date,
          amount: updatedPayment.amount,
          bill_no: billNo,
          book_no: updatedPayment.book_no,
          sl_no: updatedPayment.sl_no,
          is_auto_generated: true
        },
        { upsert: true, new: true }
      );
    } else {
      // Unmark case
      await KathaBook.deleteMany({
        kanta_entry_id: updatedPayment.kanta_entry_id,
        record_type: "credit",
        book_no: updatedPayment.book_no,
        sl_no: updatedPayment.sl_no
      });
    }

    res.json(updatedPayment);
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