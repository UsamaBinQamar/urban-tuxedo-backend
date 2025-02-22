const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    required: true,
  },
  images: {
    primary: {
      type: String,
      required: true,
    },
    gallery: {
      type: [String],
      default: [],
    },
  },
  availableSizes: {
    type: [String],
    required: true,
  },
  defaultQuantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Product", productSchema);
