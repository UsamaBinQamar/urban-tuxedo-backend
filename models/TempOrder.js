const mongoose = require("mongoose");

const tempOrderSchema = new mongoose.Schema({
  orderToken: { type: String, required: true, unique: true },
  customer: Object,
  paymentMethod: String,
  items: Array,
  totalAmount: Number,
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // auto-delete after 1 hour
});

module.exports = mongoose.model("TempOrder", tempOrderSchema);
