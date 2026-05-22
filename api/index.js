require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("../swagger-output.json");
const authRoutes = require("../routes/auth");
const categoryRoutes = require("../routes/category");
const productRoutes = require("../routes/product");
const customerRoutes = require("../routes/customer");
const orderRoutes = require("../routes/order");
const promotionRoutes = require("../routes/promotion");
const cors = require("cors");

const app = express();
app.use(cors());

let dbConnectionPromise;
function connectToDatabase() {
  if (!dbConnectionPromise) {
    dbConnectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      })
      .catch((err) => {
        dbConnectionPromise = undefined;
        throw err;
      });
  }
  return dbConnectionPromise;
}

app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error("MongoDB connection error:", err);
    res.status(500).json({ success: false, message: "Database connection failed" });
  }
});

// Middleware
// app.use(express.json());
app.use((req, res, next) => {
  // Skip parsing for the webhook route
  if (req.originalUrl === '/api/products/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Swagger setup with CDN links
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    url: "/swagger.json",
  },
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Urban Tuxedo API Docs",
  customfavIcon: "https://swagger.io/favicon-32x32.png",
  customCssUrl: [
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.9.0/swagger-ui.min.css",
  ],
  customJs: [
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.9.0/swagger-ui-bundle.js",
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.9.0/swagger-ui-standalone-preset.js",
  ],
};

// Serve swagger.json
app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerFile);
});

// Swagger docs endpoint
app.use("/api-docs", swaggerUi.serve);
app.get("/api-docs", swaggerUi.setup(swaggerFile, swaggerOptions));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/promotions", promotionRoutes);
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Urban Tuxedo API" });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  connectToDatabase()
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => console.error("MongoDB connection error:", err));
}

module.exports = app;
