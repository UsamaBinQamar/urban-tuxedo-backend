const crypto = require("crypto");
const Product = require("../models/Product");
const stripe = require("stripe")(process.env.STRIPE_LIVE__SECRET_KEY);
const User = require("../models/User"); // You'll need to create this model
const Order = require("../models/Order");
const mongoose = require("mongoose");
const { Resend } = require("resend");
const nodemailer = require("nodemailer");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000"; // Fallback URL
const endpointSecret = process.env.STRIPE_LIVE_ENDPOINT_SECRET_KEY;
const nodemailerService = process.env.NODEMAILER_SERVICE;
const nodemailerUser = process.env.NODEMAILER_USER;
const nodemailerPassword = process.env.NODEMAILER_PASSWORD;

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

// Webhook to handle successful payments
exports.createCheckoutSession = async (req, res) => {
  try {
    const { customer, paymentMethod, items, totalAmount } = req.body;

    if (!customer || !items || !totalAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Prepare line items for Stripe
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.title,
          images: [item.images?.primary || item.images?.gallery?.[0] || ""],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: customer.email,
      line_items: lineItems,
      mode: "payment",
      metadata: {
        customer: JSON.stringify(customer),
        paymentMethod,
        items: JSON.stringify(items), // Store items as string to use in webhook
        totalAmount,
      },
      success_url: `https://www.urbantuxedo.co.uk/checkout-success`,
      cancel_url: `https://www.urbantuxedo.co.uk/checkout-failed`,
    });

    // Return session URL to frontend
    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  // Debug info
  console.log("Received webhook");
  console.log("Request body type:", typeof req.body); // Should be object (Buffer)

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Extract order details from metadata
      const customer = JSON.parse(session.metadata.customer);
      const paymentMethod = session.metadata.paymentMethod;
      const items = JSON.parse(session.metadata.items);
      const totalAmount = session.metadata.totalAmount;

      // Save order in database
      const newOrder = new Order({
        customer,
        paymentMethod,
        items,
        totalAmount,
        status: "Processing",
      });
      console.log(newOrder);
      await newOrder.save();

      // Send confirmation email
      // sendEmail();
      sendEmail(customer.email, newOrder);
      updateItemStockCount(newOrder); // Update stock count

      console.log("Order saved & email sent!");

      res.status(200).json({ received: true });
    } else {
      res.status(400).json({ error: "Unhandled event type" });
    }
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(400).json({ error: "Webhook handler failed" });
  }
};

async function sendEmail(email, newOrder) {
  try {
    // Format date
    const orderDate = new Date(newOrder.createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Format order ID - taking just the first part for readability
    const orderId = newOrder._id.toString().substring(0, 10);

    let transporter = nodemailer.createTransport({
      service: nodemailerService,
      auth: {
        user: nodemailerUser, // Your Gmail
        pass: nodemailerPassword, // Generate from Google Account
      },
    });

    // Create items HTML
    let itemsHTML = "";
    let subtotal = 0;

    newOrder.items.forEach((item) => {
      subtotal += item.price * item.quantity;
      itemsHTML += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${
            item.title
          }</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${
            item.quantity
          }</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">£${item.price.toFixed(
            2
          )}</td>
        </tr>
      `;
    });

    // Calculate shipping (assuming the difference between total and subtotal is shipping)
    const shipping = newOrder.totalAmount - subtotal;

    const mailOptions = {
      from: "razatalha750@gmail.com",
      to: email || newOrder.customer.email,
      subject: "Order Confirmation - Urban Tuxedo",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - Urban Tuxedo</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="font-size: 24px; font-weight: bold; color: #14213d; letter-spacing: 1px;">URBAN TUXEDO</div>
  </div>

  <h1 style="color: #14213d; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-top: 20px;">Order Confirmation</h1>
  
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <p>Hello <strong>${newOrder.customer.firstName} ${
        newOrder.customer.lastName
      }</strong>,</p>
    <p>Thank you for your order! We're pleased to confirm that your order has been received and is being processed.</p>
    <p><span style="font-weight: bold; color: #14213d;">Order #:</span> ${orderId}</p>
    <p><span style="font-weight: bold; color: #14213d;">Order Date:</span> ${orderDate}</p>
  </div>

  <h2 style="color: #14213d; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-top: 20px;">Order Summary</h2>
  
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr>
        <th style="background-color: #f0f0f0; text-align: left; padding: 10px;">Product</th>
        <th style="background-color: #f0f0f0; text-align: left; padding: 10px;">Quantity</th>
        <th style="background-color: #f0f0f0; text-align: left; padding: 10px;">Price</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
      <tr>
        <td colspan="2" style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">Subtotal:</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">£${subtotal.toFixed(
          2
        )}</td>
      </tr>
      <tr>
        <td colspan="2" style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">Shipping & Handling:</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">£${shipping.toFixed(
          2
        )}</td>
      </tr>
      <tr>
        <td colspan="2" style="text-align: right; padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Total:</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">£${newOrder.totalAmount.toFixed(
          2
        )}</td>
      </tr>
    </tbody>
  </table>

  <p style="text-align: center; margin: 30px 0; font-size: 18px; color: #14213d;">Thank you for shopping with Urban Tuxedo!</p>

</body>
</html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent!");
  } catch (error) {
    console.error("Email sending failed:", error);
    // Since this is a function, we shouldn't directly use res here
    // Instead, we could throw the error to be handled by the caller
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

async function updateItemStockCount(order) {
  try {
    const bulkOperations = order.items.map((item) => ({
      updateOne: {
        filter: { _id: item._id, "availableSizes.size": item.selectedSize },
        update: { $inc: { "availableSizes.$.quantity": -item.quantity } },
      },
    }));

    const result = await Product.bulkWrite(bulkOperations);

    if (result.modifiedCount !== order.items.length) {
      console.warn("Some items could not be updated. Check stock availability.");
    }
  } catch (error) {
    console.error("Error updating stock count:", error);
  }
}

exports.sendEmail = async (req, res) => {
  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "razatalha750@gmail.com", // Your Gmail
        pass: "jdjv wlmb sctg xcwv", // Generate from Google Account
      },
    });

    const mailOptions = {
      from: "razatalha750@gmail.com",
      to: "hrxfarooqi@gmail.com",
      subject: "Order Confirmation",
      html: "<h1>Thank you for your order!</h1>",
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent!");
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
