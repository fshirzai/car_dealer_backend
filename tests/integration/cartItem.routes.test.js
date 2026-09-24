'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { createTestUser, createTestVehicle } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const { USER_ROLES, VEHICLE_STATUS } = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const base = `${env.apiPrefix}/cart`;

const makeToken = async (role = USER_ROLES.CUSTOMER) => {
  const { user } = await createTestUser({ role });
  return { token: generateToken(user), user };
};

const addable = () => ({ isPublished: true, status: VEHICLE_STATUS.AVAILABLE });

describe('CartItem Routes (integration)', () => {
  describe('Auth gate', () => {
    it('should 401 without token', async () => {
      const res = await request(app).get(base);
      expect(res.status).toBe(401);
    });

    it('should 403 for SELLER', async () => {
      const { token } = await makeToken(USER_ROLES.SELLER);
      const res = await request(app).get(base).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /cart', () => {
    it('should add to cart', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle(addable());
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });
      expect(res.status).toBe(201);
    });

    it('should 400 for unpublished', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle({ isPublished: false });
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });
      expect(res.status).toBe(400);
    });

    it('should 400 for RESERVED', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle({
        isPublished: true,
        status: VEHICLE_STATUS.RESERVED,
      });
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });
      expect(res.status).toBe(400);
    });

    it('should 400 for SOLD', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle({
        isPublished: true,
        status: VEHICLE_STATUS.SOLD,
      });
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });
      expect(res.status).toBe(400);
    });

    it('should 422 on missing vehicleId', async () => {
      const { token } = await makeToken();
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(422);
    });
  });

  describe('GET /cart', () => {
    it('should list the user cart', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle(addable());
      await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });

      const res = await request(app)
        .get(base)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
    });
  });

  describe('GET /cart/count', () => {
    it('should return item count', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle(addable());
      await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });

      const res = await request(app)
        .get(`${base}/count`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(1);
    });
  });

  describe('DELETE /cart', () => {
    it('should remove by vehicleId', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle(addable());
      await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });

      const res = await request(app)
        .delete(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /cart/clear', () => {
    it('should clear the cart', async () => {
      const { token } = await makeToken();
      const { vehicle: v1 } = await createTestVehicle(addable());
      const { vehicle: v2 } = await createTestVehicle(addable());
      await request(app).post(base).set('Authorization', `Bearer ${token}`).send({ vehicleId: v1.id });
      await request(app).post(base).set('Authorization', `Bearer ${token}`).send({ vehicleId: v2.id });

      const res = await request(app)
        .delete(`${base}/clear`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.cleared).toBe(2);
    });
  });

  describe('DELETE /cart/:id', () => {
    it('should remove a cart item by id', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle(addable());
      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });

      const res = await request(app)
        .delete(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should 404 when item belongs to another user', async () => {
      const { token: tokenA } = await makeToken();
      const { token: tokenB } = await makeToken();
      const { vehicle } = await createTestVehicle(addable());

      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ vehicleId: vehicle.id });

      const res = await request(app)
        .delete(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });
  });
});