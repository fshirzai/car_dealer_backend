'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { createTestCustomer, createTestUser } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const { USER_ROLES } = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const base = `${env.apiPrefix}/customer-profiles`;

describe('CustomerProfile Routes (integration)', () => {
  describe('GET /customer-profiles/me', () => {
    it('should return the current customer profile', async () => {
      const { user, profile } = await createTestCustomer();
      const token = generateToken(user);

      const res = await request(app)
        .get(`${base}/me`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(profile.id);
    });

    it('should 403 for non-customer roles', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
      const token = generateToken(user);
      const res = await request(app)
        .get(`${base}/me`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should 401 without token', async () => {
      const res = await request(app).get(`${base}/me`);
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /customer-profiles/me', () => {
    it('should update own profile', async () => {
      const { user } = await createTestCustomer();
      const token = generateToken(user);

      const res = await request(app)
        .patch(`${base}/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Updated Name', city: 'Kabul' });

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe('Updated Name');
    });

    it('should 422 on invalid payload', async () => {
      const { user } = await createTestCustomer();
      const token = generateToken(user);

      const res = await request(app)
        .patch(`${base}/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'x' }); // too short

      expect(res.status).toBe(422);
    });
  });

  describe('Admin: POST /customer-profiles', () => {
    it('should create a profile for a customer', async () => {
      const { user: admin } = await createTestUser({ role: USER_ROLES.ADMIN });
      const { user: customer } = await createTestUser({
        role: USER_ROLES.CUSTOMER,
      });
      const token = generateToken(admin);

      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: customer.id,
          fullName: 'Manual Profile',
          phone: '0700000000',
          city: 'Kabul',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.fullName).toBe('Manual Profile');
    });

    it('should 403 for non-admin', async () => {
      const { user: customer } = await createTestCustomer();
      const token = generateToken(customer);

      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: customer.id,
          fullName: 'X',
          phone: '0700000000',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Admin: GET /customer-profiles', () => {
    it('should list with pagination', async () => {
      const { user: admin } = await createTestUser({ role: USER_ROLES.ADMIN });
      await createTestCustomer();
      await createTestCustomer();
      const token = generateToken(admin);

      const res = await request(app)
        .get(base)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.meta.total).toBe(2);
    });
  });

  describe('Admin: GET /customer-profiles/:id', () => {
    it('should return profile by id', async () => {
      const { user: admin } = await createTestUser({ role: USER_ROLES.ADMIN });
      const { profile } = await createTestCustomer();
      const token = generateToken(admin);

      const res = await request(app)
        .get(`${base}/${profile.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(profile.id);
    });

    it('should 404 for unknown id', async () => {
      const { user: admin } = await createTestUser({ role: USER_ROLES.ADMIN });
      const token = generateToken(admin);

      const res = await request(app)
        .get(`${base}/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Admin: PATCH /customer-profiles/:id', () => {
    it('should update a profile', async () => {
      const { user: admin } = await createTestUser({ role: USER_ROLES.ADMIN });
      const { profile } = await createTestCustomer();
      const token = generateToken(admin);

      const res = await request(app)
        .patch(`${base}/${profile.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'VIP account' });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe('VIP account');
    });
  });

  describe('Admin: DELETE /customer-profiles/:id', () => {
    it('should delete a profile', async () => {
      const { user: admin } = await createTestUser({ role: USER_ROLES.ADMIN });
      const { profile } = await createTestCustomer();
      const token = generateToken(admin);

      const res = await request(app)
        .delete(`${base}/${profile.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});