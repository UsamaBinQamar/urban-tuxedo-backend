const crypto = require("crypto");
const Product = require("../models/Product");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User"); // You'll need to create this model
const Order = require("../models/Order");
const mongoose = require("mongoose");
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000"; // Fallback URL

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a product by ID
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a product by ID
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Validate required environment variables
exports.createCheckoutSession = async (req, res) => {
  try {
    const { customer, paymentMethod, items, totalAmount } = req.body;

    // Validate input
    if (!customer || !items || !totalAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Prepare line items for Stripe
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.title,
          images: [item.images?.primary || item.images?.gallery?.[0] || ""], // Fallback to gallery image if primary is missing
        },
        unit_amount: Math.round(item.price * 100), // Convert price to cents
      },
      quantity: item.quantity,
    }));

    // Create a new order in the database
    const newOrder = new Order({
      customer,
      paymentMethod,
      items,
      totalAmount,
      status: "Processing",
    });
    console.log(newOrder)
    await newOrder.save();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // You can add more methods if needed
      customer_email: customer.email,
      line_items: lineItems,
      mode: "payment",
      metadata: {
        orderId: newOrder._id.toString(),
        customer: JSON.stringify(customer),
        paymentMethod,
      },
      success_url: `https://www.urbantuxedo.co.uk/checkout-success/${newOrder._id}`,
      cancel_url: `https://www.urbantuxedo.co.uk/checkout-failed`,
    });

    // Return session URL to frontend
    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: error.message });
  }
};

// Webhook to handle successful payments
exports.createCheckoutSession = async (req, res) => {
  try {
    const { customer, paymentMethod, items, totalAmount } = req.body;

    // Validate input
    if (!customer || !items || !totalAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Ensure each item has a valid productId
    const formattedItems = items.map((item) => ({
      productId: new mongoose.Types.ObjectId(item._id), // Convert string ID to ObjectId
      title: item.title,
      price: item.price,
      images: item.images,
      availableSizes: item.availableSizes,
      quantity: item.quantity,
    }));

    // Prepare line items for Stripe
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.title,
          images: [item.images?.primary || item.images?.gallery?.[0] || ""], // Fallback to gallery image if primary is missing
        },
        unit_amount: Math.round(item.price * 100), // Convert price to cents
      },
      quantity: item.quantity,
    }));

    // Create a new order in the database
    const newOrder = new Order({
      customer,
      paymentMethod,
      items: formattedItems,
      totalAmount,
      status: "Processing",
    });
    console.log({newOrder})
    await newOrder.save();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // You can add more methods if needed
      customer_email: customer.email,
      line_items: lineItems,
      mode: "payment",
      metadata: {
        orderId: newOrder._id.toString(),
        customer: JSON.stringify(customer),
        paymentMethod,
      },
      success_url: `http://localhost:5173/checkout-success/${newOrder._id}`,
      cancel_url: `http://localhost:5173/checkout-failed`,
    });

    // Return session URL to frontend
    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: error.message });
  }
};
