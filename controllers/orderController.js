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

const Order = require("../models/Order");

exports.getOrderByEmail = async (req, res) => {
  try {
    const email = req.params.email; // Get the email from the route parameter

    // Query the database for orders with the given email
    const orders = await Order.find({ "customer.email": email }).lean();

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found for this email.",
      });
    }

    // Return the orders if found
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
