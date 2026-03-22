'use strict';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { PACKAGES, createBooking, getAvailability, getStorageFile, isValidDate } = require('../lib/bookings');

const PORT = process.env.PORT || 3001;
const ROOT_DIR = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(ROOT_DIR));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/packages
 * Geeft alle beschikbare pakketten terug inclusief prijs en details.
 */
app.get('/api/packages', (req, res) => {
  res.json({
    success: true,
    data: PACKAGES,
  });
});

/**
 * GET /api/availability?date=YYYY-MM-DD
 * Controleert of er nog ruimte is op de gevraagde datum.
 * Maximaal MAX_BOOKINGS_PER_DAY boekingen per dag.
 */
app.get('/api/availability', (req, res) => {
  const { date } = req.query;

  if (!date || !isValidDate(date)) {
    return res.status(400).json({
      success: false,
      error: 'Ongeldige of ontbrekende date parameter. Gebruik formaat YYYY-MM-DD.',
    });
  }

  res.json({
    success: true,
    data: getAvailability(date),
  });
});

/**
 * POST /api/booking
 * Slaat een nieuwe boeking op.
 *
 * Body (JSON):
 *   name        string  — volledige naam
 *   email       string  — e-mailadres
 *   date        string  — datum YYYY-MM-DD
 *   package     string  — pakket-id (bridal-vip | bubbels-bites | golden-hour)
 *   persons     number  — aantal personen
 *   notes       string  — optionele opmerkingen
 */
app.post('/api/booking', (req, res) => {
  const result = createBooking(req.body || {});
  res.status(result.status).json(result.payload);
});

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route niet gevonden.' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, error: 'Interne serverfout.' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Domstadboot API draait op http://localhost:${PORT}`);
  console.log(`Boekingen worden opgeslagen in: ${getStorageFile()}`);
});

module.exports = app; // voor testdoeleinden
