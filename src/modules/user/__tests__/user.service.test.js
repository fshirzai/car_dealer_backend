'use strict';

const userService = require('../user.service');
const User = require('../user.model');
const ApiError = require('../../../utils/ApiError');
const { buildUserPayload, createTestUser } = require('../../../../tests/helpers/factories');
const { USER_ROLES } = require('../../../constants/enums');

describe('UserService (unit)', () => {
  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const payload = buildUserPayload();
      const user = await userService.createUser(payload);

      expect(user).toBeDefined();
      expect(user.email).toBe(payload.email.toLowerCase());
      expect(user.name).toBe(payload.name);
      expect(user.role).toBe(USER_ROLES.CUSTOMER);
      expect(user.passwordHash).toBeUndefined(); // not selected

      const stored = await User.findById(user.id).select('+passwordHash');
      expect(stored.passwordHash).toBeDefined();
      expect(stored.passwordHash).not.toBe(payload.password);
      const match = await stored.comparePassword(payload.password);
      expect(match).toBe(true);
    });

    it('should reject duplicate email', async () => {
      const payload = buildUserPayload();
      await userService.createUser(payload);
      await expect(userService.createUser(payload)).rejects.toThrow(ApiError);
    });

    it('should respect provided role', async () => {
      const user = await userService.createUser(
        buildUserPayload({ role: USER_ROLES.ADMIN })
      );
      expect(user.role).toBe(USER_ROLES.ADMIN);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const { user } = await createTestUser();
      const found = await userService.getUserById(user.id);
      expect(found.id).toBe(user.id);
    });

    it('should throw not found for unknown id', async () => {
      await expect(
        userService.getUserById('507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getUserByEmail', () => {
    it('should find user by email (case-insensitive)', async () => {
      const { user } = await createTestUser();
      const found = await userService.getUserByEmail(user.email.toUpperCase());
      expect(found).not.toBeNull();
      expect(found.id).toBe(user.id);
    });

    it('should include password when requested', async () => {
      const { user, password } = await createTestUser();
      const found = await userService.getUserByEmail(user.email, true);
      expect(found.passwordHash).toBeDefined();
      expect(await found.comparePassword(password)).toBe(true);
    });
  });

  describe('listUsers', () => {
    beforeEach(async () => {
      await createTestUser({ role: USER_ROLES.ADMIN, name: 'Admin A' });
      await createTestUser({ role: USER_ROLES.CUSTOMER, name: 'Cust B' });
      await createTestUser({ role: USER_ROLES.SELLER, name: 'Seller C' });
    });

    it('should return paginated results', async () => {
      const { items, meta } = await userService.listUsers({ page: 1, limit: 2 });
      expect(items).toHaveLength(2);
      expect(meta.total).toBe(3);
      expect(meta.totalPages).toBe(2);
      expect(meta.hasNextPage).toBe(true);
    });

    it('should filter by role', async () => {
      const { items } = await userService.listUsers({ role: USER_ROLES.CUSTOMER });
      expect(items).toHaveLength(1);
      expect(items[0].role).toBe(USER_ROLES.CUSTOMER);
    });

    it('should filter by isActive', async () => {
      const { user } = await createTestUser();
      await userService.deactivateUser(user.id);
      const { items } = await userService.listUsers({ isActive: false });
      expect(items).toHaveLength(1);
    });

    it('should search by name/email', async () => {
      const { items } = await userService.listUsers({ search: 'Admin' });
      expect(items).toHaveLength(1);
      expect(items[0].name).toContain('Admin');
    });
  });

  describe('updateUser', () => {
    it('should update allowed fields', async () => {
      const { user } = await createTestUser();
      const updated = await userService.updateUser(user.id, { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');
    });

    it('should throw not found for unknown id', async () => {
      await expect(
        userService.updateUser('507f1f77bcf86cd799439011', { name: 'x' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should prevent non-admin from changing role', async () => {
      const { user } = await createTestUser();
      const actor = { role: USER_ROLES.SELLER };
      await expect(
        userService.updateUser(user.id, { role: USER_ROLES.ADMIN }, actor)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should allow admin to change role', async () => {
      const { user } = await createTestUser();
      const actor = { role: USER_ROLES.ADMIN };
      const updated = await userService.updateUser(
        user.id,
        { role: USER_ROLES.SELLER },
        actor
      );
      expect(updated.role).toBe(USER_ROLES.SELLER);
    });
  });

  describe('updateOwnProfile', () => {
    it('should update allowed profile fields only', async () => {
      const { user } = await createTestUser();
      const updated = await userService.updateOwnProfile(user.id, {
        name: 'New Name',
        phone: '123456',
        role: USER_ROLES.ADMIN, // should be ignored
      });
      expect(updated.name).toBe('New Name');
      expect(updated.phone).toBe('123456');
      expect(updated.role).toBe(USER_ROLES.CUSTOMER);
    });
  });

  describe('changePassword', () => {
    it('should change password when current matches', async () => {
      const { user, password } = await createTestUser();
      await userService.changePassword(user.id, password, 'NewPassword123!');
      const reloaded = await User.findById(user.id).select('+passwordHash');
      expect(await reloaded.comparePassword('NewPassword123!')).toBe(true);
    });

    it('should reject wrong current password', async () => {
      const { user } = await createTestUser();
      await expect(
        userService.changePassword(user.id, 'wrong', 'NewPassword123!')
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('deactivate/activate', () => {
    it('should toggle isActive', async () => {
      const { user } = await createTestUser();
      const deactivated = await userService.deactivateUser(user.id);
      expect(deactivated.isActive).toBe(false);
      const activated = await userService.activateUser(user.id);
      expect(activated.isActive).toBe(true);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const { user } = await createTestUser();
      const ok = await userService.deleteUser(user.id);
      expect(ok).toBe(true);
      await expect(userService.getUserById(user.id)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});