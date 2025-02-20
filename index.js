require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger-output.json");
const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(express.json());

// Swagger docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

// Routes
app.use("/api/auth", authRoutes);

// @swagger
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Urban Tuxedo API" });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
