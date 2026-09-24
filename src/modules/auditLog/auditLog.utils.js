'use strict';

const AuditLog = require('./auditLog.model');
const logger = require('../../config/logger');
const { SENSITIVE_FIELDS } = require('./auditLog.constants');

/**
 * Deeply strip any sensitive keys from an object. Never throws.
 * Returns a plain object suitable for storing in Mongo's Mixed type.
 */
const stripSensitive = (input, seen = new WeakSet()) => {
  if (input === null || input === undefined) return input;

  // Handle ObjectId / Buffer / Date — pass through untouched
  if (typeof input !== 'object') return input;
  if (input instanceof Date) return input;
  if (Buffer.isBuffer(input)) return input;
  if (
    typeof input === 'object' &&
    input._bsontype === 'ObjectID'
  ) {
    return input.toString();
  }
  // Mongoose ObjectId
  if (input.constructor && input.constructor.name === 'ObjectId') {
    return input.toString();
  }

  if (seen.has(input)) return '[Circular]';
  seen.add(input);

  if (Array.isArray(input)) {
    return input.map((v) => stripSensitive(v, seen));
  }

  const out = {};
  Object.keys(input).forEach((key) => {
    if (SENSITIVE_FIELDS.includes(key)) return;
    out[key] = stripSensitive(input[key], seen);
  });
  return out;
};

/**
 * Fire-and-forget audit log emit.
 * Never throws — logs the error instead, so business logic never fails
 * because of an audit failure.
 *
 * @param {object} opts
 * @param {string} opts.action
 * @param {string} opts.entityType
 * @param {string|ObjectId} [opts.entityId]
 * @param {string|ObjectId} [opts.userId]
 * @param {string} [opts.description]
 * @param {object} [opts.oldValues]
 * @param {object} [opts.newValues]
 * @param {string} [opts.ipAddress]
 * @param {string} [opts.userAgent]
 */
const emit = async (opts) => {
  try {
    const {
      action,
      entityType,
      entityId = null,
      userId = null,
      description = null,
      oldValues = null,
      newValues = null,
      ipAddress = null,
      userAgent = null,
    } = opts || {};

    if (!action || !entityType) return null;

    await AuditLog.create({
      userId: userId || null,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      description,
      oldValues: oldValues ? stripSensitive(oldValues) : null,
      newValues: newValues ? stripSensitive(newValues) : null,
      ipAddress,
      userAgent,
    });
    return true;
  } catch (err) {
    // Never fail the caller because of an audit failure
    logger.warn(`AuditLog emit failed: ${err.message}`);
    return false;
  }
};

module.exports = { emit, stripSensitive };