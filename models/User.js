const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer' },
    name: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);