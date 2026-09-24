'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const { buildUserPayload, createTestUser } = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const env = require('../../src/config/env');
const User = require('../../src/modules/user/user.model');

const app = createApp();
const base = `${env.apiPrefix}/auth`;

describe('Auth Routes (integration)', () => {
  describe('POST /auth/register', () => {
    it('should register a customer', async () => {
      const payload = buildUserPayload();
      const res = await request(app).post(`${base}/register`).send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe(payload.email.toLowerCase());
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject weak passwords with 422', async () => {
      const res = await request(app)
        .post(`${base}/register`)
        .send({ name: 'X', email: 'x@test.com', password: 'weak' });
      expect(res.status).toBe(422);
    });

    it('should reject duplicate email with 409', async () => {
      const payload = buildUserPayload();
      await request(app).post(`${base}/register`).send(payload);
      const res = await request(app).post(`${base}/register`).send(payload);
      expect(res.status).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should login and return tokens', async () => {
      const { user, password } = await createTestUser();
      const res = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password });

      expect(res.status).toBe(200);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('should return a DIFFERENT refresh token on each login', async () => {
      const { user, password } = await createTestUser();
      const first = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password });
      const second = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password });

      expect(first.body.data.tokens.refreshToken).not.toBe(
        second.body.data.tokens.refreshToken
      );
    });

    it('should 401 on wrong password', async () => {
      const { user } = await createTestUser();
      const res = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password: 'Wrong123!' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should issue new tokens', async () => {
      const { user, password } = await createTestUser();
      const login = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password });

      const res = await request(app)
        .post(`${base}/refresh`)
        .send({ refreshToken: login.body.data.tokens.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).not.toBe(
        login.body.data.tokens.refreshToken
      );
    });

    it('should 401 on invalid refresh token', async () => {
      const res = await request(app)
        .post(`${base}/refresh`)
        .send({ refreshToken: 'invalid.token.here' });
      expect(res.status).toBe(401);
    });

    it('should 401 when reusing a rotated refresh token', async () => {
      const { user, password } = await createTestUser();
      const login = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password });
      const { refreshToken } = login.body.data.tokens;

      // First refresh succeeds
      const first = await request(app).post(`${base}/refresh`).send({ refreshToken });
      expect(first.status).toBe(200);

      // Second refresh with the same old token must fail
      const second = await request(app).post(`${base}/refresh`).send({ refreshToken });
      expect(second.status).toBe(401);
    });

    it('should support a multi-step rotation chain', async () => {
      const { user, password } = await createTestUser();
      const login = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password });

      let refreshToken = login.body.data.tokens.refreshToken;
      for (let i = 0; i < 3; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await request(app)
          .post(`${base}/refresh`)
          .send({ refreshToken });
        expect(res.status).toBe(200);
        refreshToken = res.body.data.tokens.refreshToken;
      }
    });
  });

  describe('POST /auth/logout', () => {
    it('should revoke the refresh token', async () => {
      const { user, password } = await createTestUser();
      const login = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password });
      const { refreshToken } = login.body.data.tokens;

      const out = await request(app).post(`${base}/logout`).send({ refreshToken });
      expect(out.status).toBe(200);

      const refresh = await request(app).post(`${base}/refresh`).send({ refreshToken });
      expect(refresh.status).toBe(401);
    });
  });

  describe('POST /auth/logout-all', () => {
    it('should revoke all sessions for the current user', async () => {
      const { user, password } = await createTestUser();
      const login1 = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password });
      const login2 = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password });

      const token = generateToken(user);
      const out = await request(app)
        .post(`${base}/logout-all`)
        .set('Authorization', `Bearer ${token}`);
      expect(out.status).toBe(200);

      const r1 = await request(app)
        .post(`${base}/refresh`)
        .send({ refreshToken: login1.body.data.tokens.refreshToken });
      const r2 = await request(app)
        .post(`${base}/refresh`)
        .send({ refreshToken: login2.body.data.tokens.refreshToken });

      expect(r1.status).toBe(401);
      expect(r2.status).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user', async () => {
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
  });

  describe('Forgot / Reset password', () => {
    it('should send reset token in dev', async () => {
      const { user } = await createTestUser();
      const res = await request(app)
        .post(`${base}/forgot-password`)
        .send({ email: user.email });
      expect(res.status).toBe(200);
      expect(res.body.data.resetToken).toBeDefined();
    });

    it('should reset password end-to-end', async () => {
      const { user } = await createTestUser();
      const fp = await request(app)
        .post(`${base}/forgot-password`)
        .send({ email: user.email });
      const { resetToken } = fp.body.data;

      const res = await request(app)
        .post(`${base}/reset-password`)
        .send({ token: resetToken, newPassword: 'NewPass789!' });
      expect(res.status).toBe(200);

      const bad = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password: 'Password123!' });
      expect(bad.status).toBe(401);

      const good = await request(app)
        .post(`${base}/login`)
        .send({ email: user.email, password: 'NewPass789!' });
      expect(good.status).toBe(200);
    });
  });

  describe('Verify email', () => {
    it('should verify email end-to-end', async () => {
      const payload = buildUserPayload();
      const reg = await request(app).post(`${base}/register`).send(payload);
      const { verificationToken } = reg.body.data;

      const res = await request(app)
        .post(`${base}/verify-email`)
        .send({ token: verificationToken });
      expect(res.status).toBe(200);

      const user = await User.findOne({ email: payload.email });
      expect(user.emailVerifiedAt).not.toBeNull();
    });
  });
});