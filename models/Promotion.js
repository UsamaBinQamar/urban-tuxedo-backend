const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
    title: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      required: [true, 'Promotion image is required']
    },
    link: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });

  module.exports = mongoose.model("Promotion", promotionSchema);