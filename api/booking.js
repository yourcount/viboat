'use strict';

const { createBooking } = require('../lib/bookings');
const { allowOptions, methodNotAllowed, sendJson } = require('../lib/api-response');

module.exports = (req, res) => {
  if (allowOptions(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST', 'OPTIONS']);
    return;
  }

  const result = createBooking(req.body || {});
  sendJson(res, result.status, result.payload);
};
