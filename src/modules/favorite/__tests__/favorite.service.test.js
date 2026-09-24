'use strict';

const service = require('../favorite.service');
const Favorite = require('../favorite.model');
const { createTestUser, createTestVehicle } = require('../../../../tests/helpers/factories');
const { USER_ROLES, VEHICLE_STATUS } = require('../../../constants/enums');

const makeCustomer = async () => {
  const { user } = await createTestUser({ role: USER_ROLES.CUSTOMER });
  return user;
};

describe('FavoriteService (unit)', () => {
  describe('addFavorite', () => {
    it('should add a favorite', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle();
      const fav = await service.addFavorite(user.id, vehicle.id);
      expect(fav.id).toBeDefined();
      expect(fav.vehicleId).toBeTruthy();
      expect(fav.vehicleId.id).toBe(vehicle.id);
    });

    it('should be idempotent (returns existing)', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle();
      const first = await service.addFavorite(user.id, vehicle.id);
      const second = await service.addFavorite(user.id, vehicle.id);
      expect(second.id).toBe(first.id);

      const count = await Favorite.countDocuments({ userId: user.id });
      expect(count).toBe(1);
    });

    it('should reject unknown vehicle', async () => {
      const user = await makeCustomer();
      await expect(
        service.addFavorite(user.id, '507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should reject SOLD vehicle', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle({ status: VEHICLE_STATUS.SOLD });
      await expect(service.addFavorite(user.id, vehicle.id)).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle();
      await service.addFavorite(user.id, vehicle.id);

      const result = await service.removeFavorite(user.id, vehicle.id);
      expect(result.removed).toBe(true);

      const exists = await Favorite.exists({ userId: user.id, vehicleId: vehicle.id });
      expect(exists).toBeFalsy();
    });

    it('should return removed: false for non-existent', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle();
      const result = await service.removeFavorite(user.id, vehicle.id);
      expect(result.removed).toBe(false);
    });
  });

  describe('toggleFavorite', () => {
    it('should add when not present', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle();
      const result = await service.toggleFavorite(user.id, vehicle.id);
      expect(result.favorited).toBe(true);
    });

    it('should remove when present', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle();
      await service.addFavorite(user.id, vehicle.id);
      const result = await service.toggleFavorite(user.id, vehicle.id);
      expect(result.favorited).toBe(false);
    });
  });

  describe('listFavorites', () => {
    it('should list user favorites with populated vehicle', async () => {
      const user = await makeCustomer();
      const { vehicle: v1 } = await createTestVehicle({ make: 'Toyota' });
      const { vehicle: v2 } = await createTestVehicle({ make: 'Honda' });
      await service.addFavorite(user.id, v1.id);
      await service.addFavorite(user.id, v2.id);

      const { items, meta } = await service.listFavorites(user.id, {});
      expect(items).toHaveLength(2);
      expect(meta.total).toBe(2);
      expect(items[0].vehicleId).toBeTruthy();
      expect(items[0].vehicleId.make).toBeDefined();
    });

    it('should not leak other users favorites', async () => {
      const userA = await makeCustomer();
      const userB = await makeCustomer();
      const { vehicle } = await createTestVehicle();
      await service.addFavorite(userA.id, vehicle.id);

      const { items: bItems } = await service.listFavorites(userB.id, {});
      expect(bItems).toHaveLength(0);
    });
  });

  describe('isFavorited', () => {
    it('should return true if favorited', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle();
      await service.addFavorite(user.id, vehicle.id);
      expect(await service.isFavorited(user.id, vehicle.id)).toBe(true);
    });

    it('should return false otherwise', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle();
      expect(await service.isFavorited(user.id, vehicle.id)).toBe(false);
    });
  });

  describe('cascade delete', () => {
    it('should remove all favorites for a vehicle', async () => {
      const userA = await makeCustomer();
      const userB = await makeCustomer();
      const { vehicle } = await createTestVehicle();
      await service.addFavorite(userA.id, vehicle.id);
      await service.addFavorite(userB.id, vehicle.id);

      const removed = await service.deleteByVehicle(vehicle.id);
      expect(removed).toBe(2);
    });

    it('should remove all favorites for a user', async () => {
      const user = await makeCustomer();
      const { vehicle: v1 } = await createTestVehicle();
      const { vehicle: v2 } = await createTestVehicle();
      await service.addFavorite(user.id, v1.id);
      await service.addFavorite(user.id, v2.id);

      const removed = await service.deleteByUser(user.id);
      expect(removed).toBe(2);
    });
  });
});