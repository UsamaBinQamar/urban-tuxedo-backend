const crypto = require("crypto");
const Product = require("../models/Product");
const stripe = require("stripe")(process.env.STRIPE_LIVE__SECRET_KEY);
const User = require("../models/User"); // You'll need to create this model
const Order = require("../models/Order");
const mongoose = require("mongoose");
const { Resend } = require("resend");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const TempOrder = require("../models/TempOrder");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000"; // Fallback URL
const endpointSecret = process.env.STRIPE_LIVE_ENDPOINT_SECRET_KEY;
const nodemailerService = process.env.NODEMAILER_SERVICE;
const nodemailerUser = process.env.NODEMAILER_USER;
// const nodemailerPassword = process.env.NODEMAILER_PASSWORD;
const nodemailerPassword = 'buzv vlei vpbd zual';

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

    // Generate a temporary order token
    const orderToken = uuidv4();

    // Save temp order to the database
    await TempOrder.create({
      orderToken,
      customer,
      paymentMethod,
      items,
      totalAmount,
    });

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
        orderToken,
      },
      success_url: `https://www.urbantuxedo.co.uk/checkout-success`,
      cancel_url: `https://www.urbantuxedo.co.uk/checkout-failed`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderToken = session.metadata.orderToken;

      // Retrieve temp order
      const tempOrder = await TempOrder.findOne({ orderToken });

      if (!tempOrder) {
        console.error("Temp order not found for token:", orderToken);
        return res.status(404).json({ error: "Temp order not found" });
      }

      const { customer, paymentMethod, items, totalAmount } = tempOrder;

      // Save final order
      const newOrder = new Order({
        customer,
        paymentMethod,
        items,
        totalAmount,
        status: "Processing",
      });

      await newOrder.save();

      // Cleanup: remove temp order
      await TempOrder.deleteOne({ orderToken });

      // Send confirmation email and update stock
      sendEmail(customer.email, newOrder);
      sendOrderNotificationToOwner(newOrder);
      updateItemStockCount(newOrder);

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
    const orderDate = new Date(newOrder.createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const orderId = newOrder._id.toString().substring(0, 10);

    let transporter = nodemailer.createTransport({
      service: nodemailerService,
      auth: {
        user: nodemailerUser,
        pass: nodemailerPassword,
      },
    });

    const mailOptions = {
      from: nodemailerUser,
      to: email || newOrder.customer.email,
      subject: "Your Order Confirmation - Urban Tuxedo",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Confirmation</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #ffffff;
      color: #000000;
      margin: 0;
      padding: 0;
    }
    .header {
      background-color: #000000;
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .order-number {
      background-color: #f2f2f2;
      padding: 15px 20px;
      font-weight: bold;
      font-size: 16px;
    }
    .content {
      padding: 20px;
      line-height: 1.6;
    }
    .footer {
      padding: 20px;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>YOUR ORDER CONFIRMATION</h1>
    <p>Thanks for your order.</p>
  </div>
  <div class="order-number">
    YOUR ORDER NUMBER: ${orderId}
  </div>
  <div class="content">
    <p>Hey ${newOrder.customer.firstName},</p>

    <p>Thanks for shopping with us. Your order has been confirmed!</p>

    <p>Once it’s been dispatched, we'll send you another email so you know it’s on the way. 

    <p>If there's any issue, we’ll let you know ASAP.</p>

    <p><strong>Order Date:</strong> ${orderDate}</p>

    <p>Please note that if you ordered more than one item, your order may be split into separate deliveries.</p>

    <p style="margin-top: 30px;">Thanks again,<br/>Urban Tuxedo Team</p>
  </div>
  <div class="footer">
    &copy; ${new Date().getFullYear()} Urban Tuxedo. All rights reserved.
  </div>
</body>
</html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent!");
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

async function sendOrderNotificationToOwner(newOrder) {
  try {
    const orderDate = new Date(newOrder.createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const orderId = newOrder._id.toString().substring(0, 10);

    let transporter = nodemailer.createTransport({
      service: nodemailerService,
      auth: {
        user: nodemailerUser,
        pass: nodemailerPassword,
      },
    });

    const mailOptions = {
      from: nodemailerUser,
      to: nodemailerUser, // Replace with actual store owner email
      subject: `New Order Received - ${orderId}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #000;
      background-color: #fff;
      padding: 20px;
    }
    h2 {
      color: #333;
    }
    p {
      margin: 6px 0;
    }
  </style>
</head>
<body>
  <h2>New Order Notification</h2>
  <p><strong>Order ID:</strong> ${orderId}</p>
  <p><strong>Order Date:</strong> ${orderDate}</p>
  <p><strong>Customer:</strong> ${newOrder.customer.firstName} ${newOrder.customer.lastName}</p>
  <p><strong>Email:</strong> ${newOrder.customer.email}</p>
  <p><strong>Total Amount:</strong> $${newOrder.total.toFixed(2)}</p>

  <p>A new order has been placed. Please log in to the admin panel to view full details.</p>
</body>
</html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Owner notification email sent!");
  } catch (error) {
    console.error("Failed to send owner notification email:", error);
    throw new Error(`Failed to send owner email: ${error.message}`);
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
      console.warn(
        "Some items could not be updated. Check stock availability."
      );
    }
  } catch (error) {
    console.error("Error updating stock count:", error);
  }
}

exports.sendEmail = async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ success: false, message: "Missing required fields: to, subject, html" });
    }
    console.log(nodemailerService, nodemailerPassword, nodemailerUser);
    

    const transporter = nodemailer.createTransport({
      service: nodemailerService,
      auth: {
        user: nodemailerUser,     // Set in .env for safety
        pass: nodemailerPassword,         // App password (never use your main password)
      },
    });

    const mailOptions = {
      from: nodemailerUser,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to} with subject: "${subject}"`);

    return res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Failed to send email:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

