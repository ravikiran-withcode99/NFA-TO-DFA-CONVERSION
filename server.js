/**
 * server.js — Express backend
 * Endpoint: POST /convert
 */

const express = require('express');
const cors = require('cors');
const { convertRegex } = require('./nfa');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// POST /convert
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

app.listen(PORT, () => {
  console.log(`\n✅  NFA backend running at http://localhost:${PORT}\n`);
});
