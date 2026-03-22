'use strict';

const { getAvailability, isValidDate } = require('../lib/bookings');
const { allowOptions, methodNotAllowed, sendJson } = require('../lib/api-response');

module.exports = (req, res) => {
  if (allowOptions(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET', 'OPTIONS']);
    return;
  }

  const { date } = req.query;

  if (!date || !isValidDate(date)) {
    sendJson(res, 400, {
      success: false,
      error: 'Ongeldige of ontbrekende date parameter. Gebruik formaat YYYY-MM-DD.',
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    data: getAvailability(date),
  });
};
