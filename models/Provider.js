const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    categories: [
      {
        type: String,
        required: true
      }
    ],

    city: {
      type: String,
      required: true
    },

    region: {
      type: String
    },

    phone: {
      type: String
    },

    website: {
      type: String
    },

    profilePhoto: {
      type: String
    },

    description: {
      type: String
    },

    rating: {
      type: Number,
      default: 0
    },

    plan: {
      type: String,
      enum: ['basic', 'pro', 'pro+', 'pro_plus', 'proplus'], // expanded generic enum support
      default: 'basic'
    },

    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Provider', providerSchema);