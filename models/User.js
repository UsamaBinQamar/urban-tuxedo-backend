const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  zipCode: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
    default: "US",
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minLength: 6,
  },
  phone: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  addresses: [addressSchema],
  stripeCustomerId: {
    type: String,
    sparse: true,
  },
  cart: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      quantity: {
        type: Number,
        default: 1,
        min: 1,
      },
    },
  ],
  orders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
  wishlist: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
userSchema.pre("save", async function (next) {
  this.updatedAt = new Date();
  next();
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to add address
userSchema.methods.addAddress = async function (address) {
  if (address.isDefault) {
    this.addresses.forEach((addr) => (addr.isDefault = false));
  }
  this.addresses.push(address);
  return this.save();
};

// Method to update cart
userSchema.methods.updateCart = async function (productId, quantity) {
  const cartItem = this.cart.find((item) => item.productId.equals(productId));

  if (cartItem) {
    if (quantity <= 0) {
      this.cart = this.cart.filter((item) => !item.productId.equals(productId));
    } else {
      cartItem.quantity = quantity;
    }
  } else if (quantity > 0) {
    this.cart.push({ productId, quantity });
  }

  return this.save();
};

// Method to add to wishlist
userSchema.methods.toggleWishlist = async function (productId) {
  const index = this.wishlist.indexOf(productId);
  if (index > -1) {
    this.wishlist.splice(index, 1);
  } else {
    this.wishlist.push(productId);
  }
  return this.save();
};

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
});

// Ensure virtuals are included in JSON output
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("User", userSchema);
