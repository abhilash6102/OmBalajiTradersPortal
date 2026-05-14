import mongoose from "mongoose";

const kantaSchema = new mongoose.Schema(
  {
    book_no: {
      type: Number,
      default: 1
    },

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
    },

    // 🔥 OPTIONAL BUT VERY USEFUL FOR FUTURE SYNC
    kanta_uid: {
      type: String,
      unique: true,
      sparse: true
    },
    kanta_entry_id: { type: String }
  },
  {
    timestamps: true
  }
);

const Kanta = mongoose.model("Kanta", kantaSchema);

export default Kanta;