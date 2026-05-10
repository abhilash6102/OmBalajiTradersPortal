import express from "express";
import BazaarPayment from "../models/bazaarpayments.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const payment = new BazaarPayment(req.body);
    const saved = await payment.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const data = await BazaarPayment.find().sort({ crop_date: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await BazaarPayment.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updated = await BazaarPayment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;