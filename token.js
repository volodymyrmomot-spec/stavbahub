require('dotenv').config();
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET; // берём из .env

if (!secret) {
  console.log('JWT_SECRET is missing in .env');
  process.exit(1);
}

const token = jwt.sign(
  { id: '123', role: 'admin', email: 'test@test.com' },
  secret,
  { expiresIn: '1h' }
);

console.log(token);