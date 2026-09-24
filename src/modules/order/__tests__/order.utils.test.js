'use strict';

const { generateOrderNumber, Counter } = require('../order.utils');

describe('Order Utils', () => {
  describe('generateOrderNumber', () => {
    it('should produce a number with ORD-YYYYMM-#### format', async () => {
      const num = await generateOrderNumber();
      expect(num).toMatch(/^ORD-\d{6}-\d{4}$/);
    });

    it('should increment the sequence on each call', async () => {
      const first = await generateOrderNumber();
      const second = await generateOrderNumber();
      const firstSeq = parseInt(first.split('-')[2], 10);
      const secondSeq = parseInt(second.split('-')[2], 10);
      expect(secondSeq).toBe(firstSeq + 1);
    });

    it('should return unique numbers under concurrent calls', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => generateOrderNumber())
      );
      expect(new Set(results).size).toBe(results.length);
    });

    it('should create a counter document for the current bucket', async () => {
      await generateOrderNumber();
      const count = await Counter.countDocuments();
      expect(count).toBe(1);
    });
  });
});