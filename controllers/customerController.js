const User = require("../models/User");
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000"; // Fallback URL


// Get all customer
exports.getAllCustomer = async (req, res) => {
  try {
    const customer = await User.find();
    res.status(200).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single Customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });

    res.status(200).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
