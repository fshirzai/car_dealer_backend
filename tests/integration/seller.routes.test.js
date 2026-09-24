'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { createTestSeller, createTestUser } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const { USER_ROLES, SELLER_TYPE } = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const base = `${env.apiPrefix}/sellers`;

const makeToken = async (role) => {
  const { user } = await createTestUser({ role });
  return { token: generateToken(user), user };
};

describe('Seller Routes (integration)', () => {
  describe('Auth gate', () => {
    it('should 401 without token', async () => {
      const res = await request(app).get(base);
      expect(res.status).toBe(401);
    });

    it('should 403 for CUSTOMER role', async () => {
      const { token } = await makeToken(USER_ROLES.CUSTOMER);
      const res = await request(app)
        .get(base)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /sellers', () => {
    it('should create a seller as ADMIN', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Alice Auto',
          type: SELLER_TYPE.INDIVIDUAL,
          phone: '0700000001',
          email: 'alice@test.com',
          city: 'Kabul',
          country: 'Afghanistan',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Alice Auto');
    });

    it('should create a seller as SELLER role', async () => {
      const { token } = await makeToken(USER_ROLES.SELLER);
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Staff Added',
          email: 'staff@test.com',
        });
      expect(res.status).toBe(201);
    });

    it('should 422 on missing name', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ city: 'Kabul' });
      expect(res.status).toBe(422);
    });

    it('should 422 on invalid email', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X Seller', email: 'not-an-email' });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /sellers', () => {
    it('should list with pagination', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      await createTestSeller();
      await createTestSeller();

      const res = await request(app)
        .get(base)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.meta.total).toBe(2);
    });

    it('should filter by isActive', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      await createTestSeller({ isActive: true });
      await createTestSeller({ isActive: false });

      const res = await request(app)
        .get(`${base}?isActive=false`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
    });

    it('should 422 on invalid type', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      const res = await request(app)
        .get(`${base}?type=NOPE`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(422);
    });
  });

  describe('GET /sellers/:id', () => {
    it('should return a seller', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      const { seller } = await createTestSeller();

      const res = await request(app)
        .get(`${base}/${seller.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(seller.id);
    });

    it('should 404 for unknown id', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      const res = await request(app)
        .get(`${base}/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /sellers/:id', () => {
    it('should update a seller', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      const { seller } = await createTestSeller();

      const res = await request(app)
        .patch(`${base}/${seller.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed');
    });

    it('should 422 on empty body', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      const { seller } = await createTestSeller();

      const res = await request(app)
        .patch(`${base}/${seller.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(422);
    });
  });

  describe('PATCH /sellers/:id/deactivate & activate', () => {
    it('should toggle isActive', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      const { seller } = await createTestSeller();

      const off = await request(app)
        .patch(`${base}/${seller.id}/deactivate`)
        .set('Authorization', `Bearer ${token}`);
      expect(off.status).toBe(200);
      expect(off.body.data.isActive).toBe(false);

      const on = await request(app)
        .patch(`${base}/${seller.id}/activate`)
        .set('Authorization', `Bearer ${token}`);
      expect(on.status).toBe(200);
      expect(on.body.data.isActive).toBe(true);
    });
  });

  describe('DELETE /sellers/:id', () => {
    it('should delete a seller as ADMIN', async () => {
      const { token } = await makeToken(USER_ROLES.ADMIN);
      const { seller } = await createTestSeller();

      const res = await request(app)
        .delete(`${base}/${seller.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should 403 for SELLER role', async () => {
      const { token } = await makeToken(USER_ROLES.SELLER);
      const { seller } = await createTestSeller();

      const res = await request(app)
        .delete(`${base}/${seller.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
});