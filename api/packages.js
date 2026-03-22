'use strict';

const { PACKAGES } = require('../lib/bookings');
const { allowOptions, methodNotAllowed, sendJson } = require('../lib/api-response');

module.exports = (req, res) => {
  if (allowOptions(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET', 'OPTIONS']);
    return;
  }

  sendJson(res, 200, {
    success: true,
    data: PACKAGES,
  });
};
