const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const Category = require("../models/Category");


router.post("/", async (req, res) => {
  console.log(req.body);
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
router.get("/", categoryController.getAllCategory);
router.get("/:id", categoryController.getCategoryById);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);


module.exports = router;
