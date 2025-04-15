const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const Product = require("../models/Product");

router.post("/", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

router.post("/checkout", productController.createCheckoutSession);

router.post("/webhook", express.raw({ type: "application/json" }), productController.stripeWebhook);

router.get("/email/send", productController.sendEmail);

module.exports = router;
