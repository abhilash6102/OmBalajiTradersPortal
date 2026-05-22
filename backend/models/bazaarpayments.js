import mongoose from "mongoose";

const bazaarPaymentSchema = new mongoose.Schema(
  {
    sl_no: { type: Number },
    book_no: { type: Number, required: true },
    kanta_entry_id: { type: String, index: true }, // Link to Kanta entry
    trader_name: { type: String, required: true },
    crop_type: { type: String },
    crop_date: { type: String, required: true },
    expected_payment_date: { type: String },
    amount: { type: Number, required: true },
    is_credited: { type: Boolean, default: false },
    credited_date: { type: String },
    bank: { type: String },
    sync_key: { type: String, index: true },
  },
  { timestamps: true }
);


const BazaarPayment = mongoose.model("BazaarPayment", bazaarPaymentSchema);

export default BazaarPayment;