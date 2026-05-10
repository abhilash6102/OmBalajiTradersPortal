import mongoose from "mongoose";

const bazaarPaymentSchema = new mongoose.Schema(
  {
    sl_no: { type: Number },
    kanta_entry_id: { type: String },
    trader_name: { type: String, required: true },
    farmer_name: { type: String },
    village: { type: String },
    crop_type: { type: String },
    crop_date: { type: String, required: true },
    expected_payment_date: { type: String },
    amount: { type: Number, required: true },
    is_credited: { type: Boolean, default: false },
    credited_date: { type: String },
    bank: { type: String }
  },
  { timestamps: true }
);

const BazaarPayment = mongoose.model("BazaarPayment", bazaarPaymentSchema);

export default BazaarPayment;