const Message = require("../models/Message");

function makeChatKey(a, b) {
    return [String(a), String(b)].sort().join("__");
}

// GET /api/messages/threads
exports.getThreads = async (req, res) => {
    try {
        const userId = req.user._id;

        const threads = await Message.aggregate([
            { $match: { $or: [{ fromUser: userId }, { toUser: userId }] } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$chatKey",
                    lastText: { $first: "$text" },
                    lastDate: { $first: "$createdAt" },
                    fromUser: { $first: "$fromUser" },
                    toUser: { $first: "$toUser" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$toUser", userId] },
                                        { $eq: ["$readAt", null] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { lastDate: -1 } },
        ]);

        const result = threads.map((t) => ({
            chatKey: t._id,
            otherUserId:
                String(t.fromUser) === String(userId) ? t.toUser : t.fromUser,
            lastText: t.lastText,
            lastDate: t.lastDate,
            unreadCount: t.unreadCount,
        }));

        res.json({ ok: true, threads: result });
    } catch {
        res.status(500).json({ ok: false, error: "Failed to load threads" });
    }
};

// GET /api/messages/with/:userId
exports.getChatWithUser = async (req, res) => {
    const chatKey = makeChatKey(req.user.id, req.params.userId);
    const messages = await Message.find({ chatKey }).sort({ createdAt: 1 });
    res.json({ ok: true, messages });
};

// POST /api/messages/send
exports.sendMessage = async (req, res) => {
    const { toUserId, text } = req.body;
    if (!toUserId || !text) {
        return res.status(400).json({ ok: false });
    }

    const chatKey = makeChatKey(req.user.id, toUserId);

    const message = await Message.create({
        fromUser: req.user.id,
        toUser: toUserId,
        chatKey,
        text,
    });

    res.status(201).json({ ok: true, message });
};

// POST /api/messages/mark-read
exports.markRead = async (req, res) => {
    const { otherUserId } = req.body;
    const chatKey = makeChatKey(req.user.id, otherUserId);

    await Message.updateMany(
        { chatKey, toUser: req.user._id, readAt: null },
        { $set: { readAt: new Date() } }
    );

    res.json({ ok: true });
};
