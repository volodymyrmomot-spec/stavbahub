const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Provider = require('../models/Provider');
const auth = require('../middleware/auth');

// CRITICAL: Require dependencies BEFORE using them
const multer = require('multer');
const streamifier = require('streamifier');

// Cloudinary v2 import (correct way)
const { v2: cloudinary } = require('cloudinary');

// Configure Cloudinary with environment variables
// The Cloudinary SDK automatically parses CLOUDINARY_URL if it exists
let cloudinaryConfigured = false;

if (process.env.CLOUDINARY_URL) {
  // Option 1: Render / Deployment style (single URL)
  // SDK auto-configures from CLOUDINARY_URL env var - DO NOT override with config()
  // Just verify it's set
  cloudinaryConfigured = true;
  console.log('✅ Cloudinary configured via CLOUDINARY_URL');
  console.log('   Cloud name:', cloudinary.config().cloud_name || 'auto-detected');
} else if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  // Option 2: Separate variables (local development)
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  cloudinaryConfigured = true;
  console.log('✅ Cloudinary configured via separate keys');
  console.log('   Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
} else {
  console.warn('⚠️  Cloudinary environment variables not set. Photo uploads will fail.');
  console.warn('   Required: CLOUDINARY_URL or (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
}

// Configure Multer with memory storage (NO disk storage for Render)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 30 // Max 30 files per request
  }
});

// Helper: Upload buffer to Cloudinary
const uploadToCloudinary = (buffer) => {
  if (!cloudinaryConfigured) {
    return Promise.reject(new Error('Cloudinary is not configured. Check environment variables.'));
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'stavbahub_providers',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

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
    const allowed = ['name', 'categories', 'city', 'description', 'active', 'phone', 'region', 'website', 'profilePhoto', 'workPhotos'];
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

// UPLOAD WORK PHOTOS (dedicated endpoint)
router.post('/me/work-photos', auth('provider'), upload.array('workPhotos', 30), async (req, res) => {
  try {
    console.log('Work photos upload request received');
    console.log('Files:', req.files ? req.files.length : 0);

    // Get current provider
    const provider = await Provider.findOne({ userId: req.user.id });
    if (!provider) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }

    // Check plan limits
    const currentPlan = (provider.plan || 'basic').toLowerCase();
    let maxPhotos = 0;
    if (currentPlan === 'pro') maxPhotos = 3;
    else if (['pro+', 'proplus', 'pro_plus'].includes(currentPlan)) maxPhotos = 30;

    console.log('Current plan:', currentPlan, 'Max photos:', maxPhotos);

    if (maxPhotos === 0) {
      return res.status(403).json({
        message: 'Nahrávanie fotografií je dostupné iba pre plány PRO a PRO+. Upgradujte svoj plán.'
      });
    }

    // Check current photo count
    const currentPhotoCount = (provider.workPhotos || []).length;
    const availableSlots = maxPhotos - currentPhotoCount;

    console.log('Current photos:', currentPhotoCount, 'Available slots:', availableSlots);

    if (availableSlots <= 0) {
      return res.status(400).json({
        message: `Dosiahli ste limit ${maxPhotos} fotografií pre váš plán. Odstráňte existujúce fotografie alebo upgradujte plán.`
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Žiadne súbory neboli nahrané' });
    }

    // Limit to available slots
    const filesToUpload = req.files.slice(0, availableSlots);
    console.log('Uploading', filesToUpload.length, 'files to Cloudinary');

    // Upload to Cloudinary
    const uploadedUrls = [];
    for (const file of filesToUpload) {
      try {
        const result = await uploadToCloudinary(file.buffer);
        uploadedUrls.push(result.secure_url);
        console.log('Uploaded:', result.secure_url);
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({
          message: 'Chyba pri nahrávaní do Cloudinary: ' + uploadError.message
        });
      }
    }

    // Add to provider's workPhotos
    const updatedWorkPhotos = [...(provider.workPhotos || []), ...uploadedUrls];
    provider.workPhotos = updatedWorkPhotos;
    await provider.save();

    console.log('Successfully saved', uploadedUrls.length, 'photos. Total:', updatedWorkPhotos.length);

    return res.json({
      message: `Úspešne nahraných ${uploadedUrls.length} fotografií`,
      workPhotos: updatedWorkPhotos,
      uploaded: uploadedUrls
    });

  } catch (e) {
    console.error('Work photos upload error:', e);
    return res.status(500).json({ message: 'Server error: ' + e.message });
  }
});


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

    // Protect critical fields - Plan should NOT be updated via profile edit
    // Plan changes must go through specific endpoints or payment flows
    delete updates.plan;

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