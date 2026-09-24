'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const {
  createTestVehicle,
  createTestUser,
} = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const {
  USER_ROLES,
  SALE_CHANNEL,
  VEHICLE_STATUS,
} = require('../../src/constants/enums');
const env = require('../../src/config/env');
const Vehicle = require('../../src/modules/vehicle/vehicle.model');

const app = createApp();
const base = `${env.apiPrefix}/sales`;

const makeStaffToken = async (role = USER_ROLES.ADMIN) => {
  const { user } = await createTestUser({ role });
  return { token: generateToken(user), user };
};

describe('Sale Routes (integration)', () => {
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

  describe('POST /sales', () => {
    it('should create an OFFLINE sale and mark vehicle SOLD', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle({ isPublished: true });

      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
          salePrice: 13000,
          channel: SALE_CHANNEL.OFFLINE,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.saleNumber).toMatch(/^SAL-/);

      const reloaded = await Vehicle.findById(vehicle.id);
      expect(reloaded.status).toBe(VEHICLE_STATUS.SOLD);
    });

    it('should 400 for an already-SOLD vehicle', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle({
        isPublished: true,
        status: VEHICLE_STATUS.SOLD,
      });
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
          salePrice: 13000,
          channel: SALE_CHANNEL.OFFLINE,
        });
      expect(res.status).toBe(400);
    });

    it('should 422 for invalid channel', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId: vehicle.id,
          salePrice: 13000,
          channel: 'INVALID',
        });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /sales', () => {
    it('should list sales', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle({ isPublished: true });
      await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id, salePrice: 13000, channel: SALE_CHANNEL.OFFLINE });

      const res = await request(app).get(base).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /sales/:id', () => {
    it('should update sale price', async () => {
      const { token } = await makeStaffToken();
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id, salePrice: 13000, channel: SALE_CHANNEL.OFFLINE });

      const res = await request(app)
        .patch(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ salePrice: 12500 });
      expect(res.status).toBe(200);
      expect(res.body.data.salePrice).toBe(12500);
    });
  });

  describe('DELETE /sales/:id', () => {
    it('should restore the vehicle to AVAILABLE for ADMIN', async () => {
      const { token } = await makeStaffToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id, salePrice: 13000, channel: SALE_CHANNEL.OFFLINE });

      const res = await request(app)
        .delete(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const reloaded = await Vehicle.findById(vehicle.id);
      expect(reloaded.status).toBe(VEHICLE_STATUS.AVAILABLE);
    });

    it('should 403 for SELLER', async () => {
      const { token } = await makeStaffToken(USER_ROLES.SELLER);
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleId: vehicle.id, salePrice: 13000, channel: SALE_CHANNEL.OFFLINE });

      const res = await request(app)
        .delete(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
});