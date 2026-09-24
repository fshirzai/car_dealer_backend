'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { createTestUser } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const {
  USER_ROLES,
  GENERAL_EXPENSE_CATEGORY,
} = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const base = `${env.apiPrefix}/general-expenses`;

const makeStaffToken = async (role = USER_ROLES.ADMIN) => {
  const { user } = await createTestUser({ role });
  return { token: generateToken(user), user };
};

describe('GeneralExpense Routes (integration)', () => {
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

  describe('POST /general-expenses', () => {
    it('should create a general expense', async () => {
      const { token } = await makeStaffToken();
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: GENERAL_EXPENSE_CATEGORY.RENT,
          description: 'September rent', // ✅ ≥ 2
          amount: 2000,
        });
      expect(res.status).toBe(201);
    });

    it('should 422 for missing fields', async () => {
      const { token } = await makeStaffToken();
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(422);
    });
  });

  describe('GET /general-expenses/summary', () => {
    it('should return totals', async () => {
      const { token } = await makeStaffToken();
      await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: GENERAL_EXPENSE_CATEGORY.RENT,
          description: 'Monthly rent',
          amount: 1000,
        });
      await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: GENERAL_EXPENSE_CATEGORY.UTILITIES,
          description: 'Electricity bill',
          amount: 200,
        });

      const res = await request(app)
        .get(`${base}/summary`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1200);
    });
  });

  describe('DELETE /general-expenses/:id', () => {
    it('should allow ADMIN', async () => {
      const { token } = await makeStaffToken(USER_ROLES.ADMIN);

      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: GENERAL_EXPENSE_CATEGORY.RENT,
          description: 'Office rent', // ✅ ≥ 2
          amount: 100,
        });

      expect(created.status).toBe(201);
      expect(created.body.data).toBeDefined();

      const res = await request(app)
        .delete(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should 403 for SELLER', async () => {
      const { token } = await makeStaffToken(USER_ROLES.SELLER);

      const created = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: GENERAL_EXPENSE_CATEGORY.RENT,
          description: 'Office rent',
          amount: 100,
        });

      expect(created.status).toBe(201);
      expect(created.body.data).toBeDefined();

      const res = await request(app)
        .delete(`${base}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
});