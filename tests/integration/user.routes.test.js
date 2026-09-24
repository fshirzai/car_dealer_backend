'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { createTestUser } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const { USER_ROLES } = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const base = `${env.apiPrefix}/users`;

describe('User Routes (integration)', () => {
  describe('GET /users/me', () => {
    it('should return current user with valid token', async () => {
      const { user } = await createTestUser();
      const token = generateToken(user);
      const res = await request(app)
        .get(`${base}/me`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(user.id);
    });

    it('should 401 without token', async () => {
      const res = await request(app).get(`${base}/me`);
      expect(res.status).toBe(401);
    });

    it('should 401 with invalid token', async () => {
      const res = await request(app)
        .get(`${base}/me`)
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /users (admin only)', () => {
    it('should create user as admin', async () => {
      const { user: admin } = await createTestUser({ role: USER_ROLES.ADMIN });
      const token = generateToken(admin);
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Person',
          email: 'newperson@test.com',
          password: 'Password123!',
          role: USER_ROLES.CUSTOMER,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('newperson@test.com');
    });

    it('should 403 for non-admin', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.CUSTOMER });
      const token = generateToken(user);
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'X',
          email: 'x@test.com',
          password: 'Password123!',
        });
      expect(res.status).toBe(403);
    });

    it('should 422 for invalid payload', async () => {
      const { user: admin } = await createTestUser({ role: USER_ROLES.ADMIN });
      const token = generateToken(admin);
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X', email: 'bad-email', password: 'short' });
      expect(res.status).toBe(422);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('GET /users (admin only)', () => {
    it('should list users with pagination', async () => {
      const { user: admin } = await createTestUser({ role: USER_ROLES.ADMIN });
      await createTestUser();
      const token = generateToken(admin);
      const res = await request(app)
        .get(base)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.meta.total).toBe(2);
    });
  });

  describe('PATCH /users/me', () => {
    it('should update own profile', async () => {
      const { user } = await createTestUser();
      const token = generateToken(user);
      const res = await request(app)
        .patch(`${base}/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Changed' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Changed');
    });
  });

  describe('PATCH /users/me/password', () => {
    it('should change own password', async () => {
      const { user, password } = await createTestUser();
      const token = generateToken(user);
      const res = await request(app)
        .patch(`${base}/me/password`)
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: password, newPassword: 'BrandNewPass123!' });
      expect(res.status).toBe(200);
    });
  });
});