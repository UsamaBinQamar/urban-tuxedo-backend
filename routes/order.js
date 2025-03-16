const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

router.get("/", orderController.getAllOrder);
router.get("/:id", orderController.getOrderByID);
router.get("/email/search", orderController.getOrderByEmail); // Get by email
router.put("/:id/status", orderController.updateOrderStatus);

module.exports = router;
