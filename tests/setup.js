'use strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/car_dealership_test';

const mongoose = require('mongoose');

const TEST_DB_URI = process.env.TEST_MONGODB_URI;

beforeAll(async () => {
  try {
    await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `\n❌ Could not connect to test MongoDB at ${TEST_DB_URI}\n` +
        `   Make sure MongoDB is running locally.\n` +
        `   Original error: ${err.message}\n`
    );
    throw err;
  }
});

afterEach(async () => {
  // Clean ALL collections, including stock_counters
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({}))
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});