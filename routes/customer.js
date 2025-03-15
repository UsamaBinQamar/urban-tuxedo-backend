const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");

router.get("/", customerController.getAllCustomer);
router.get("/:id", customerController.getCustomerById);
router.put("/:id", customerController.updateCustomerProfile);

module.exports = router;
