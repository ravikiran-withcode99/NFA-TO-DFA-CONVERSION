/**
 * server.js — Unified backend
 *  - NFA conversion:  POST /convert
 *  - Auth API:        POST /api/auth/register
 *                     POST /api/auth/login
 *                     POST /api/auth/google
 *  - Static files:    serves all HTML/CSS/JS from project root
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { convertRegex } = require('./nfa');

const app  = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'nfa_super_secret_key_2024';

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve all static files (css, js, html, etc.) from project root
app.use(express.static(path.join(__dirname)));

// ── IN-MEMORY USER STORE ──────────────────────────────────────
// (No MongoDB required — data lives in memory while server runs)
const users = [];

function findUserByEmail(email) {
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── AUTH ROUTES ───────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (!/\d/.test(password)) {
      return res.status(400).json({ success: false, message: 'Password must contain at least one number.' });
    }
    if (findUserByEmail(email)) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPw = await bcrypt.hash(password, 12);
    const user = { id: Date.now().toString(), name, email, password: hashedPw, provider: 'local' };
    users.push(user);

    const token = createToken(user);
    res.status(201).json({
      success: true,
      token,
      user: { name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = findUserByEmail(email);
    if (!user || user.provider === 'google') {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = createToken(user);
    res.json({
      success: true,
      token,
      user: { name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// POST /api/auth/google
app.post('/api/auth/google', async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ success: false, message: 'Invalid Google credentials.' });
    }

    let user = findUserByEmail(email);
    if (!user) {
      // Auto-register Google user
      user = { id: googleId, name, email, password: null, provider: 'google', picture };
      users.push(user);
    }

    const token = createToken(user);
    res.json({
      success: true,
      token,
      user: { name: user.name, email: user.email, picture: user.picture || null }
    });
  } catch (err) {
    console.error('[google]', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── NFA CONVERSION ────────────────────────────────────────────

// POST /convert — NFA conversion
app.post('/convert', (req, res) => {
  const { regex } = req.body;

  if (typeof regex !== 'string') {
    return res.status(400).json({ error: 'Invalid request: regex must be a string' });
  }

  try {
    const result = convertRegex(regex.trim());
    res.json(result);
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', port: PORT }));

// ── FALLBACK: serve login.html for unknown routes ─────────────
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).send('File not found');
  }
  res.sendFile(path.join(__dirname, 'login.html'));
});

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Server running at http://localhost:${PORT}\n`);
});

module.exports = app;
