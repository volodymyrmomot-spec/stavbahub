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

// CREATE or UPDATE provider (upsert) - ensures registration always succeeds even if profile exists
router.post('/', auth('provider'), async (req, res) => {
  try {
    // Upsert: update if exists, insert if not
    const provider = await Provider.findOneAndUpdate(
      { userId: req.user.id },
      {
        userId: req.user.id,
        ...req.body
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );

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

// UPDATE my provider profile (PATCH)
router.patch('/me', auth('provider'), async (req, res) => {
  try {
    const allowed = ['name', 'categories', 'city', 'description', 'active', 'plan', 'phone', 'region', 'website', 'profilePhoto'];
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

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper: Upload buffer to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'stavbahub_providers' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// FULL UPDATE / UPSERT provider profile (PUT) - with PHOTO UPLOAD
router.put('/me', auth('provider'), upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'workPhotos', maxCount: 30 }
]), async (req, res) => {
  try {
    // 1. Get current provider to check plan limits and existing data
    let provider = await Provider.findOne({ userId: req.user.id });

    // Check limits based on PREVIOUS plan (or default basic)
    const currentPlan = (provider && provider.plan) ? provider.plan.toLowerCase() : 'basic';

    let maxPhotos = 0;
    if (['pro', 'proplus', 'pro+', 'pro_plus'].includes(currentPlan)) {
      if (currentPlan === 'pro') maxPhotos = 3;
      else maxPhotos = 30; // Pro+
    }

    // 2. Handle Profile Photo Upload
    let profilePhotoUrl = undefined;
    if (req.files && req.files.profilePhoto && req.files.profilePhoto[0]) {
      const result = await uploadToCloudinary(req.files.profilePhoto[0].buffer);
      profilePhotoUrl = result.secure_url;
    }

    // 3. Handle Work Photos Upload
    let newWorkPhotos = [];
    if (req.files && req.files.workPhotos) {
      // If plan is basic, ignore uploads
      if (maxPhotos > 0) {
        for (const file of req.files.workPhotos) {
          const result = await uploadToCloudinary(file.buffer);
          newWorkPhotos.push(result.secure_url);
        }
      }
    }

    // 4. Prepare updates
    // If provider doesn't exist, we are creating it (upsert)
    // We merge existing workPhotos with new ones if needed, OR we overwrite?
    // Frontend sends EVERYTHING? No, frontend gallery logic usually deletes locally.
    // If we want to append, we push. 
    // BUT `req.body` might not contain existing photos if we strictly use FormData for files.
    // The frontend script in `provider-profile-edit.js` manages `currentWorkPhotos` array.
    // But FormData cannot easily send an array of strings (existing URLs).
    // Strategy: Frontend should send existing URLs as text fields `existingWorkPhotos`.
    // We will IMPLEMENT THIS in Frontend.
    // For now, let's assume `req.body.existingWorkPhotos` comes as array or single string.

    let finalWorkPhotos = [];
    if (req.body.existingWorkPhotos) {
      if (Array.isArray(req.body.existingWorkPhotos)) {
        finalWorkPhotos = [...req.body.existingWorkPhotos];
      } else {
        finalWorkPhotos = [req.body.existingWorkPhotos];
      }
    }

    // Enforce limit on total
    if (maxPhotos > 0) {
      finalWorkPhotos = [...finalWorkPhotos, ...newWorkPhotos].slice(0, maxPhotos);
    } else {
      finalWorkPhotos = []; // Basic plan has 0
    }

    const updates = {
      userId: req.user.id,
      ...req.body,
      workPhotos: finalWorkPhotos
    };

    if (profilePhotoUrl) {
      updates.profilePhoto = profilePhotoUrl;
      // Remove legacy data field if exists to save space? Optional.
      updates.profilePhotoData = undefined;
    }

    // Upsert
    provider = await Provider.findOneAndUpdate(
      { userId: req.user.id },
      updates,
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );
    return res.json(provider);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error: ' + e.message });
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
      {
        $addFields: {
          phone: {
            $cond: { if: { $eq: ['$plan', 'basic'] }, then: null, else: '$phone' }
          },
          website: {
            $cond: { if: { $eq: ['$plan', 'basic'] }, then: null, else: '$website' }
          }
        }
      },
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

    // Redact contact info for BASIC plan
    const result = provider.toObject();
    const plan = (result.plan || 'basic').toLowerCase();

    if (plan === 'basic') {
      result.phone = null;
      result.website = null;
    }

    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;