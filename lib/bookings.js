'use strict';

const fs = require('fs');
const path = require('path');

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
      'Voor de fijnproevers die houden van een luxe borrel. IJskoude rose en een plank vol lekkernijen langs de Oudegracht.',
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

const VALID_PACKAGE_IDS = PACKAGES.map((pkg) => pkg.id);

function getStorageFile() {
  if (process.env.VERCEL) {
    return path.join('/tmp', 'domstadboot-bookings.json');
  }
  return path.join(__dirname, '..', 'bookings.json');
}

function loadBookings() {
  const bookingsFile = getStorageFile();

  if (!fs.existsSync(bookingsFile)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(bookingsFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  const bookingsFile = getStorageFile();
  fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2), 'utf8');
}

function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  const parsed = new Date(dateStr);
  return !Number.isNaN(parsed.getTime());
}

function isNotInPast(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookingDate = new Date(dateStr);
  return bookingDate >= today;
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
  if (!body.persons || Number.isNaN(persons) || persons < 1 || persons > 12) {
    errors.push('persons: verplicht, getal tussen 1 en 12.');
  }

  return errors;
}

function getAvailability(date) {
  const bookings = loadBookings();
  const bookingsOnDate = bookings.filter((booking) => booking.date === date);
  const slotsUsed = bookingsOnDate.length;
  const slotsAvailable = Math.max(0, MAX_BOOKINGS_PER_DAY - slotsUsed);

  return {
    date,
    available: slotsAvailable > 0,
    slotsAvailable,
    slotsTotal: MAX_BOOKINGS_PER_DAY,
    slotsUsed,
  };
}

function createBooking(body) {
  const errors = validateBookingBody(body);
  if (errors.length > 0) {
    return {
      ok: false,
      status: 422,
      payload: {
        success: false,
        errors,
      },
    };
  }

  const availability = getAvailability(body.date);
  if (!availability.available) {
    return {
      ok: false,
      status: 409,
      payload: {
        success: false,
        error: `Geen beschikbaarheid meer op ${body.date}. Kies een andere datum.`,
      },
    };
  }

  const bookings = loadBookings();
  const selectedPackage = PACKAGES.find((pkg) => pkg.id === body.package);
  const persons = parseInt(body.persons, 10);
  const totalPrice = selectedPackage.pricePerPerson * persons;

  const booking = {
    id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: body.name.trim(),
    email: body.email.toLowerCase().trim(),
    date: body.date,
    package: body.package,
    packageName: selectedPackage.name,
    persons,
    pricePerPerson: selectedPackage.pricePerPerson,
    totalPrice,
    notes: typeof body.notes === 'string' ? body.notes.trim() : '',
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  bookings.push(booking);
  saveBookings(bookings);

  return {
    ok: true,
    status: 201,
    payload: {
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
    },
  };
}

module.exports = {
  MAX_BOOKINGS_PER_DAY,
  PACKAGES,
  VALID_PACKAGE_IDS,
  createBooking,
  getAvailability,
  getStorageFile,
  isNotInPast,
  isValidDate,
  loadBookings,
  saveBookings,
  validateBookingBody,
};
