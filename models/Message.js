const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        providerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Provider',
            required: true
        },
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        }
    },
    { timestamps: true }
);

// Index for faster queries
MessageSchema.index({ customerId: 1, createdAt: -1 });
MessageSchema.index({ providerId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
