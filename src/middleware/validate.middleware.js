'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Validates request data against a Joi schema.
 * @param {Object} schemas - { body, params, query }
 */
const validate = (schemas) => (req, _res, next) => {
  const errors = [];

  ['body', 'params', 'query'].forEach((key) => {
    if (!schemas[key]) return;
    const { error, value } = schemas[key].validate(req[key], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      error.details.forEach((detail) => {
        errors.push({
          field: detail.path.join('.') || key,
          message: detail.message,
        });
      });
    } else {
      req[key] = value;
    }
  });

  if (errors.length > 0) {
    return next(ApiError.unprocessable('Validation failed', errors));
  }
  return next();
};

module.exports = validate;