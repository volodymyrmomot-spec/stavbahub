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

    description: {
      type: String
    },

    rating: {
      type: Number,
      default: 0
    },

    plan: {
      type: String,
      enum: ['basic', 'pro', 'pro+'],
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