'use strict';

const service = require('../auditLog.service');
const AuditLog = require('../auditLog.model');
const { emit, stripSensitive } = require('../auditLog.utils');
const {
  createTestUser,
  createTestAuditLog,
} = require('../../../../tests/helpers/factories');
const { USER_ROLES } = require('../../../constants/enums');
const { ACTION } = require('../auditLog.constants');

const makeAdmin = async () => {
  const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
  return user;
};

describe('AuditLog — utils', () => {
  describe('stripSensitive', () => {
    it('removes password fields', () => {
      const out = stripSensitive({
        name: 'Alice',
        password: 'secret',
        passwordHash: 'hash',
        newPassword: 'new',
      });
      expect(out.name).toBe('Alice');
      expect(out.password).toBeUndefined();
      expect(out.passwordHash).toBeUndefined();
      expect(out.newPassword).toBeUndefined();
    });

    it('removes token fields recursively', () => {
      const out = stripSensitive({
        user: { email: 'a@b.com', token: 'xyz', accessToken: 'abc' },
        tokens: [{ refreshToken: 'r1' }, { refreshToken: 'r2' }],
      });
      expect(out.user.email).toBe('a@b.com');
      expect(out.user.token).toBeUndefined();
      expect(out.user.accessToken).toBeUndefined();
      expect(out.tokens[0].refreshToken).toBeUndefined();
    });

    it('preserves non-sensitive fields', () => {
      const out = stripSensitive({ make: 'Toyota', price: 100 });
      expect(out).toEqual({ make: 'Toyota', price: 100 });
    });

    it('handles circular references', () => {
      const a = { name: 'a' };
      a.self = a;
      const out = stripSensitive(a);
      expect(out.name).toBe('a');
      expect(out.self).toBe('[Circular]');
    });
  });

  describe('emit', () => {
    it('writes a log entry', async () => {
      const admin = await makeAdmin();
      const ok = await emit({
        action: ACTION.CREATE,
        entityType: 'Vehicle',
        entityId: 'x1',
        userId: admin.id,
        description: 'Vehicle created',
        newValues: { make: 'Toyota', password: 'shouldBeStripped' },
      });
      expect(ok).toBe(true);

      const log = await AuditLog.findOne({ entityId: 'x1' });
      expect(log).toBeTruthy();
      expect(log.newValues.make).toBe('Toyota');
      expect(log.newValues.password).toBeUndefined();
    });

    it('never throws on invalid input', async () => {
      const ok = await emit({});
      expect(ok).toBeNull();
    });
  });
});

describe('AuditLog — service', () => {
  describe('listLogs', () => {
    it('should paginate', async () => {
      const admin = await makeAdmin();
      await createTestAuditLog({ userId: admin.id });
      await createTestAuditLog({ userId: admin.id });

      const { items, meta } = await service.listLogs({});
      expect(items).toHaveLength(2);
      expect(meta.total).toBe(2);
    });

    it('should filter by action', async () => {
      const admin = await makeAdmin();
      await createTestAuditLog({ userId: admin.id, action: ACTION.CREATE });
      await createTestAuditLog({ userId: admin.id, action: ACTION.DELETE });

      const { items } = await service.listLogs({ action: ACTION.DELETE });
      expect(items).toHaveLength(1);
    });

    it('should filter by entityType', async () => {
      const admin = await makeAdmin();
      await createTestAuditLog({ userId: admin.id, entityType: 'Vehicle' });
      await createTestAuditLog({ userId: admin.id, entityType: 'Order' });

      const { items } = await service.listLogs({ entityType: 'Vehicle' });
      expect(items).toHaveLength(1);
    });
  });

  describe('listByEntity', () => {
    it('should return logs for a specific entity', async () => {
      const admin = await makeAdmin();
      await createTestAuditLog({
        userId: admin.id,
        entityType: 'Vehicle',
        entityId: 'abc',
      });
      await createTestAuditLog({
        userId: admin.id,
        entityType: 'Vehicle',
        entityId: 'xyz',
      });

      const logs = await service.listByEntity('Vehicle', 'abc');
      expect(logs).toHaveLength(1);
    });
  });

  describe('getLogById', () => {
    it('should return a log', async () => {
      const admin = await makeAdmin();
      const { log } = await createTestAuditLog({ userId: admin.id });
      const found = await service.getLogById(log.id);
      expect(found.id).toBe(log.id);
    });

    it('should 404 on unknown id', async () => {
      await expect(
        service.getLogById('507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});