'use strict';

const { generateStockNumber, Counter } = require('../vehicle.utils');
const Vehicle = require('../vehicle.model');
const { createTestVehicle } = require('../../../../tests/helpers/factories');

describe('Vehicle Utils', () => {
  describe('generateStockNumber', () => {
    it('should produce a stock number with the STK-YYYYMM-#### format', async () => {
      const sn = await generateStockNumber();
      expect(sn).toMatch(/^STK-\d{6}-\d{4}$/);
    });

    it('should increment the sequence on each call', async () => {
      const first = await generateStockNumber();
      const second = await generateStockNumber();

      const firstSeq = parseInt(first.split('-')[2], 10);
      const secondSeq = parseInt(second.split('-')[2], 10);
      expect(secondSeq).toBe(firstSeq + 1);
    });

    it('should return unique numbers when called concurrently (atomic)', async () => {
      // Fire 10 concurrent calls — all must be unique
      const results = await Promise.all(
        Array.from({ length: 10 }, () => generateStockNumber())
      );

      const set = new Set(results);
      expect(set.size).toBe(results.length);
      expect(results.every((r) => /^STK-\d{6}-\d{4}$/.test(r))).toBe(true);
    });

    it('should create a counter document for the current bucket', async () => {
      await generateStockNumber();
      const count = await Counter.countDocuments();
      expect(count).toBe(1);
    });

    it('should not collide with already-persisted vehicles', async () => {
      // Persist a couple of vehicles first
      await createTestVehicle();
      await createTestVehicle();

      const first = await generateStockNumber();
      const second = await generateStockNumber();

      const existing = await Vehicle.find({
        stockNumber: { $in: [first, second] },
      });
      expect(existing).toHaveLength(0);
    });
  });
});