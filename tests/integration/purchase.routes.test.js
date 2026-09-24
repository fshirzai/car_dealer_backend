'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const {
  createTestVehicle,
  createTestSeller,
  createTestUser,
} = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const {
  USER_ROLES,
  PAYMENT_STATUS,
} = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const base = `${env.apiPrefix}/purchases`;

const makeStaffToken = async (role = USER_ROLES.ADMIN) => {
  const { user } = await createTestUser({ role });
  return { token: generateToken(user), user };
};

describe('Purchase Routes (integration)', () => {
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

  describe('POST /purchases', () => {
    it('should create a purchase', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();

      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
          sellerId: seller.id,
          purchasePrice: 9500,
          paymentStatus: PAYMENT_STATUS.PAID,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.purchaseNumber).toMatch(/^PUR-/);
    });

    it('should 409 on duplicate purchase for the same vehicle', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();
      const payload = { vehicleId: vehicle.id, sellerId: seller.id, purchasePrice: 9000 };

      await request(app).post(base).set('Authorization', `Bearer ${token}`).send(payload);
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      expect(res.status).toBe(409);
    });

    it('should 422 on missing required fields', async () => {
      const { token } = await makeStaffToken();
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ purchasePrice: 9000 });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /purchases', () => {
    it('should list purchases', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();
      await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id, sellerId: seller.id, purchasePrice: 9000 });

      const res = await request(app).get(base).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /purchases/:id', () => {
    it('should update', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();
      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id, sellerId: seller.id, purchasePrice: 9000 });

      const res = await request(app)
        .patch(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ purchasePrice: 8500 });
      expect(res.status).toBe(200);
      expect(res.body.data.purchasePrice).toBe(8500);
    });
  });

  describe('DELETE /purchases/:id', () => {
    it('should allow ADMIN', async () => {
      const { token } = await makeStaffToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();
      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id, sellerId: seller.id, purchasePrice: 9000 });

      const res = await request(app)
        .delete(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should 403 for SELLER', async () => {
      const { token } = await makeStaffToken(USER_ROLES.SELLER);
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();
      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id, sellerId: seller.id, purchasePrice: 9000 });

      const res = await request(app)
        .delete(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
});