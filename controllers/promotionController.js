const Promotion = require("../models/Promotion");
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000"; // Fallback URL

// Get all promotion
exports.getAllPromotion = async (req, res) => {
  try {
    const promotion = await Promotion.find();
    res.status(200).json({ success: true, promotion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a promotion by ID
exports.updatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!promotion)
      return res
        .status(404)
        .json({ success: false, message: "Promotion not found" });

    res.status(200).json({ success: true, promotion });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a promotion by ID
exports.deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion)
      return res
        .status(404)
        .json({ success: false, message: "Promotion not found" });

    res
      .status(200)
      .json({ success: true, message: "Promotion deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Replace all promotions
exports.savePromotion = async (req, res) => {
    try {
      const promotionsData = req.body.promotions;
  
      if (!Array.isArray(promotionsData) || promotionsData.length === 0) {
        return res.status(400).json({ success: false, message: "Promotions array is required and cannot be empty." });
      }
  
      // 1. Delete all existing promotions
      await Promotion.deleteMany({});
  
      // 2. Insert the new promotions
      const savedPromotions = await Promotion.insertMany(promotionsData);
  
      res.status(201).json({ success: true, promotions: savedPromotions });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
  