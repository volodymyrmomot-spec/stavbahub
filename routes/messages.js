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

        console.log('POST /api/messages - Request body:', { providerId, text: text ? `${text.substring(0, 50)}...` : null });
        console.log('POST /api/messages - Customer ID:', req.user.id);

        if (!providerId) {
            console.error('POST /api/messages - Missing providerId');
            return res.status(400).json({ error: 'providerId is required' });
        }

        if (!text) {
            console.error('POST /api/messages - Missing text');
            return res.status(400).json({ error: 'text is required' });
        }

        if (text.trim().length === 0) {
            console.error('POST /api/messages - Empty text');
            return res.status(400).json({ error: 'Message text cannot be empty' });
        }

        // Validate providerId is a valid ObjectId
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(providerId)) {
            console.error('POST /api/messages - Invalid providerId format:', providerId);
            return res.status(400).json({ error: 'Invalid providerId format' });
        }

        // Check if provider exists
        const Provider = require('../models/Provider');
        const provider = await Provider.findById(providerId);

        if (!provider) {
            console.error('POST /api/messages - Provider not found:', providerId);
            return res.status(404).json({ error: 'Provider not found' });
        }

        console.log('POST /api/messages - Provider found:', provider.name);

        const message = await Message.create({
            customerId: req.user.id,
            providerId,
            text: text.trim()
        });

        console.log('POST /api/messages - Message created:', message._id);

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
        console.error('POST /api/messages - Error:', error);
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

/**
 * GET /api/messages/thread?providerId=<ID>
 * Get conversation thread between logged-in customer and a specific provider
 * Requires customer authentication
 */
router.get('/thread', auth('customer'), async (req, res) => {
    try {
        const { providerId } = req.query;

        if (!providerId) {
            return res.status(400).json({ error: 'providerId is required' });
        }

        // Find all messages between this customer and provider
        const messages = await Message.find({
            customerId: req.user.id,
            providerId: providerId
        })
            .populate('customerId', 'name email')
            .populate('providerId', 'name')
            .sort({ createdAt: 1 }) // Ascending order for chat display
            .limit(200);

        return res.json({
            ok: true,
            messages
        });
    } catch (error) {
        console.error('Error fetching thread:', error);
        return res.status(500).json({ error: 'Failed to fetch thread' });
    }
});

module.exports = router;
