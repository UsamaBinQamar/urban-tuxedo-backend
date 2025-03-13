const Order = require("../models/Order");
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000"; // Fallback URL

// Get all order
exports.getAllOrder = async (req, res) => {
  try {
    const order = await Order.find();
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single Order by ID
exports.getOrderByID = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrderByEmail = async (email) => {
  try {
    const orders = await Order.find({ "customer.email": email });
    if (orders.length === 0) {
      console.log("No orders found for this email.");
      return null;
    }
    return orders;
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};
