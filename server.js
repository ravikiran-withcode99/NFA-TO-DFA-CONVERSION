/**
 * server.js — Express backend + static file server
 * API Endpoint: POST /convert
 * Serves: index.html, login.html, and all static assets
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { convertRegex } = require('./nfa');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve all static files (css, js, html, etc.) from project root
app.use(express.static(path.join(__dirname)));

// ── API ROUTES ────────────────────────────────────────────────

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
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ── FALLBACK: serve login.html for unknown routes ─────────────
app.get('*', (req, res) => {
  // If requesting a file with extension, let static middleware handle it
  if (path.extname(req.path)) {
    return res.status(404).send('File not found');
  }
  // Default: serve login page
  res.sendFile(path.join(__dirname, 'login.html'));
});

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  NFA backend running at http://localhost:${PORT}\n`);
});

module.exports = app;
