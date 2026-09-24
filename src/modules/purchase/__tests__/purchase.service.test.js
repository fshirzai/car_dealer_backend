'use strict';

const service = require('../purchase.service');
const Purchase = require('../purchase.model');
const {
  createTestVehicle,
  createTestSeller,
  createTestUser,
} = require('../../../../tests/helpers/factories');
const { PAYMENT_STATUS, USER_ROLES } = require('../../../constants/enums');

const makeStaff = async () => {
  const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
  return user;
};

describe('PurchaseService (unit)', () => {
  describe('createPurchase', () => {
    it('should create a purchase with generated purchaseNumber', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();

      const purchase = await service.createPurchase(
        {
          vehicleId: vehicle.id,
          sellerId: seller.id,
          purchasePrice: 9500,
          currency: 'USD',
          paymentStatus: PAYMENT_STATUS.PAID,
          notes: 'Paid in cash',
        },
        staff.id
      );

      expect(purchase.purchaseNumber).toMatch(/^PUR-\d{6}-\d{4}$/);
      expect(purchase.purchasePrice).toBe(9500);
      expect(purchase.vehicleId.id).toBe(vehicle.id);
      expect(purchase.sellerId.id).toBe(seller.id);
      expect(purchase.createdById.id).toBe(staff.id);
    });

    it('should reject duplicate purchase for the same vehicle', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();
      const payload = { vehicleId: vehicle.id, sellerId: seller.id, purchasePrice: 9000 };

      await service.createPurchase(payload, staff.id);
      await expect(service.createPurchase(payload, staff.id)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('should reject unknown vehicle', async () => {
      const staff = await makeStaff();
      const { seller } = await createTestSeller();
      await expect(
        service.createPurchase(
          {
            vehicleId: '507f1f77bcf86cd799439011',
            sellerId: seller.id,
            purchasePrice: 9000,
          },
          staff.id
        )
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should reject unknown seller', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      await expect(
        service.createPurchase(
          {
            vehicleId: vehicle.id,
            sellerId: '507f1f77bcf86cd799439011',
            purchasePrice: 9000,
          },
          staff.id
        )
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should reject inactive seller', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller({ isActive: false });
      await expect(
        service.createPurchase(
          {
            vehicleId: vehicle.id,
            sellerId: seller.id,
            purchasePrice: 9000,
          },
          staff.id
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should normalize empty optional fields to null', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();

      const purchase = await service.createPurchase(
        {
          vehicleId: vehicle.id,
          sellerId: seller.id,
          purchasePrice: 9000,
          notes: '',
          documentUrl: '',
        },
        staff.id
      );

      expect(purchase.notes).toBeNull();
      expect(purchase.documentUrl).toBeNull();
    });
  });

  describe('listPurchases', () => {
    it('should paginate + filter by sellerId', async () => {
      const staff = await makeStaff();
      const { seller: s1 } = await createTestSeller();
      const { seller: s2 } = await createTestSeller();
      const { vehicle: v1 } = await createTestVehicle();
      const { vehicle: v2 } = await createTestVehicle();

      await service.createPurchase(
        { vehicleId: v1.id, sellerId: s1.id, purchasePrice: 9000 },
        staff.id
      );
      await service.createPurchase(
        { vehicleId: v2.id, sellerId: s2.id, purchasePrice: 10000 },
        staff.id
      );

      const { items, meta } = await service.listPurchases({ sellerId: s1.id });
      expect(items).toHaveLength(1);
      expect(meta.total).toBe(1);
    });

    it('should filter by date range', async () => {
      const staff = await makeStaff();
      const { seller } = await createTestSeller();
      const { vehicle: v1 } = await createTestVehicle();
      const { vehicle: v2 } = await createTestVehicle();

      await service.createPurchase(
        {
          vehicleId: v1.id,
          sellerId: seller.id,
          purchasePrice: 9000,
          purchaseDate: new Date('2026-01-01'),
        },
        staff.id
      );
      await service.createPurchase(
        {
          vehicleId: v2.id,
          sellerId: seller.id,
          purchasePrice: 10000,
          purchaseDate: new Date('2026-06-01'),
        },
        staff.id
      );

      const { items } = await service.listPurchases({
        dateFrom: '2026-05-01',
        dateTo: '2026-07-01',
      });
      expect(items).toHaveLength(1);
    });
  });

  describe('updatePurchase', () => {
    it('should update price + payment status', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();
      const purchase = await service.createPurchase(
        { vehicleId: vehicle.id, sellerId: seller.id, purchasePrice: 9000 },
        staff.id
      );

      const updated = await service.updatePurchase(purchase.id, {
        purchasePrice: 8500,
        paymentStatus: PAYMENT_STATUS.PARTIAL,
      });
      expect(updated.purchasePrice).toBe(8500);
      expect(updated.paymentStatus).toBe(PAYMENT_STATUS.PARTIAL);
    });

    it('should 404 for unknown id', async () => {
      await expect(
        service.updatePurchase('507f1f77bcf86cd799439011', { purchasePrice: 1 })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deletePurchase', () => {
    it('should delete a purchase', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();
      const purchase = await service.createPurchase(
        { vehicleId: vehicle.id, sellerId: seller.id, purchasePrice: 9000 },
        staff.id
      );
      const ok = await service.deletePurchase(purchase.id);
      expect(ok).toBe(true);
      expect(await Purchase.findById(purchase.id)).toBeNull();
    });
  });

  describe('guards', () => {
    it('vehicleHasPurchase returns true/false', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const { seller } = await createTestSeller();

      expect(await service.vehicleHasPurchase(vehicle.id)).toBe(false);
      await service.createPurchase(
        { vehicleId: vehicle.id, sellerId: seller.id, purchasePrice: 9000 },
        staff.id
      );
      expect(await service.vehicleHasPurchase(vehicle.id)).toBe(true);
    });
  });
});