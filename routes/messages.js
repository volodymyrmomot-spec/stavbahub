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
        const { providerId, text } = req.body;

        if (!providerId || !text) {
            return res.status(400).json({ error: 'providerId and text are required' });
        }

        if (text.trim().length === 0) {
            return res.status(400).json({ error: 'Message text cannot be empty' });
        }

        const message = await Message.create({
            customerId: req.user.id,
            providerId,
            text: text.trim()
        });

        return res.status(201).json({
            ok: true,
            message: {
                id: message._id,
                customerId: message.customerId,
                providerId: message.providerId,
                text: message.text,
                createdAt: message.createdAt
            }
        });
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json({ error: 'Failed to send message' });
    }
});

/**
 * GET /api/messages
 * Get messages for logged-in user
 * - Customers see messages they sent
 * - Providers see messages they received
 */
router.get('/', auth(), async (req, res) => {
    try {
        let query = {};

        if (req.user.role === 'customer') {
            query.customerId = req.user.id;
        } else if (req.user.role === 'provider') {
            // Get provider profile to find providerId
            const Provider = require('../models/Provider');
            const provider = await Provider.findOne({ userId: req.user.id });

            if (!provider) {
                return res.status(404).json({ error: 'Provider profile not found' });
            }

            query.providerId = provider._id;
        } else {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const messages = await Message.find(query)
            .populate('customerId', 'name email')
            .populate('providerId', 'name')
            .sort({ createdAt: -1 })
            .limit(100);

        return res.json({
            ok: true,
            messages
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

module.exports = router;
