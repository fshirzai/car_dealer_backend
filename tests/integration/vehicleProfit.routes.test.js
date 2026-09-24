'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const {
  createTestVehicle,
  createTestUser,
  createTestSeller,
  createTestPurchase,
  createTestSale,
  createTestVehicleExpense,
} = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const {
  USER_ROLES,
  EXPENSE_CATEGORY,
  SALE_CHANNEL,
} = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const base = `${env.apiPrefix}/vehicles/staff`;

const makeStaffToken = async (role = USER_ROLES.ADMIN) => {
  const { user } = await createTestUser({ role });
  return { token: generateToken(user), user };
};

describe('Vehicle Profit Routes (integration)', () => {
  describe('GET /vehicles/staff/:id/profit', () => {
    it('should return profit for a sold vehicle', async () => {
      const { token, user: staff } = await makeStaffToken();
      const { vehicle } = await createTestVehicle({ purchasePrice: 10000, isPublished: true });
      const { seller } = await createTestSeller();

      await createTestPurchase({
        vehicle,
        seller,
        createdById: staff.id,
        purchasePrice: 10000,
      });
      await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
        category: EXPENSE_CATEGORY.TRANSPORT,
        amount: 300,
      });
      await createTestSale({
        vehicle,
        createdById: staff.id,
        salePrice: 13000,
        channel: SALE_CHANNEL.OFFLINE,
      });

      const res = await request(app)
        .get(`${base}/${vehicle.id}/profit`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalCost).toBe(10300);
      expect(res.body.data.salePrice).toBe(13000);
      expect(res.body.data.grossProfit).toBe(2700);
    });

    it('should 401 without token', async () => {
      const { vehicle } = await createTestVehicle();
      const res = await request(app).get(`${base}/${vehicle.id}/profit`);
      expect(res.status).toBe(401);
    });

    it('should 403 for CUSTOMER', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.CUSTOMER });
      const token = generateToken(user);
      const { vehicle } = await createTestVehicle();
      const res = await request(app)
        .get(`${base}/${vehicle.id}/profit`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should 404 for unknown vehicle', async () => {
      const { token } = await makeStaffToken();
      const res = await request(app)
        .get(`${base}/507f1f77bcf86cd799439011/profit`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /vehicles/staff/report', () => {
    it('should return the profit report', async () => {
      const { token, user: staff } = await makeStaffToken();
      const { vehicle } = await createTestVehicle({ purchasePrice: 10000, isPublished: true });
      const { seller } = await createTestSeller();

      await createTestPurchase({
        vehicle,
        seller,
        createdById: staff.id,
        purchasePrice: 10000,
      });
      await createTestSale({
        vehicle,
        createdById: staff.id,
        salePrice: 12000,
      });

      const res = await request(app)
        .get(`${base}/report`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totals.count).toBe(1);
      expect(res.body.data.totals.totalGrossProfit).toBe(2000);
    });

    it('should return zero totals when no sales', async () => {
      const { token } = await makeStaffToken();
      const res = await request(app)
        .get(`${base}/report`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totals.count).toBe(0);
    });
  });
});