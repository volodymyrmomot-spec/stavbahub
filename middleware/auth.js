const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

module.exports = function auth(requiredRole = null) {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization;

      if (!header) {
        return res.status(401).json({ error: 'No authorization header' });
      }

      const token = header.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      req.user = {
        id: decoded.id || decoded.userId,
        _id: new mongoose.Types.ObjectId(decoded.id || decoded.userId),
        role: decoded.role,
      };
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};