const crypto = require("crypto");
const Product = require("../models/Product");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User"); // You'll need to create this model
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
    const { customer, items, totalAmount } = req.body;

    // Validate required fields
    if (!customer || !items || !totalAmount) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // Find or create user in MongoDB
    let user = await User.findOne({ email: customer.email });

    if (!user) {
      // Generate a temporary password and username for new users
      const tempPassword = crypto.randomBytes(8).toString("hex");
      const username =
        customer.email.split("@")[0] +
        "_" +
        crypto.randomBytes(4).toString("hex");

      try {
        // Create customer in Stripe first
        const stripeCustomer = await stripe.customers.create({
          email: customer.email,
          name: `${customer.firstName} ${customer.lastName}`,
          phone: customer.phone,
          address: {
            line1: customer.address.street,
            city: customer.address.city,
            state: customer.address.state,
            postal_code: customer.address.zipCode,
          },
        });

        // Create user in MongoDB
        user = await User.create({
          username: username,
          password: tempPassword, // This will be hashed by the pre-save hook
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          addresses: [
            {
              street: customer.address.street,
              city: customer.address.city,
              state: customer.address.state,
              zipCode: customer.address.zipCode,
              isDefault: true,
            },
          ],
          stripeCustomerId: stripeCustomer.id,
        });
      } catch (error) {
        console.error("Error creating user:", error);
        return res.status(400).json({
          error: "Failed to create user",
          details: error.message,
        });
      }
    }

    // If user exists but doesn't have a Stripe customer ID, create one
    if (!user.stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone,
      });
      user.stripeCustomerId = stripeCustomer.id;
      await user.save();
    }

    // Format line items for Stripe
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Ensure URLs are properly formatted
    const successUrl = new URL("/order/success", CLIENT_URL).toString();
    const cancelUrl = new URL("/cart", CLIENT_URL).toString();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId,
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      metadata: {
        userId: user._id.toString(),
        orderDetails: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }),
      },
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["US"], // Adjust based on your shipping countries
      },
    });

    // Return the checkout URL
    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Checkout session creation failed:", error);
    return res.status(500).json({
      error: "Failed to create checkout session",
      details: error.message,
    });
  }
};
// Webhook to handle successful payments
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Here you would:
    // 1. Create an order in your database
    // 2. Update inventory
    // 3. Send confirmation email
    // 4. Any other post-purchase processing

    console.log("Payment successful for session:", session.id);
  }

  res.json({ received: true });
};
