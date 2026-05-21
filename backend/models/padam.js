import mongoose from "mongoose";

const padamSchema = new mongoose.Schema(
  {
    book_no: { type: Number, default: 1 },
    sl_no: { type: Number },
    bill_no: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    party_name: { type: String, required: true }, // Used for both Farmer and Trader
    village: { type: String }, // Used mostly for Farmers
    crop_type: { type: String }, // Used mostly for Traders
    amount: { type: Number, required: true },
    commission: { type: Number },
    hamali: { type: Number },
    dharvay: { type: Number },
    chata: { type: Number },
    net_amount: { type: Number, required: true },
    kanta_entry_id: { type: String }
  },
  { timestamps: true }
);

const Padam = mongoose.model("Padam", padamSchema);

export default Padam;