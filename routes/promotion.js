const express = require("express");
const router = express.Router();
const promotionController = require("../controllers/promotionController");

router.get("/", promotionController.getAllPromotion);
router.post("/", promotionController.savePromotion);
router.put("/", promotionController.updatePromotion);
router.delete("/:id", promotionController.deletePromotion);

module.exports = router;
