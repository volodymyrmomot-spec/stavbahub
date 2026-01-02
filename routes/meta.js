const express = require('express');
const router = express.Router();
const Provider = require('../models/Provider');

// GET unique categories from active providers
router.get('/categories', async (req, res) => {
  try {
    const categories = await Provider.distinct('categories', { active: true });
    categories.sort((a, b) => a.localeCompare(b, 'sk'));
    res.json(categories);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET unique cities from active providers
router.get('/cities', async (req, res) => {
  try {
    const cities = await Provider.distinct('city', { active: true });
    cities.sort((a, b) => a.localeCompare(b, 'sk'));
    res.json(cities);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/filters', async (req, res) => {
  try {
    const [categories, cities] = await Promise.all([
      Provider.distinct('categories', { active: true }),
      Provider.distinct('city', { active: true })
    ]);

    categories.sort((a, b) => a.localeCompare(b, 'sk'));
    cities.sort((a, b) => a.localeCompare(b, 'sk'));

    res.json({ categories, cities });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;