'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { createTestUser, createTestVehicle } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const { USER_ROLES, VEHICLE_STATUS } = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const base = `${env.apiPrefix}/favorites`;

const makeToken = async (role = USER_ROLES.CUSTOMER) => {
  const { user } = await createTestUser({ role });
  return { token: generateToken(user), user };
};

describe('Favorite Routes (integration)', () => {
  describe('Auth gate', () => {
    it('should 401 without token', async () => {
      const res = await request(app).get(base);
      expect(res.status).toBe(401);
    });

    it('should 403 for ADMIN', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      const res = await request(app).get(base).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /favorites', () => {
    it('should add a favorite', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle();
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });
      expect(res.status).toBe(201);
      expect(res.body.data.vehicleId.id).toBe(vehicle.id);
    });

    it('should 404 for unknown vehicle', async () => {
      const { token } = await makeToken();
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: '507f1f77bcf86cd799439011' });
      expect(res.status).toBe(404);
    });

    it('should 400 for SOLD vehicle', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle({ status: VEHICLE_STATUS.SOLD });
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

  describe('POST /favorites/toggle', () => {
    it('should toggle on then off', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle();

      const on = await request(app)
        .post(`${base}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });
      expect(on.status).toBe(200);
      expect(on.body.data.favorited).toBe(true);

      const off = await request(app)
        .post(`${base}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });
      expect(off.status).toBe(200);
      expect(off.body.data.favorited).toBe(false);
    });
  });

  describe('GET /favorites', () => {
    it('should list user favorites', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle();
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

  describe('DELETE /favorites', () => {
    it('should remove by vehicleId in body', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle();
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

  describe('DELETE /favorites/:id', () => {
    it('should remove by favorite id', async () => {
      const { token } = await makeToken();
      const { vehicle } = await createTestVehicle();
      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id });

      const res = await request(app)
        .delete(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should 404 for another user’s favorite', async () => {
      const { token: tokenA } = await makeToken();
      const { token: tokenB } = await makeToken();
      const { vehicle } = await createTestVehicle();
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