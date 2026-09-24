'use strict';

const service = require('../customerProfile.service');
const CustomerProfile = require('../customerProfile.model');
const User = require('../../user/user.model');
const { USER_ROLES } = require('../../../constants/enums');
const {
  buildCustomerProfilePayload,
  createTestCustomer,
  createTestUser,
} = require('../../../../tests/helpers/factories');

describe('CustomerProfileService (unit)', () => {
  describe('createForUser', () => {
    it('should create a profile for a CUSTOMER user', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.CUSTOMER });
      const profile = await service.createForUser(user);

      expect(profile).toBeTruthy();
      expect(profile.userId.toString()).toBe(user.id);
      expect(profile.fullName).toBe(user.name);
    });

    it('should return null for non-customer users', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
      const result = await service.createForUser(user);
      expect(result).toBeNull();
    });

    it('should be idempotent (return existing profile)', async () => {
      const { user, profile } = await createTestCustomer();
      const again = await service.createForUser(user);
      expect(again.id).toBe(profile.id);
    });
  });

  describe('createProfile (admin)', () => {
    it('should create a profile for a customer user', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.CUSTOMER });
      const payload = {
        userId: user.id,
        ...buildCustomerProfilePayload(),
      };
      const profile = await service.createProfile(payload);
      expect(profile.userId.id).toBe(user.id);
    });

    it('should reject non-customer users', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
      await expect(
        service.createProfile({ userId: user.id, ...buildCustomerProfilePayload() })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should reject unknown user', async () => {
      await expect(
        service.createProfile({
          userId: '507f1f77bcf86cd799439011',
          ...buildCustomerProfilePayload(),
        })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should reject duplicate profile for same user', async () => {
      const { user } = await createTestCustomer();
      await expect(
        service.createProfile({ userId: user.id, ...buildCustomerProfilePayload() })
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('getProfileById', () => {
    it('should return a populated profile', async () => {
      const { profile } = await createTestCustomer();
      const found = await service.getProfileById(profile.id);
      expect(found.id).toBe(profile.id);
      expect(found.userId).toBeTruthy();
      expect(found.userId.email).toBeDefined();
    });

    it('should throw 404 for unknown id', async () => {
      await expect(
        service.getProfileById('507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('listProfiles', () => {
    beforeEach(async () => {
      await createTestCustomer({ name: 'Alice', city: 'Kabul' });
      await createTestCustomer({ name: 'Bob', city: 'Herat' });
      await createTestCustomer({ name: 'Carol', city: 'Kabul' });
    });

    it('should paginate', async () => {
      const { items, meta } = await service.listProfiles({ page: 1, limit: 2 });
      expect(items).toHaveLength(2);
      expect(meta.total).toBe(3);
      expect(meta.totalPages).toBe(2);
    });

    it('should filter by city (case-insensitive)', async () => {
      const { items } = await service.listProfiles({ city: 'kabul' });
      expect(items.length).toBe(2);
    });

    it('should search by fullName', async () => {
      const { items } = await service.listProfiles({ search: 'Bob' });
      expect(items).toHaveLength(1);
      expect(items[0].fullName).toContain('Bob');
    });

    it('should sort by fullName', async () => {
      const { items } = await service.listProfiles({ sort: 'fullName' });
      expect(items[0].fullName).toBe('Alice');
    });
  });

  describe('getMyProfile', () => {
    it('should return the current user profile', async () => {
      const { user, profile } = await createTestCustomer();
      const mine = await service.getMyProfile(user.id);
      expect(mine.id).toBe(profile.id);
    });

    it('should self-heal missing profile for customers', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.CUSTOMER });
      // No profile exists yet
      await CustomerProfile.deleteMany({ userId: user.id });

      const profile = await service.getMyProfile(user.id);
      expect(profile).toBeTruthy();
      expect(profile.userId.id).toBe(user.id);
    });

    it('should forbid non-customer users', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
      await expect(service.getMyProfile(user.id)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('updateProfile (admin)', () => {
    it('should update allowed fields', async () => {
      const { profile } = await createTestCustomer();
      const updated = await service.updateProfile(profile.id, {
        city: 'Mazar',
        notes: 'Updated note',
      });
      expect(updated.city).toBe('Mazar');
      expect(updated.notes).toBe('Updated note');
    });

    it('should throw 404 for unknown id', async () => {
      await expect(
        service.updateProfile('507f1f77bcf86cd799439011', { city: 'X' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateMyProfile', () => {
    it('should only update safe self-edit fields', async () => {
      const { user } = await createTestCustomer();
      const updated = await service.updateMyProfile(user.id, {
        fullName: 'New Name',
        city: 'Kandahar',
        notes: 'attempted admin field', // should be ignored
      });
      expect(updated.fullName).toBe('New Name');
      expect(updated.city).toBe('Kandahar');
      expect(updated.notes).toBe('VIP customer'); // unchanged
    });

    it('should throw 404 if no profile', async () => {
      const { user } = await createTestUser({ role: USER_ROLES.CUSTOMER });
      await CustomerProfile.deleteMany({ userId: user.id });
      await expect(
        service.updateMyProfile(user.id, { fullName: 'X' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile', async () => {
      const { profile } = await createTestCustomer();
      const ok = await service.deleteProfile(profile.id);
      expect(ok).toBe(true);
      await expect(service.getProfileById(profile.id)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 404 for unknown id', async () => {
      await expect(
        service.deleteProfile('507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('integration with auth register (via service)', () => {
    it('should auto-create profile when a customer registers', async () => {
      const authService = require('../../auth/auth.service');
      const email = `auto_${Date.now()}@test.com`;
      const result = await authService.register({
        name: 'Auto User',
        email,
        password: 'Password123!',
      });

      const profile = await CustomerProfile.findOne({
        userId: result.user.id,
      });
      expect(profile).toBeTruthy();
      expect(profile.fullName).toBe('Auto User');
    });
  });
});