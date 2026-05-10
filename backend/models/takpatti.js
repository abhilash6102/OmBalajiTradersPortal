import mongoose from "mongoose";

const takPattiSchema = new mongoose.Schema(
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
    bag_type: {
      type: String
    },
    trader_name: {
      type: String,
      required: true
    },
    bags: {
      type: Number
    },
    kgs: {
      type: Number
    },
    price_per_unit: {
      type: Number,
      required: true
    },
    sum_amount: {
      type: Number
    },
    commission: {
      type: Number
    },
    hamali: {
      type: Number
    },
    dharvay: {
      type: Number
    },
    chata: {
      type: Number
    },
    net_payable: {
      type: Number
    },
    quintals: {
      type: Number
    },
    leftover_kgs: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

const TakPatti = mongoose.model("TakPatti", takPattiSchema);

export default TakPatti;