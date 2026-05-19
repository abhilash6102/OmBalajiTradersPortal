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
      default: "",
    },
    book_no: { type: Number },
    sl_no: { type: Number },
  },
  { timestamps: true }
);

const KathaBook = mongoose.model("KathaBook", kathabookSchema);
export default KathaBook;