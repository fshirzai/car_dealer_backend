'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { createTestVehicle, createTestUser } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const { USER_ROLES } = require('../../src/constants/enums');
const env = require('../../src/config/env');
const VehicleImage = require('../../src/modules/vehicleImage/vehicleImage.model');

const app = createApp();
const publicBase = `${env.apiPrefix}/vehicles`;
const staffBase = `${env.apiPrefix}/vehicles/staff`;

const makeToken = async (role) => {
  const { user } = await createTestUser({ role });
  return generateToken(user);
};

const img = (n = 1) => `https://cdn.example.com/img${n}.jpg`;

describe('VehicleImage Routes (integration)', () => {
  describe('Public GET', () => {
    it('should list images for a vehicle', async () => {
      const { vehicle } = await createTestVehicle({ isPublished: true });
      await VehicleImage.create({
        vehicleId: vehicle.id,
        url: img(1),
        isPrimary: true,
      });

      const res = await request(app).get(`${publicBase}/${vehicle.id}/images`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should 404 for unknown vehicle', async () => {
      const res = await request(app).get(
        `${publicBase}/507f1f77bcf86cd799439011/images`
      );
      expect(res.status).toBe(404);
    });
  });

  describe('Staff POST /:vehicleId/images', () => {
    it('should create an image', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();

      const res = await request(app)
        .post(`${staffBase}/${vehicle.id}/images`)
        .set('Authorization', `Bearer ${token}`)
        .send({ url: img(1), altText: 'Front view' });

      expect(res.status).toBe(201);
      expect(res.body.data.isPrimary).toBe(true);
    });

    it('should 422 on invalid URL', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();

      const res = await request(app)
        .post(`${staffBase}/${vehicle.id}/images`)
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'not-a-url' });

      expect(res.status).toBe(422);
    });

    it('should 401 without token', async () => {
      const { vehicle } = await createTestVehicle();
      const res = await request(app)
        .post(`${staffBase}/${vehicle.id}/images`)
        .send({ url: img(1) });
      expect(res.status).toBe(401);
    });
  });

  describe('Staff POST /:vehicleId/images/bulk', () => {
    it('should create many images at once', async () => {
      const token = await makeToken(USER_ROLES.SELLER);
      const { vehicle } = await createTestVehicle();

      const res = await request(app)
        .post(`${staffBase}/${vehicle.id}/images/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          images: [{ url: img(1) }, { url: img(2) }, { url: img(3) }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].isPrimary).toBe(true);
    });
  });

  describe('Staff PATCH /images/:id', () => {
    it('should update an image', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();
      const image = await VehicleImage.create({
        vehicleId: vehicle.id,
        url: img(1),
        isPrimary: true,
      });

      const res = await request(app)
        .patch(`${staffBase}/images/${image.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ altText: 'Updated alt' });

      expect(res.status).toBe(200);
      expect(res.body.data.altText).toBe('Updated alt');
    });
  });

  describe('Staff PATCH /images/:id/primary', () => {
    it('should swap primary', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();
      const a = await VehicleImage.create({
        vehicleId: vehicle.id,
        url: img(1),
        isPrimary: true,
      });
      const b = await VehicleImage.create({
        vehicleId: vehicle.id,
        url: img(2),
        sortOrder: 1,
      });

      const res = await request(app)
        .patch(`${staffBase}/images/${b.id}/primary`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isPrimary).toBe(true);

      const aReloaded = await VehicleImage.findById(a.id);
      expect(aReloaded.isPrimary).toBe(false);
    });
  });

  describe('Staff PATCH /:vehicleId/images/reorder', () => {
    it('should reorder images', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();
      const a = await VehicleImage.create({
        vehicleId: vehicle.id,
        url: img(1),
        sortOrder: 0,
        isPrimary: true,
      });
      const b = await VehicleImage.create({
        vehicleId: vehicle.id,
        url: img(2),
        sortOrder: 1,
      });

      const res = await request(app)
        .patch(`${staffBase}/${vehicle.id}/images/reorder`)
        .set('Authorization', `Bearer ${token}`)
        .send({ order: [b.id, a.id] });

      expect(res.status).toBe(200);
      expect(res.body.data[0].id).toBe(b.id);
    });
  });

  describe('Staff DELETE /images/:id', () => {
    it('should delete an image', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();
      const a = await VehicleImage.create({
        vehicleId: vehicle.id,
        url: img(1),
        isPrimary: true,
      });

      const res = await request(app)
        .delete(`${staffBase}/images/${a.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});