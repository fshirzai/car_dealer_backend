'use strict';

/**
 * Creates a snapshot of the given fields from a source object.
 * Used to persist immutable copies of referenced data (e.g., vehicle info on OrderItem).
 */
const createSnapshot = (source, fields) => {
  if (!source) return {};
  return fields.reduce((acc, field) => {
    if (source[field] !== undefined) acc[field] = source[field];
    return acc;
  }, {});
};

module.exports = { createSnapshot };