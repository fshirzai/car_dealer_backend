'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { createTestVehicle, createTestUser } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const {
  USER_ROLES,
  EXPENSE_CATEGORY,
  VEHICLE_STATUS,
} = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const base = `${env.apiPrefix}/vehicle-expenses`;

const makeStaffToken = async (role = USER_ROLES.ADMIN) => {
  const { user } = await createTestUser({ role });
  return { token: generateToken(user), user };
};

describe('VehicleExpense Routes (integration)', () => {
  describe('Auth gate', () => {
    it('should 401 without token', async () => {
      const res = await request(app).get(base);
      expect(res.status).toBe(401);
    });

    it('should 403 for CUSTOMER', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.CUSTOMER });
      const token = generateToken(user);
      const res = await request(app).get(base).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /vehicle-expenses', () => {
    it('should create an expense', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle();

      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
          category: EXPENSE_CATEGORY.REPAIR,
          description: 'Brake pads', // ✅ ≥ 2 chars
          amount: 300,
        });
      expect(res.status).toBe(201);
    });

    it('should 400 for SOLD vehicle', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle({ status: VEHICLE_STATUS.SOLD });
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
          category: EXPENSE_CATEGORY.REPAIR,
          description: 'Brake pads',
          amount: 300,
        });
      expect(res.status).toBe(400);
    });

    it('should 422 for missing fields', async () => {
      const { token } = await makeStaffToken();
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(422);
    });
  });

  describe('GET /vehicle-expenses/by-vehicle/:vehicleId', () => {
    it('should list expenses for a vehicle', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle();
      await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
          category: EXPENSE_CATEGORY.REPAIR,
          description: 'Brake pads', // ✅ ≥ 2
          amount: 300,
        });

      const res = await request(app)
        .get(`${base}/by-vehicle/${vehicle.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /vehicle-expenses/by-vehicle/:vehicleId/summary', () => {
    it('should return totals', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle();

      // ✅ Fix: use descriptions with ≥ 2 characters
      await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
          category: EXPENSE_CATEGORY.REPAIR,
          description: 'Brake pads',
          amount: 100,
        });
      await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
          category: EXPENSE_CATEGORY.TRANSPORT,
          description: 'Transport fee',
          amount: 200,
        });

      const res = await request(app)
        .get(`${base}/by-vehicle/${vehicle.id}/summary`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(300);
    });

    it('should return 0 for a vehicle with no expenses', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle();

      const res = await request(app)
        .get(`${base}/by-vehicle/${vehicle.id}/summary`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
    });
  });

  describe('DELETE /vehicle-expenses/:id', () => {
    it('should allow ADMIN', async () => {
      const { token } = await makeStaffToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();

      // ✅ Fix: ensure POST succeeds before reading its id
      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
          category: EXPENSE_CATEGORY.REPAIR,
          description: 'Brake pads',
          amount: 100,
        });

      expect(created.status).toBe(201);
      expect(created.body.data).toBeDefined();

      const res = await request(app)
        .delete(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should 403 for SELLER', async () => {
      const { token } = await makeStaffToken(USER_ROLES.SELLER);
      const { vehicle } = await createTestVehicle();

      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
          category: EXPENSE_CATEGORY.REPAIR,
          description: 'Brake pads',
          amount: 100,
        });

      expect(created.status).toBe(201);
      expect(created.body.data).toBeDefined();

      const res = await request(app)
        .delete(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
});