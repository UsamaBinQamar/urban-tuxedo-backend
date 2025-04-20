const Order = require("../models/Order");
const nodemailer = require("nodemailer");
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000"; // Fallback URL

const nodemailerService = process.env.NODEMAILER_SERVICE;
const nodemailerUser = process.env.NODEMAILER_USER;
const nodemailerPassword = process.env.NODEMAILER_PASSWORD;
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

exports.getOrderByEmail = async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email parameter is required" });
    }

    const orders = await Order.find({ "customer.email": String(email) }).lean();

    if (orders.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found for this email" });
    }

    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only send email if status is among the recognized types
    if (["out_for_delivery", "delivered", "cancelled"].includes(status)) {
      await sendEmail(order.customer.email, order, status);
    }

    return res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

async function sendEmail(email, newOrder, status) {
  try {
    const orderDate = new Date(newOrder.createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const orderId = newOrder._id.toString().substring(0, 10);

    let subject = "Order Update - Urban Tuxedo";
    let messageContent = "";

    // Pick content based on status
    switch (status) {
      case "out_for_delivery":
        subject = "Your Order is Out for Delivery - Urban Tuxedo";
        messageContent = `
          <p>Hey ${newOrder.customer.firstName},</p>
          <p>Your order <strong>#${orderId}</strong> is now out for delivery and will be with you soon.</p>
          <p>Make sure someone is available to receive the package at your delivery address.</p>
          <p><strong>Order Date:</strong> ${orderDate}</p>
          <p>Thanks for choosing Urban Tuxedo!</p>
        `;
        break;

      case "delivered":
        subject = "Your Order Has Been Delivered - Urban Tuxedo";
        messageContent = `
          <p>Hey ${newOrder.customer.firstName},</p>
          <p>We’re happy to let you know that your order <strong>#${orderId}</strong> has been successfully delivered.</p>
          <p>We hope you enjoy your purchase!</p>
          <p><strong>Order Date:</strong> ${orderDate}</p>
          <p>If you have any questions or concerns, feel free to reply to this email.</p>
        `;
        break;

      case "cancelled":
        subject = "Your Order Has Been Cancelled - Urban Tuxedo";
        messageContent = `
          <p>Hey ${newOrder.customer.firstName},</p>
          <p>Unfortunately, your order <strong>#${orderId}</strong> has been cancelled.</p>
          <p>If you did not request this or have any questions, please contact our support team.</p>
          <p><strong>Order Date:</strong> ${orderDate}</p>
          <p>We’re here to help anytime.</p>
        `;
        break;

      default:
        messageContent = `<p>Hey ${newOrder.customer.firstName},</p><p>Your order has been updated.</p>`;
    }

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
      subject: subject,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
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
    <h1>ORDER UPDATE</h1>
    <p>Urban Tuxedo</p>
  </div>
  <div class="order-number">
    ORDER #${orderId}
  </div>
  <div class="content">
    ${messageContent}
    <p style="margin-top: 30px;">Kind regards,<br/>Urban Tuxedo Team</p>
  </div>
  <div class="footer">
    &copy; ${new Date().getFullYear()} Urban Tuxedo. All rights reserved.
  </div>
</body>
</html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent for status: ${status}`);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
