'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const {
  createTestUser,
  createTestAuditLog,
} = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const { USER_ROLES } = require('../../src/constants/enums');
const { ACTION } = require('../../src/modules/auditLog/auditLog.constants');
const env = require('../../src/config/env');

const app = createApp();
const base = `${env.apiPrefix}/audit-logs`;

const makeAdminToken = async () => {
  const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
  return { token: generateToken(user), user };
};

describe('AuditLog Routes (integration)', () => {
  describe('Auth gate', () => {
    it('should 401 without token', async () => {
      const res = await request(app).get(base);
      expect(res.status).toBe(401);
    });

    it('should 403 for SELLER', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.SELLER });
      const token = generateToken(user);
      const res = await request(app).get(base).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should 403 for CUSTOMER', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.CUSTOMER });
      const token = generateToken(user);
      const res = await request(app).get(base).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /audit-logs (ADMIN)', () => {
    it('should list audit logs', async () => {
      const { token, user } = await makeAdminToken();
      await createTestAuditLog({ userId: user.id, action: ACTION.CREATE });
      await createTestAuditLog({ userId: user.id, action: ACTION.DELETE });

      const res = await request(app).get(base).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by action', async () => {
      const { token, user } = await makeAdminToken();
      await createTestAuditLog({ userId: user.id, action: ACTION.CREATE });
      await createTestAuditLog({ userId: user.id, action: ACTION.DELETE });

      const res = await request(app)
        .get(`${base}?action=DELETE`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
    });
  });

  describe('GET /audit-logs/by-entity/:entityType/:entityId', () => {
    it('should return matching logs', async () => {
      const { token, user } = await makeAdminToken();
      await createTestAuditLog({
        userId: user.id,
        entityType: 'Vehicle',
        entityId: 'v1',
      });
      await createTestAuditLog({
        userId: user.id,
        entityType: 'Vehicle',
        entityId: 'v2',
      });

      const res = await request(app)
        .get(`${base}/by-entity/Vehicle/v1`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /audit-logs/:id', () => {
    it('should return a log', async () => {
      const { token, user } = await makeAdminToken();
      const { log } = await createTestAuditLog({ userId: user.id });

      const res = await request(app)
        .get(`${base}/${log.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should 404 for unknown id', async () => {
      const { token } = await makeAdminToken();
      const res = await request(app)
        .get(`${base}/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});