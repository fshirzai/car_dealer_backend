'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { createTestUser } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const { USER_ROLES } = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const publicBase = `${env.apiPrefix}/dealership-settings/public`;
const adminBase = `${env.apiPrefix}/dealership-settings`;

const makeAdminToken = async () => {
  const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
  return { token: generateToken(user), user };
};

// ✅ Use a real-world-style TLD (.com) — Joi's email() validates strictly
const validPayload = () => ({
  businessName: 'Kabul Auto Traders',
  email: 'info@kabulautotraders.com',
  address: '100 Industrial Road',
  country: 'Afghanistan',
});

describe('DealershipSettings Routes (integration)', () => {
  describe('Public GET /dealership-settings/public', () => {
    it('should return null when unset', async () => {
      const res = await request(app).get(publicBase);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });

    it('should return public fields when set', async () => {
      const { token } = await makeAdminToken();

      // ✅ Assert the PUT succeeded BEFORE querying the public endpoint
      const created = await request(app)
        .put(adminBase)
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload());
      expect(created.status).toBe(200);

      const res = await request(app).get(publicBase);
      expect(res.status).toBe(200);
      expect(res.body.data).not.toBeNull();
      expect(res.body.data.businessName).toBe('Kabul Auto Traders');
      expect(res.body.data.legalName).toBeUndefined(); // not public
    });
  });

  describe('GET /dealership-settings (admin)', () => {
    it('should 401 without token', async () => {
      const res = await request(app).get(adminBase);
      expect(res.status).toBe(401);
    });

    it('should 403 for CUSTOMER', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.CUSTOMER });
      const token = generateToken(user);
      const res = await request(app)
        .get(adminBase)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should auto-create default settings', async () => {
      const { token } = await makeAdminToken();
      const res = await request(app)
        .get(adminBase)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.businessName).toBe('My Dealership');
    });
  });

  describe('PUT /dealership-settings (admin)', () => {
    it('should create settings', async () => {
      const { token } = await makeAdminToken();
      const res = await request(app)
        .put(adminBase)
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload());
      expect(res.status).toBe(200);
      expect(res.body.data.businessName).toBe('Kabul Auto Traders');
      expect(res.body.data.email).toBe('info@kabulautotraders.com');
    });

    it('should 422 on invalid payload (missing required fields)', async () => {
      const { token } = await makeAdminToken();
      const res = await request(app)
        .put(adminBase)
        .set('Authorization', `Bearer ${token}`)
        .send({ businessName: 'X' }); // missing email, address, country
      expect(res.status).toBe(422);
    });

    it('should 422 on a 1-char businessName', async () => {
      const { token } = await makeAdminToken();
      const res = await request(app)
        .put(adminBase)
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validPayload(), businessName: 'A' });
      expect(res.status).toBe(422);
    });
  });

  describe('PATCH /dealership-settings (admin)', () => {
    it('should update individual fields', async () => {
      const { token } = await makeAdminToken();

      // ✅ Ensure settings exist first
      const created = await request(app)
        .put(adminBase)
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload());
      expect(created.status).toBe(200);

      const res = await request(app)
        .patch(adminBase)
        .set('Authorization', `Bearer ${token}`)
        .send({ businessName: 'Renamed Motors' });
      expect(res.status).toBe(200);
      expect(res.body.data.businessName).toBe('Renamed Motors');
    });

    it('should 404 when settings not yet created', async () => {
      const { token } = await makeAdminToken();

      // ✅ Must satisfy Joi min(2) so we reach the service and hit the 404
      const res = await request(app)
        .patch(adminBase)
        .set('Authorization', `Bearer ${token}`)
        .send({ businessName: 'X Motors' });
      expect(res.status).toBe(404);
    });

    it('should 422 on a 1-char patch value', async () => {
      const { token } = await makeAdminToken();
      const res = await request(app)
        .patch(adminBase)
        .set('Authorization', `Bearer ${token}`)
        .send({ businessName: 'X' });
      expect(res.status).toBe(422);
    });
  });
});