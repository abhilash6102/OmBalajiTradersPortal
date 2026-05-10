import mongoose from "mongoose";

const kantaSchema = new mongoose.Schema(
  {
    sl_no: {
      type: Number
    },
    date: {
      type: String,
      required: true
    },
    farmer_name: {
      type: String,
      required: true
    },
    village: {
      type: String,
      required: true
    },
    crop_type: {
      type: String,
      required: true
    },
    bags: {
      type: Number
    },
    kgs: {
      type: Number
    },
    bag_type: {
      type: String
    },
    price_per_unit: {
      type: Number,
      required: true
    },
    trader_name: {
      type: String,
      required: true
    },
    bazaar: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

const Kanta = mongoose.model("Kanta", kantaSchema);

export default Kanta;