'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { createTestVehicle, createTestUser } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const { USER_ROLES } = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const publicBase = `${env.apiPrefix}/vehicles`;
const staffBase = `${env.apiPrefix}/vehicles/staff`;

const makeToken = async (role) => {
  const { user } = await createTestUser({ role });
  return generateToken(user);
};

describe('VehicleVideo Routes (integration)', () => {
  describe('Public GET /vehicles/:vehicleId/video', () => {
    it('should return null when no video', async () => {
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const res = await request(app).get(`${publicBase}/${vehicle.id}/video`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });

    it('should return the video when present', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle({ isPublished: true });
      await request(app)
        .put(`${staffBase}/${vehicle.id}/video`)
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://videos.example.com/a.mp4' });

      const res = await request(app).get(`${publicBase}/${vehicle.id}/video`);
      expect(res.status).toBe(200);
      expect(res.body.data.url).toBe('https://videos.example.com/a.mp4');
    });
  });

  describe('Staff PUT /:vehicleId/video', () => {
    it('should upsert the video', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();

      const res = await request(app)
        .put(`${staffBase}/${vehicle.id}/video`)
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://videos.example.com/a.mp4', title: 'Walk-around' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Walk-around');
    });

    it('should replace existing video (upsert)', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();

      const first = await request(app)
        .put(`${staffBase}/${vehicle.id}/video`)
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://videos.example.com/a.mp4' });

      const second = await request(app)
        .put(`${staffBase}/${vehicle.id}/video`)
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://videos.example.com/b.mp4' });

      expect(second.status).toBe(200);
      expect(second.body.data.id).toBe(first.body.data.id);
      expect(second.body.data.url).toBe('https://videos.example.com/b.mp4');
    });

    it('should 422 on invalid URL', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();
      const res = await request(app)
        .put(`${staffBase}/${vehicle.id}/video`)
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'not-a-url' });
      expect(res.status).toBe(422);
    });

    it('should 401 without token', async () => {
      const { vehicle } = await createTestVehicle();
      const res = await request(app)
        .put(`${staffBase}/${vehicle.id}/video`)
        .send({ url: 'https://videos.example.com/a.mp4' });
      expect(res.status).toBe(401);
    });
  });

  describe('Staff PATCH /:vehicleId/video', () => {
    it('should update the video', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();

      await request(app)
        .put(`${staffBase}/${vehicle.id}/video`)
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://videos.example.com/a.mp4' });

      const res = await request(app)
        .patch(`${staffBase}/${vehicle.id}/video`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated');
    });

    it('should 404 if no video exists', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();
      const res = await request(app)
        .patch(`${staffBase}/${vehicle.id}/video`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'x' });
      expect(res.status).toBe(404);
    });
  });

  describe('Staff DELETE /:vehicleId/video', () => {
    it('should delete the video', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();

      await request(app)
        .put(`${staffBase}/${vehicle.id}/video`)
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://videos.example.com/a.mp4' });

      const res = await request(app)
        .delete(`${staffBase}/${vehicle.id}/video`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should 404 if no video exists', async () => {
      const token = await makeToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle();
      const res = await request(app)
        .delete(`${staffBase}/${vehicle.id}/video`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});