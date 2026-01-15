require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/test');
const protectedRoutes = require('./routes/protected');
const providerRoutes = require('./routes/providers');
const metaRoutes = require('./routes/meta');
const messageRoutes = require('./routes/messages');

const app = express();

// middleware
app.use(express.json());

// serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/messages', messageRoutes);

// frontend fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});