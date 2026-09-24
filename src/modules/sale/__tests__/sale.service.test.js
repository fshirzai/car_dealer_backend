'use strict';

const service = require('../sale.service');
const Sale = require('../sale.model');
const Vehicle = require('../../vehicle/vehicle.model');
const {
  createTestVehicle,
  createTestUser,
  createTestOrder,
} = require('../../../../tests/helpers/factories');
const {
  SALE_CHANNEL,
  PAYMENT_STATUS,
  VEHICLE_STATUS,
  USER_ROLES,
} = require('../../../constants/enums');

const makeStaff = async () => {
  const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
  return user;
};

describe('SaleService (unit)', () => {
  describe('createSale', () => {
    it('should create a sale and mark vehicle as SOLD', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({ isPublished: true });

      const sale = await service.createSale(
        {
          vehicleId: vehicle.id,
          salePrice: 13500,
          channel: SALE_CHANNEL.OFFLINE,
          paymentStatus: PAYMENT_STATUS.PAID,
        },
        staff.id
      );

      expect(sale.saleNumber).toMatch(/^SAL-\d{6}-\d{4}$/);
      expect(sale.salePrice).toBe(13500);

      const reloaded = await Vehicle.findById(vehicle.id);
      expect(reloaded.status).toBe(VEHICLE_STATUS.SOLD);
      expect(reloaded.isPublished).toBe(false);
    });

    it('should allow ONLINE channel with orderId', async () => {
      const staff = await makeStaff();
      const { user: customer } = await createTestUser({ role: USER_ROLES.CUSTOMER });
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const { order } = await createTestOrder(customer, [vehicle]);

      const sale = await service.createSale(
        {
          vehicleId: vehicle.id,
          customerId: customer.id,
          orderId: order.id,
          salePrice: 13000,
          channel: SALE_CHANNEL.ONLINE,
        },
        staff.id
      );

      expect(sale.channel).toBe(SALE_CHANNEL.ONLINE);
      expect(sale.orderId.id).toBe(order.id);
      expect(sale.customerId.id).toBe(customer.id);
    });

    it('should allow OFFLINE walk-in without customer', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({ isPublished: true });

      const sale = await service.createSale(
        {
          vehicleId: vehicle.id,
          salePrice: 12000,
          channel: SALE_CHANNEL.OFFLINE,
        },
        staff.id
      );

      expect(sale.customerId).toBeNull();
    });

    it('should reject selling an already SOLD vehicle', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({
        isPublished: true,
        status: VEHICLE_STATUS.SOLD,
      });

      await expect(
        service.createSale(
          {
            vehicleId: vehicle.id,
            salePrice: 12000,
            channel: SALE_CHANNEL.OFFLINE,
          },
          staff.id
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should reject duplicate sale for the same vehicle', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({ isPublished: true });
      await service.createSale(
        {
          vehicleId: vehicle.id,
          salePrice: 12000,
          channel: SALE_CHANNEL.OFFLINE,
        },
        staff.id
      );

      await expect(
        service.createSale(
          {
            vehicleId: vehicle.id,
            salePrice: 12000,
            channel: SALE_CHANNEL.OFFLINE,
          },
          staff.id
        )
      ).rejects.toBeTruthy();
    });

    it('should reject unknown vehicle', async () => {
      const staff = await makeStaff();
      await expect(
        service.createSale(
          {
            vehicleId: '507f1f77bcf86cd799439011',
            salePrice: 10000,
            channel: SALE_CHANNEL.OFFLINE,
          },
          staff.id
        )
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should reject an order that does not include the vehicle', async () => {
      const staff = await makeStaff();
      const { user: customer } = await createTestUser({ role: USER_ROLES.CUSTOMER });
      const { vehicle: v1 } = await createTestVehicle({ isPublished: true });
      const { vehicle: v2 } = await createTestVehicle({ isPublished: true });
      const { order } = await createTestOrder(customer, [v1]);

      await expect(
        service.createSale(
          {
            vehicleId: v2.id,
            orderId: order.id,
            salePrice: 12000,
            channel: SALE_CHANNEL.ONLINE,
          },
          staff.id
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('listSales', () => {
    it('should paginate + filter by channel', async () => {
      const staff = await makeStaff();
      const { vehicle: v1 } = await createTestVehicle({ isPublished: true });
      const { vehicle: v2 } = await createTestVehicle({ isPublished: true });

      await service.createSale(
        { vehicleId: v1.id, salePrice: 10000, channel: SALE_CHANNEL.OFFLINE },
        staff.id
      );
      await service.createSale(
        { vehicleId: v2.id, salePrice: 11000, channel: SALE_CHANNEL.ONLINE },
        staff.id
      );

      const { items, meta } = await service.listSales({ channel: SALE_CHANNEL.OFFLINE });
      expect(items).toHaveLength(1);
      expect(meta.total).toBe(1);
    });
  });

  describe('updateSale', () => {
    it('should update price + payment status', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const sale = await service.createSale(
        {
          vehicleId: vehicle.id,
          salePrice: 12000,
          channel: SALE_CHANNEL.OFFLINE,
        },
        staff.id
      );

      const updated = await service.updateSale(sale.id, {
        salePrice: 12500,
        paymentStatus: PAYMENT_STATUS.PARTIAL,
      });
      expect(updated.salePrice).toBe(12500);
      expect(updated.paymentStatus).toBe(PAYMENT_STATUS.PARTIAL);
    });
  });

  describe('deleteSale', () => {
    it('should delete sale and restore vehicle to AVAILABLE + published', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const sale = await service.createSale(
        {
          vehicleId: vehicle.id,
          salePrice: 12000,
          channel: SALE_CHANNEL.OFFLINE,
        },
        staff.id
      );

      const ok = await service.deleteSale(sale.id);
      expect(ok).toBe(true);

      const reloaded = await Vehicle.findById(vehicle.id);
      expect(reloaded.status).toBe(VEHICLE_STATUS.AVAILABLE);
      expect(reloaded.isPublished).toBe(true);
    });
  });

  describe('guards', () => {
    it('vehicleHasSale returns true/false', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({ isPublished: true });
      expect(await service.vehicleHasSale(vehicle.id)).toBe(false);

      await service.createSale(
        { vehicleId: vehicle.id, salePrice: 12000, channel: SALE_CHANNEL.OFFLINE },
        staff.id
      );
      expect(await service.vehicleHasSale(vehicle.id)).toBe(true);
    });
  });
});