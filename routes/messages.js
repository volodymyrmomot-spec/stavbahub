const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

/**
 * POST /api/messages
 * Send a message from customer to provider
 * Requires authentication (customer only)
 */
router.post('/', auth('customer'), async (req, res) => {
    try {
        const { providerId, text, customerId } = req.body;

        console.log('POST /api/messages - Role:', req.user.role);

        let finalProviderId = providerId;
        let finalCustomerId = req.user.id;
        let senderRole = 'customer';

        if (req.user.role === 'provider') {
            // If sender is provider, they MUST provide customerId
            if (!customerId) {
                return res.status(400).json({ error: 'customerId is required for provider' });
            }

            // Get provider profile to set providerId
            const Provider = require('../models/Provider');
            const provider = await Provider.findOne({ userId: req.user.id });
            if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

            finalProviderId = provider._id;
            finalCustomerId = customerId;
            senderRole = 'provider';
        } else {
            // Customer sending
            if (!providerId) {
                return res.status(400).json({ error: 'providerId is required' });
            }
        }

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Message text cannot be empty' });
        }

        const message = await Message.create({
            customerId: finalCustomerId,
            providerId: finalProviderId,
            text: text.trim(),
            senderRole
        });

        return res.status(201).json({
            ok: true,
            message
        });
    } catch (error) {
        console.error('POST /api/messages - Error:', error);
        return res.status(500).json({ error: 'Failed to send message' });
    }
});

/**
 * GET /api/messages/provider-inbox
 * Get list of conversations for logged-in provider
 */
router.get('/provider-inbox', auth('provider'), async (req, res) => {
    try {
        const Provider = require('../models/Provider');
        const provider = await Provider.findOne({ userId: req.user.id });

        if (!provider) {
            return res.status(404).json({ error: 'Provider profile not found' });
        }

        // Aggregate to get latest message per customer
        const messages = await Message.aggregate([
            { $match: { providerId: provider._id } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$customerId",
                    lastMessage: { $first: "$text" },
                    createdAt: { $first: "$createdAt" },
                    senderRole: { $first: "$senderRole" }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        // Populate customer details
        const User = require('../models/User');
        const conversations = await User.populate(messages, { path: "_id", select: "name email" });

        return res.json({
            ok: true,
            conversations: conversations.map(c => ({
                customerId: c._id._id,
                customerName: c._id.name,
                customerEmail: c._id.email,
                lastMessage: c.lastMessage,
                createdAt: c.createdAt,
                lastSender: c.senderRole
            }))
        });

    } catch (error) {
        console.error('Error fetching inbox:', error);
        return res.status(500).json({ error: 'Failed to fetch inbox' });
    }
});

/**
 * GET /api/messages/thread
 */
router.get('/thread', auth(), async (req, res) => {
    try {
        let { providerId, customerId } = req.query;
        let query = {};

        if (req.user.role === 'customer') {
            if (!providerId) return res.status(400).json({ error: 'providerId required' });
            query.customerId = req.user.id;
            query.providerId = providerId;
        } else if (req.user.role === 'provider') {
            if (!customerId) return res.status(400).json({ error: 'customerId required' });

            const Provider = require('../models/Provider');
            const provider = await Provider.findOne({ userId: req.user.id });
            if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

            query.providerId = provider._id;
            query.customerId = customerId;
        }

        const messages = await Message.find(query)
            .populate('customerId', 'name')
            .populate('providerId', 'name')
            .sort({ createdAt: 1 })
            .limit(200);

        return res.json({ ok: true, messages });
    } catch (error) {
        console.error('Error fetching thread:', error);
        return res.status(500).json({ error: 'Failed to fetch thread' });
    }
});

module.exports = router;
