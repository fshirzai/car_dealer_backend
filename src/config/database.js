'use strict';

const mongoose = require('mongoose');
const logger = require('./logger');
const env = require('./env');

mongoose.set('strictQuery', true);

const connectDB = async (uri = env.mongodbUri) => {
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: !env.isProduction,
      serverSelectionTimeoutMS: 10000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected');
};

module.exports = { connectDB, disconnectDB };