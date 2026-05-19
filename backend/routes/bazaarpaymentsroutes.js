import express from "express";
import BazaarPayment from "../models/bazaarpayments.js";
import KathaBook from "../models/kathabook.js";

const router = express.Router();


// ✅ CREATE PAYMENT (AUTO FROM BAZAARBILLS)
router.post("/", async (req, res) => {
  try {
    const payment = new BazaarPayment({
      ...req.body,
      is_credited: false
    });

    const saved = await payment.save();
    res.status(201).json(saved);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ✅ GET ALL
router.get("/", async (req, res) => {
  try {
    const data = await BazaarPayment.find().sort({ crop_date: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ✅ MARK AS CREDITED → AUTO ENTRY IN KATHABOOK
router.put("/mark-credited/:id", async (req, res) => {
  try {
    const { credited_date } = req.body;

    const payment = await BazaarPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // 🔹 Update payment
    payment.is_credited = true;
    payment.credited_date = credited_date;

    const updated = await payment.save();

    // 🔥 CREATE KATHABOOK CREDIT ENTRY
    await KathaBook.create({
      record_type: "credit",
      trader_name: payment.trader_name,
      amount: payment.amount,
      date: credited_date,
      bill_no: payment.bill_no,
      book_no: payment.book_no,
      sl_no: payment.sl_no,
      kanta_entry_id: payment.kanta_entry_id,
      is_auto_generated: true
    });

    res.json(updated);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ❌ DELETE PAYMENT + REMOVE KATHABOOK CREDIT
router.delete("/:id", async (req, res) => {
  try {
    const payment = await BazaarPayment.findById(req.params.id);

    if (payment) {
      // 🔥 DELETE RELATED CREDIT ENTRY
      await KathaBook.deleteMany({
        kanta_entry_id: payment.kanta_entry_id,
        bill_no: payment.bill_no,
        record_type: "credit"
      });
    }

    await BazaarPayment.findByIdAndDelete(req.params.id);

    res.json({ message: "Deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 🔄 UPDATE PAYMENT (optional)
router.put("/:id", async (req, res) => {
  try {
    const updated = await BazaarPayment.findByIdAndUpdate(
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