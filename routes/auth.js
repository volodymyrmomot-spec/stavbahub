const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

/**
 * Создание JWT
 */
function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * =====================
 * REGISTER
 * POST /api/auth/register
 * =====================
 */
router.post('/register', async (req, res) => {
  try {
    let { email, password, name = '', role = 'customer' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    // 🔐 нормализация email
    email = email.toLowerCase().trim();

    // проверка существования
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: 'user already exists' });
    }

    // хеш пароля
    const passwordHash = await bcrypt.hash(password, 10);

    // создание пользователя
    const user = await User.create({
      email,
      passwordHash,
      name,
      role,
    });

    const token = signToken(user);

    return res.status(201).json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (e) {
    console.error('REGISTER ERROR:', e);

    // защита от дубля из MongoDB
    if (e.code === 11000) {
      return res.status(409).json({ error: 'user already exists' });
    }

    return res.status(500).json({ error: e.message });
  }
});

/**
 * =====================
 * LOGIN
 * POST /api/auth/login
 * =====================
 */
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const token = signToken(user);

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (e) {
    console.error('LOGIN ERROR:', e);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;