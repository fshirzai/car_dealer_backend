'use strict';

const jwt = require('jsonwebtoken');
const env = require('../../src/config/env');

const generateToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

module.exports = { generateToken };