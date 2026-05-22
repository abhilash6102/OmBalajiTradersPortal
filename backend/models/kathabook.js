import mongoose from "mongoose";

const kathabookSchema = new mongoose.Schema(
  {
    record_type: {
      type: String,
      enum: ["credit", "debit", "commission"],
      required: true,
      index: true,
    },
    trader_name: {
      type: String,
      default: "", // Prevents crash for commission entries
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: String, 
      required: true,
    },
    bill_no: {
      type: String,
    },
    book_no: { type: Number },
    sl_no: { type: Number },
    kanta_entry_id: { type: String },
is_auto_generated: { type: Boolean, default: false },
month: { type: String, index: true },
sync_key: { type: String, index: true },
  },
  
  { timestamps: true },
  
);
kathabookSchema.index({ sync_key: 1, record_type: 1 });
const KathaBook = mongoose.model("KathaBook", kathabookSchema);
export default KathaBook;