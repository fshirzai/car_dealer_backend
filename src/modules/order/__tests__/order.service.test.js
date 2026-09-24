'use strict';

const service = require('../order.service');
const Order = require('../order.model');
const Vehicle = require('../../vehicle/vehicle.model');
const {
  createTestCustomer,
  createTestVehicle,
} = require('../../../../tests/helpers/factories');
const { ORDER_STATUS, VEHICLE_STATUS } = require('../../../constants/enums');

const publishedAvailable = () => ({
  isPublished: true,
  status: VEHICLE_STATUS.AVAILABLE,
});

describe('OrderService (unit)', () => {
  describe('createOrder', () => {
    it('should create an order with one item and a snapshot', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());

      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });

      expect(order.orderNumber).toMatch(/^ORD-\d{6}-\d{4}$/);
      expect(order.status).toBe(ORDER_STATUS.PENDING);
      expect(order.customerEmail).toBe(user.email.toLowerCase());
      expect(order.items).toHaveLength(1);
      expect(order.items[0].vehicleStockNumber).toBe(vehicle.stockNumber);
      expect(order.items[0].unitPrice).toBe(vehicle.askingPrice);
    });

    it('should create with multiple distinct vehicles', async () => {
      const { user } = await createTestCustomer();
      const { vehicle: v1 } = await createTestVehicle(publishedAvailable());
      const { vehicle: v2 } = await createTestVehicle(publishedAvailable());

      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: v1.id }, { vehicleId: v2.id }],
      });
      expect(order.items).toHaveLength(2);
    });

    it('should reject empty items array', async () => {
      const { user } = await createTestCustomer();
      await expect(
        service.createOrder(user.id, { items: [] })
      ).rejects.toBeTruthy();
    });

    it('should reject a missing vehicle', async () => {
      const { user } = await createTestCustomer();
      await expect(
        service.createOrder(user.id, {
          items: [{ vehicleId: '507f1f77bcf86cd799439011' }],
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should reject unpublished vehicles', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle({ isPublished: false });
      await expect(
        service.createOrder(user.id, { items: [{ vehicleId: vehicle.id }] })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should reject SOLD vehicles', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle({
        isPublished: true,
        status: VEHICLE_STATUS.SOLD,
      });
      await expect(
        service.createOrder(user.id, { items: [{ vehicleId: vehicle.id }] })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should accept payload overrides for customer info', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());

      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
        customerName: 'Overridden Name',
        customerPhone: '0709999999',
        customerEmail: 'override@example.com',
      });

      expect(order.customerName).toBe('Overridden Name');
      expect(order.customerPhone).toBe('0709999999');
      expect(order.customerEmail).toBe('override@example.com');
    });

    it('should clear ordered vehicles from the customer cart', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());

      const CartItem = require('../../cartItem/cartItem.model');
      await CartItem.create({ userId: user.id, vehicleId: vehicle.id, quantity: 1 });

      await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });

      const remaining = await CartItem.countDocuments({ userId: user.id });
      expect(remaining).toBe(0);
    });
  });

  describe('listMyOrders / getMyOrder', () => {
    it('should list only my orders', async () => {
      const { user: me } = await createTestCustomer();
      const { user: other } = await createTestCustomer();
      const { vehicle: v1 } = await createTestVehicle(publishedAvailable());
      const { vehicle: v2 } = await createTestVehicle(publishedAvailable());

      await service.createOrder(me.id, { items: [{ vehicleId: v1.id }] });
      await service.createOrder(other.id, { items: [{ vehicleId: v2.id }] });

      const { items, meta } = await service.listMyOrders(me.id, {});
      expect(items).toHaveLength(1);
      expect(meta.total).toBe(1);
    });

    it('should hide staffNotes from the customer view', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const created = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });
      // Force staff notes for the check
      await Order.findByIdAndUpdate(created.id, { staffNotes: 'internal only' });

      const mine = await service.getMyOrder(user.id, created.id);
      expect(mine.staffNotes).toBeUndefined();
    });

    it('should 404 on someone else’s order', async () => {
      const { user: me } = await createTestCustomer();
      const { user: other } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());

      const otherOrder = await service.createOrder(other.id, {
        items: [{ vehicleId: vehicle.id }],
      });

      await expect(service.getMyOrder(me.id, otherOrder.id)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('cancelByCustomer', () => {
    it('should cancel a PENDING order', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });

      const cancelled = await service.cancelByCustomer(user.id, order.id, 'changed my mind');
      expect(cancelled.status).toBe(ORDER_STATUS.CANCELLED);
      expect(cancelled.cancelledAt).toBeTruthy();
      expect(cancelled.cancelReason).toBe('changed my mind');
    });

    it('should refuse to cancel a non-PENDING order', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });

      // Move to CONTACTED
      await service.updateStatus(order.id, ORDER_STATUS.CONTACTED);

      await expect(
        service.cancelByCustomer(user.id, order.id)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('listOrders (staff)', () => {
    it('should list all orders with pagination', async () => {
      const { user } = await createTestCustomer();
      const { vehicle: v1 } = await createTestVehicle(publishedAvailable());
      const { vehicle: v2 } = await createTestVehicle(publishedAvailable());
      await service.createOrder(user.id, { items: [{ vehicleId: v1.id }] });
      await service.createOrder(user.id, { items: [{ vehicleId: v2.id }] });

      const { items, meta } = await service.listOrders({});
      expect(items).toHaveLength(2);
      expect(meta.total).toBe(2);
    });

    it('should filter by status', async () => {
      const { user } = await createTestCustomer();
      const { vehicle: v1 } = await createTestVehicle(publishedAvailable());
      const { vehicle: v2 } = await createTestVehicle(publishedAvailable());
      const a = await service.createOrder(user.id, { items: [{ vehicleId: v1.id }] });
      await service.createOrder(user.id, { items: [{ vehicleId: v2.id }] });
      await service.updateStatus(a.id, ORDER_STATUS.CONTACTED);

      const { items } = await service.listOrders({ status: ORDER_STATUS.CONTACTED });
      expect(items).toHaveLength(1);
    });

    it('should search by order number/customer', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });

      const { items } = await service.listOrders({ search: order.orderNumber });
      expect(items).toHaveLength(1);
    });
  });

  describe('updateStatus', () => {
    it('should allow PENDING → CONTACTED', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });
      const updated = await service.updateStatus(order.id, ORDER_STATUS.CONTACTED);
      expect(updated.status).toBe(ORDER_STATUS.CONTACTED);
      expect(updated.contactedAt).toBeTruthy();
    });

    it('should reject invalid transition (PENDING → COMPLETED)', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });
      await expect(
        service.updateStatus(order.id, ORDER_STATUS.COMPLETED)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should reserve vehicles on CONFIRMED', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });

      await service.updateStatus(order.id, ORDER_STATUS.CONTACTED);
      await service.updateStatus(order.id, ORDER_STATUS.CONFIRMED);

      const reloaded = await Vehicle.findById(vehicle.id);
      expect(reloaded.status).toBe(VEHICLE_STATUS.RESERVED);
    });

    it('should release reserved vehicles on CANCELLED', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });

      await service.updateStatus(order.id, ORDER_STATUS.CONTACTED);
      await service.updateStatus(order.id, ORDER_STATUS.CONFIRMED);
      await service.updateStatus(order.id, ORDER_STATUS.CANCELLED);

      const reloaded = await Vehicle.findById(vehicle.id);
      expect(reloaded.status).toBe(VEHICLE_STATUS.AVAILABLE);
    });

    it('should reject transition out of terminal status', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });

      await service.updateStatus(order.id, ORDER_STATUS.CONTACTED);
      await service.updateStatus(order.id, ORDER_STATUS.CONFIRMED);
      await service.updateStatus(order.id, ORDER_STATUS.COMPLETED);

      await expect(
        service.updateStatus(order.id, ORDER_STATUS.CANCELLED)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('updateStaffNotes', () => {
    it('should set staff notes', async () => {
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const order = await service.createOrder(user.id, {
        items: [{ vehicleId: vehicle.id }],
      });

      const updated = await service.updateStaffNotes(order.id, 'Customer called');
      expect(updated.staffNotes).toBe('Customer called');
    });
  });
});