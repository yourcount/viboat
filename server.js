'use strict';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3001;
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const MAX_BOOKINGS_PER_DAY = 3;

const PACKAGES = [
  {
    id: 'bridal-vip',
    name: 'Bridal VIP',
    pricePerPerson: 69,
    description:
      'De koninklijke behandeling voor de aanstaande bruid. Inclusief onbeperkt prosecco en een vibe die niemand vergeet.',
    minPersons: 6,
    maxPersons: 12,
  },
  {
    id: 'bubbels-bites',
    name: 'Bubbels & Bites',
    pricePerPerson: 45,
    description:
      'Voor de fijnproevers die houden van een luxe borrel. IJskoude rosé en een plank vol lekkernijen langs de Oudegracht.',
    minPersons: 4,
    maxPersons: 12,
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    pricePerPerson: 55,
    description:
      'De ultieme Instagram-shoot tijdens de zonsondergang. Perfect licht, koude drankjes en een feed die ontploft.',
    minPersons: 4,
    maxPersons: 12,
  },
];

const VALID_PACKAGE_IDS = PACKAGES.map((p) => p.id);

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function loadBookings() {
  if (!fs.existsSync(BOOKINGS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

function isNotInPast(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const booking = new Date(dateStr);
  return booking >= today;
}

function validateBookingBody(body) {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    errors.push('name: verplicht, minimaal 2 tekens.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!body.email || !emailRegex.test(body.email)) {
    errors.push('email: geldig e-mailadres verplicht.');
  }

  if (!body.date || !isValidDate(body.date)) {
    errors.push('date: verplicht in formaat YYYY-MM-DD.');
  } else if (!isNotInPast(body.date)) {
    errors.push('date: datum mag niet in het verleden liggen.');
  }

  if (!body.package || !VALID_PACKAGE_IDS.includes(body.package)) {
    errors.push(`package: verplicht, kies uit ${VALID_PACKAGE_IDS.join(', ')}.`);
  }

  const persons = parseInt(body.persons, 10);
  if (!body.persons || isNaN(persons) || persons < 1 || persons > 12) {
    errors.push('persons: verplicht, getal tussen 1 en 12.');
  }

  return errors;
}

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
app.use(express.static(__dirname));

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

  const bookings = loadBookings();
  const bookingsOnDate = bookings.filter((b) => b.date === date);
  const slotsUsed = bookingsOnDate.length;
  const slotsAvailable = Math.max(0, MAX_BOOKINGS_PER_DAY - slotsUsed);

  res.json({
    success: true,
    data: {
      date,
      available: slotsAvailable > 0,
      slotsAvailable,
      slotsTotal: MAX_BOOKINGS_PER_DAY,
      slotsUsed,
    },
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
  const errors = validateBookingBody(req.body);
  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      errors,
    });
  }

  const bookings = loadBookings();

  // Availability check
  const bookingsOnDate = bookings.filter((b) => b.date === req.body.date);
  if (bookingsOnDate.length >= MAX_BOOKINGS_PER_DAY) {
    return res.status(409).json({
      success: false,
      error: `Geen beschikbaarheid meer op ${req.body.date}. Kies een andere datum.`,
    });
  }

  // Resolve package details for price calculation
  const selectedPackage = PACKAGES.find((p) => p.id === req.body.package);
  const persons = parseInt(req.body.persons, 10);
  const totalPrice = selectedPackage.pricePerPerson * persons;

  const booking = {
    id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: req.body.name.trim(),
    email: req.body.email.toLowerCase().trim(),
    date: req.body.date,
    package: req.body.package,
    packageName: selectedPackage.name,
    persons,
    pricePerPerson: selectedPackage.pricePerPerson,
    totalPrice,
    notes: typeof req.body.notes === 'string' ? req.body.notes.trim() : '',
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  bookings.push(booking);
  saveBookings(bookings);

  res.status(201).json({
    success: true,
    message: 'Boeking aanvraag ontvangen! We nemen zo snel mogelijk contact met je op.',
    data: {
      id: booking.id,
      name: booking.name,
      date: booking.date,
      packageName: booking.packageName,
      persons: booking.persons,
      totalPrice: booking.totalPrice,
      status: booking.status,
    },
  });
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
  console.log(`Boekingen worden opgeslagen in: ${BOOKINGS_FILE}`);
});

module.exports = app; // voor testdoeleinden
