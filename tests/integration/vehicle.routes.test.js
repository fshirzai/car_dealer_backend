'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { createTestVehicle, createTestUser, buildVehiclePayload } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const { USER_ROLES, VEHICLE_STATUS } = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const publicBase = `${env.apiPrefix}/vehicles`;
const staffBase = `${env.apiPrefix}/vehicles/staff`;

const makeToken = async (role) => {
  const { user } = await createTestUser({ role });
  return generateToken(user);
};

describe('Vehicle Routes (integration)', () => {
  describe('Public endpoints', () => {
    it('GET /vehicles returns only published + available/reserved', async () => {
      await createTestVehicle({ make: 'Toyota', isPublished: true });
      await createTestVehicle({ make: 'Honda', isPublished: false });
      await createTestVehicle({
        make: 'Kia',
        isPublished: true,
        status: VEHICLE_STATUS.SOLD,
      });

      const res = await request(app).get(publicBase);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].make).toBe('Toyota');
    });

    it('GET /vehicles does NOT expose purchasePrice/vin/engineNumber', async () => {
      await createTestVehicle({ isPublished: true, vin: 'SECRETVIN' });
      const res = await request(app).get(publicBase);
      expect(res.body.data.items[0].purchasePrice).toBeUndefined();
      expect(res.body.data.items[0].vin).toBeUndefined();
      expect(res.body.data.items[0].engineNumber).toBeUndefined();
    });

    it('GET /vehicles filters by make', async () => {
      await createTestVehicle({ make: 'Toyota', isPublished: true });
      await createTestVehicle({ make: 'Honda', isPublished: true });

      const res = await request(app).get(`${publicBase}?make=toyota`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].make).toBe('Toyota');
    });

    it('GET /vehicles/:id returns a published vehicle', async () => {
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const res = await request(app).get(`${publicBase}/${vehicle.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(vehicle.id);
      expect(res.body.data.purchasePrice).toBeUndefined();
    });

    it('GET /vehicles/:id 404s for unpublished vehicle', async () => {
      const { vehicle } = await createTestVehicle({ isPublished: false });
      const res = await request(app).get(`${publicBase}/${vehicle.id}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Staff auth gate', () => {
    it('should 401 without token', async () => {
      const res = await request(app).get(staffBase);
      expect(res.status).toBe(401);
    });

    it('should 403 for CUSTOMER', async () => {
      const token = await makeToken(USER_ROLES.CUSTOMER);
      const res = await request(app)
        .get(staffBase)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should allow ADMIN', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const res = await request(app)
        .get(staffBase)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should allow SELLER', async () => {
      const token = await makeToken(USER_ROLES.SELLER);
      const res = await request(app)
        .get(staffBase)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /vehicles/staff', () => {
    it('should create a vehicle', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const payload = buildVehiclePayload({ vin: 'NEWVIN001' });

      const res = await request(app)
        .post(staffBase)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.stockNumber).toMatch(/^STK-/);
      expect(res.body.data.vin).toBe('NEWVIN001');
    });

    it('should 422 on missing required fields', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const res = await request(app)
        .post(staffBase)
        .set('Authorization', `Bearer ${token}`)
        .send({ make: 'Toyota' });
      expect(res.status).toBe(422);
    });

    it('should 409 on duplicate VIN', async () => {
      await createTestVehicle({ vin: 'DUPVIN' });
      const token = await makeToken(USER_ROLES.ADMIN);
      const res = await request(app)
        .post(staffBase)
        .set('Authorization', `Bearer ${token}`)
        .send(buildVehiclePayload({ vin: 'DUPVIN' }));
      expect(res.status).toBe(409);
    });
  });

  describe('GET /vehicles/staff (staff list)', () => {
    it('should include purchasePrice', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      await createTestVehicle({ isPublished: false });
      const res = await request(app)
        .get(staffBase)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items[0].purchasePrice).toBeDefined();
    });
  });

  describe('PATCH /vehicles/staff/:id', () => {
    it('should update askingPrice', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();
      const res = await request(app)
        .patch(`${staffBase}/${vehicle.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ askingPrice: 15500 });
      expect(res.status).toBe(200);
      expect(res.body.data.askingPrice).toBe(15500);
    });
  });

  describe('PATCH /vehicles/staff/:id/status', () => {
    it('should move AVAILABLE → RESERVED', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();
      const res = await request(app)
        .patch(`${staffBase}/${vehicle.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: VEHICLE_STATUS.RESERVED });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(VEHICLE_STATUS.RESERVED);
    });

    it('should forbid moving away from SOLD', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle({
        status: VEHICLE_STATUS.SOLD,
      });
      const res = await request(app)
        .patch(`${staffBase}/${vehicle.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: VEHICLE_STATUS.AVAILABLE });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /vehicles/staff/:id/publish & unpublish', () => {
    it('should publish', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle({ isPublished: false });
      const res = await request(app)
        .patch(`${staffBase}/${vehicle.id}/publish`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.isPublished).toBe(true);
    });

    it('should unpublish', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const res = await request(app)
        .patch(`${staffBase}/${vehicle.id}/unpublish`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.isPublished).toBe(false);
    });
  });

  describe('DELETE /vehicles/staff/:id', () => {
    it('should delete a non-sold vehicle', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();
      const res = await request(app)
        .delete(`${staffBase}/${vehicle.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should refuse to delete a SOLD vehicle', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle({
        status: VEHICLE_STATUS.SOLD,
      });
      const res = await request(app)
        .delete(`${staffBase}/${vehicle.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });
});