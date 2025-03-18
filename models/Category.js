const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  // The category's unique name.
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  // URL-friendly slug for the category.
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  // An optional description providing more details about the category.
  description: {
    type: String,
    default: "",
  },
  // Optional field for an image representing the category.
  image: {
    type: String,
  },
  // Flag to indicate if the category is active.
  isActive: {
    type: Boolean,
    default: true,
  },
  // Self-referencing field to allow nested categories (e.g., Electronics > Computers).
  parentCategory: {
    type: String,
    default: null,
  },
  // Flag to indicate if the category is in comming soon.
  comingSoon: {
    type: Boolean,
    default: false,
  },
  // The timestamp when the category was created.
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Category", categorySchema);
