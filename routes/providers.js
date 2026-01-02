const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Provider = require('../models/Provider');
const auth = require('../middleware/auth');

// --- helpers ---
function escapeRegex(str = '') {
  // escapes regex special chars: .*+?^${}()|[]\
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build plan priority in Mongo (Pro+ > Pro > Basic > others)
const PLAN_PRIORITY_ADD_FIELDS = {
  $addFields: {
    planPriority: {
      $switch: {
        branches: [
          { case: { $eq: ['$plan', 'pro+'] }, then: 3 },
          { case: { $eq: ['$plan', 'pro'] }, then: 2 },
          { case: { $eq: ['$plan', 'basic'] }, then: 1 }
        ],
        default: 0
      }
    }
  }
};

// CREATE provider (only provider role)
router.post('/', auth('provider'), async (req, res) => {
  try {
    const exists = await Provider.findOne({ userId: req.user.id });
    if (exists) {
      return res.status(409).json({ message: 'Provider already exists' });
    }

    const provider = await Provider.create({
      userId: req.user.id,
      ...req.body
    });

    return res.status(201).json(provider);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET my provider profile (for provider cabinet)
router.get('/me', auth('provider'), async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user.id });
    if (!provider) return res.status(404).json({ message: 'Provider profile not found' });
    return res.json(provider);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE my provider profile (for provider cabinet)
router.patch('/me', auth('provider'), async (req, res) => {
  try {
    const allowed = ['name', 'categories', 'city', 'description', 'active'];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const provider = await Provider.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updates },
      { new: true }
    );

    if (!provider) return res.status(404).json({ message: 'Provider profile not found' });
    return res.json(provider);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// LIGHT LIST for UI (Antigravity friendly)
router.get('/list/light', async (req, res) => {
  try {
    const pipeline = [
      { $match: { active: true } },
      PLAN_PRIORITY_ADD_FIELDS,
      {
        $sort: {
          planPriority: -1, // PRO+/PRO выше
          rating: -1,
          createdAt: -1
        }
      },
      { $limit: 200 },
      {
        $project: {
          id: '$_id',
          name: 1,
          categories: 1,
          city: 1,
          rating: 1,
          plan: 1,
          active: 1
        }
      }
    ];

    const result = await Provider.aggregate(pipeline);
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET providers (public) + filters
// /api/providers?city=Zilina&category=Elektrikar&plan=basic&q=novak&sort=rating
router.get('/', async (req, res) => {
  try {
    const { city, category, plan, q, sort = 'new' } = req.query;

    const filter = { active: true };

    if (city) {
      const safeCity = escapeRegex(city);
      filter.city = new RegExp(`^${safeCity}$`, 'i'); // exact city, case-insensitive
    }

    if (plan) filter.plan = plan;

    if (category) {
      const safeCat = escapeRegex(category);
      filter.categories = { $in: [new RegExp(`^${safeCat}$`, 'i')] };
    }

    if (q) {
      const safeQ = escapeRegex(q);
      filter.$or = [
        { name: new RegExp(safeQ, 'i') },
        { description: new RegExp(safeQ, 'i') },
        { city: new RegExp(safeQ, 'i') }
      ];
    }

    // сортировка: платные ВСЕГДА выше, дальше зависит от sort
    const secondSort =
      sort === 'rating'
? { rating: -1, createdAt: -1 }
        : { createdAt: -1 };

    const pipeline = [
      { $match: filter },
      PLAN_PRIORITY_ADD_FIELDS,
      { $sort: { planPriority: -1, ...secondSort } },
      { $limit: 100 }
    ];

    const providers = await Provider.aggregate(pipeline);
    return res.json(providers);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET provider by id (with user info)
router.get('/:id', async (req, res) => {
  try {
    // prevent 500 on invalid id
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid provider id' });
    }

    const provider = await Provider.findById(req.params.id).populate(
      'userId',
      'email name role'
    );

    if (!provider) {
      return res.status(404).json({ message: 'Not found' });
    }

    return res.json(provider);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;