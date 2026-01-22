const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        chatKey: {
            type: String,
            required: true,
            index: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        readAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

messageSchema.index({ chatKey: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
