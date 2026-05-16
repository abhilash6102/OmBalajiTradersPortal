import mongoose from "mongoose";

const traderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    short_form: {
      type: String,
      required: true,
    },
    ref_no: {
      type: Number,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Trader = mongoose.model("Trader", traderSchema);

export default Trader;