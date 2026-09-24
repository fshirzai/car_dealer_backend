'use strict';

const service = require('../cartItem.service');
const CartItem = require('../cartItem.model');
const { createTestUser, createTestVehicle } = require('../../../../tests/helpers/factories');
const { USER_ROLES, VEHICLE_STATUS } = require('../../../constants/enums');

const makeCustomer = async () => {
  const { user } = await createTestUser({ role: USER_ROLES.CUSTOMER });
  return user;
};

const publishedAvailable = () => ({ isPublished: true });

describe('CartItemService (unit)', () => {
  describe('addToCart', () => {
    it('should add a vehicle to cart', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const item = await service.addToCart(user.id, vehicle.id);
      expect(item.id).toBeDefined();
      expect(item.quantity).toBe(1);
      expect(item.vehicleId.id).toBe(vehicle.id);
    });

    it('should be idempotent', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const first = await service.addToCart(user.id, vehicle.id);
      const second = await service.addToCart(user.id, vehicle.id);
      expect(second.id).toBe(first.id);

      const count = await CartItem.countDocuments({ userId: user.id });
      expect(count).toBe(1);
    });

    it('should reject unpublished vehicle', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle({ isPublished: false });
      await expect(service.addToCart(user.id, vehicle.id)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should reject SOLD vehicle', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle({
        isPublished: true,
        status: VEHICLE_STATUS.SOLD,
      });
      await expect(service.addToCart(user.id, vehicle.id)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should reject RESERVED vehicle', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle({
        isPublished: true,
        status: VEHICLE_STATUS.RESERVED,
      });
      await expect(service.addToCart(user.id, vehicle.id)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should reject unknown vehicle', async () => {
      const user = await makeCustomer();
      await expect(
        service.addToCart(user.id, '507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('removeFromCart', () => {
    it('should remove item', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      await service.addToCart(user.id, vehicle.id);

      const result = await service.removeFromCart(user.id, vehicle.id);
      expect(result.removed).toBe(true);
    });

    it('should be safe for non-existing item', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const result = await service.removeFromCart(user.id, vehicle.id);
      expect(result.removed).toBe(false);
    });
  });

  describe('listCart', () => {
    it('should list user cart with populated vehicles', async () => {
      const user = await makeCustomer();
      const { vehicle: v1 } = await createTestVehicle(publishedAvailable());
      const { vehicle: v2 } = await createTestVehicle(publishedAvailable());
      await service.addToCart(user.id, v1.id);
      await service.addToCart(user.id, v2.id);

      const { items, meta } = await service.listCart(user.id, {});
      expect(items).toHaveLength(2);
      expect(meta.total).toBe(2);
      expect(items[0].vehicleId.make).toBeDefined();
    });

    it('should not leak other users cart', async () => {
      const userA = await makeCustomer();
      const userB = await makeCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      await service.addToCart(userA.id, vehicle.id);

      const { items } = await service.listCart(userB.id, {});
      expect(items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should remove all items', async () => {
      const user = await makeCustomer();
      const { vehicle: v1 } = await createTestVehicle(publishedAvailable());
      const { vehicle: v2 } = await createTestVehicle(publishedAvailable());
      await service.addToCart(user.id, v1.id);
      await service.addToCart(user.id, v2.id);

      const result = await service.clearCart(user.id);
      expect(result.cleared).toBe(2);
      const count = await CartItem.countDocuments({ userId: user.id });
      expect(count).toBe(0);
    });
  });

  describe('countCart', () => {
    it('should count items', async () => {
      const user = await makeCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      await service.addToCart(user.id, vehicle.id);
      expect(await service.countCart(user.id)).toBe(1);
    });
  });

  describe('cascade deletes', () => {
    it('should remove all cart items for a vehicle', async () => {
      const userA = await makeCustomer();
      const userB = await makeCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      await service.addToCart(userA.id, vehicle.id);
      await service.addToCart(userB.id, vehicle.id);

      const removed = await service.deleteByVehicle(vehicle.id);
      expect(removed).toBe(2);
    });

    it('should remove all cart items for a user', async () => {
      const user = await makeCustomer();
      const { vehicle: v1 } = await createTestVehicle(publishedAvailable());
      const { vehicle: v2 } = await createTestVehicle(publishedAvailable());
      await service.addToCart(user.id, v1.id);
      await service.addToCart(user.id, v2.id);

      const removed = await service.deleteByUser(user.id);
      expect(removed).toBe(2);
    });
  });
});