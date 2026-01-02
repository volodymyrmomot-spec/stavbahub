const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

/*
 * ROOT — проверка, что роут вообще работает
 * GET /api/test
 */
router.get('/', (req, res) => {
  res.json({ ok: true, message: 'Test route works ✅' });
});

/*
 * PUBLIC — без токена
 * GET /api/test/public
 */
router.get('/public', (req, res) => {
  res.json({ ok: true, message: 'Public route works ✅' });
});

/*
 * PRIVATE — любой залогиненный пользователь
 * GET /api/test/private
 */
router.get('/private', auth(), (req, res) => {
  res.json({
    ok: true,
    message: 'Private route works ✅',
    user: req.user
  });
});

/*
 * PROVIDER ONLY — только role === 'provider'
 * GET /api/test/provider-only
 */
router.get('/provider-only', auth('provider'), (req, res) => {
  res.json({
    ok: true,
    message: 'Provider-only route works ✅',
    user: req.user
  });
});

module.exports = router;