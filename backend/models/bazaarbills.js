import mongoose from "mongoose";

const bazaarBillSchema = new mongoose.Schema(
  {
    book_no: { type: Number, default: 1 },
    bill_no: { type: String, required: true },
    sl_no: { type: Number }, // Hooked up if Kanta syncs this
    date: { type: String, required: true },
    trader_name: { type: String, required: true },
    crop_type: { type: String },
    bag_type: { type: String },
    bags: { type: Number },
    quintals: { type: Number },
    kgs: { type: Number },
    price_per_unit: { type: Number },
    net_amount: { type: Number },
    total_amount: { type: Number },
    kanta_entry_id: { type: String }
  },
  { timestamps: true }
);

const BazaarBill = mongoose.model("BazaarBill", bazaarBillSchema);

export default BazaarBill;