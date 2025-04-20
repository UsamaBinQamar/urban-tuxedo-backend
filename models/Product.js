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
  discountRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  discountedPrice: {
    type: Number,
    default: null,
    min: 0,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
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
    type: [
      {
        color: {
          type: String,
          required: false,
          default: 'NOCOLOR',
        },
        size: {
          type: String,
          required: false,
          default: 'FREESIZE',
        },
        quantity: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    required: false,
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