import mongoose from "mongoose";

const kathabookSchema = new mongoose.Schema(
{
  kanta_entry_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Kanta",
    index: true
  },

  record_type: {
    type: String,
    enum: ["credit", "debit", "commission"],
    required: true,
    index: true
  },

  trader_name: {
    type: String,
    index: true
  },

  amount: {
    type: Number,
    required: true
  },

  date: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },

  bill_no: String,
  book_no: Number,
  sl_no: Number,

  is_auto_generated: {
    type: Boolean,
    default: true
  },

  notes: String
},
{ timestamps: true }
);

kathabookSchema.index({ trader_name: 1, date: 1 });

export default mongoose.model("KathaBook", kathabookSchema);