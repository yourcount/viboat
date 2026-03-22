'use strict';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function allowOptions(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}

function sendJson(res, status, payload) {
  setCors(res);
  res.status(status).json(payload);
}

function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, {
    success: false,
    error: 'Method not allowed.',
  });
}

module.exports = {
  allowOptions,
  methodNotAllowed,
  sendJson,
  setCors,
};
