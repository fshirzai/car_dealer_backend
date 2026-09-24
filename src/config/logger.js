'use strict';

const winston = require('winston');
const env = require('./env');

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };

const logger = winston.createLogger({
  level: env.logLevel,
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: env.isProduction
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, stack }) =>
                `${timestamp} [${level}]: ${stack || message}`
            )
          ),
    }),
  ],
});

logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;