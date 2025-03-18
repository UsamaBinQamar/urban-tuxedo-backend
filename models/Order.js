const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customer: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
    },
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["cod", "card", "paypal"], // Add more methods if needed
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      title: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      images: {
        primary: { type: String, required: true },
        gallery: { type: [String], default: [] },
      },
      availableSizes: { type: [String], required: true },
      selectedSize: { type: String },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  totalAmount: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, required: true },
});

module.exports = mongoose.model("Order", orderSchema);
