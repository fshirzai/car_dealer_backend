'use strict';

const service = require('../vehicle.profit.service');
const {
  createTestVehicle,
  createTestUser,
  createTestSeller,
  createTestPurchase,
  createTestSale,
  createTestVehicleExpense,
} = require('../../../../tests/helpers/factories');
const {
  USER_ROLES,
  EXPENSE_CATEGORY,
  VEHICLE_STATUS,
  SALE_CHANNEL,
} = require('../../../constants/enums');

const makeStaff = async () => {
  const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
  return user;
};

describe('VehicleProfitService (unit)', () => {
  describe('getVehicleProfit', () => {
    it('should compute profit for a fully processed vehicle', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({
        isPublished: true,
        purchasePrice: 10000,
      });
      const { seller } = await createTestSeller();

      await createTestPurchase({
        vehicle,
        seller,
        createdById: staff.id,
        purchasePrice: 10000,
      });

      await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
        category: EXPENSE_CATEGORY.TRANSPORT,
        amount: 300,
      });
      await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
        category: EXPENSE_CATEGORY.CUSTOMS,
        amount: 500,
      });
      await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
        category: EXPENSE_CATEGORY.REPAIR,
        amount: 200,
      });

      await createTestSale({
        vehicle,
        createdById: staff.id,
        salePrice: 13000,
        channel: SALE_CHANNEL.OFFLINE,
      });

      const profit = await service.getVehicleProfit(vehicle.id);

      expect(profit.purchasePrice).toBe(10000);
      expect(profit.totalExpenses).toBe(1000); // 300 + 500 + 200
      expect(profit.totalCost).toBe(11000);
      expect(profit.salePrice).toBe(13000);
      expect(profit.grossProfit).toBe(2000);
      expect(profit.hasSale).toBe(true);
      expect(profit.hasPurchase).toBe(true);
    });

    it('should return null salePrice/grossProfit when unsold', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({ purchasePrice: 8000 });

      await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
        amount: 500,
      });

      const profit = await service.getVehicleProfit(vehicle.id);

      expect(profit.purchasePrice).toBe(8000); // fallback to vehicle
      expect(profit.totalExpenses).toBe(500);
      expect(profit.totalCost).toBe(8500);
      expect(profit.salePrice).toBeNull();
      expect(profit.grossProfit).toBeNull();
      expect(profit.hasSale).toBe(false);
    });

    it('should use purchase record over vehicle.purchasePrice when both exist', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({ purchasePrice: 9000 });
      const { seller } = await createTestSeller();

      await createTestPurchase({
        vehicle,
        seller,
        createdById: staff.id,
        purchasePrice: 10000,
      });

      const profit = await service.getVehicleProfit(vehicle.id);
      expect(profit.purchasePrice).toBe(10000);
    });

    it('should 404 for unknown vehicle', async () => {
      await expect(
        service.getVehicleProfit('507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should handle zero expenses', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({ purchasePrice: 12000 });

      const profit = await service.getVehicleProfit(vehicle.id);
      expect(profit.totalExpenses).toBe(0);
      expect(profit.totalCost).toBe(12000);
    });
  });

  describe('getProfitReport', () => {
    it('should aggregate totals across sales', async () => {
      const staff = await makeStaff();
      const { seller } = await createTestSeller();

      const { vehicle: v1 } = await createTestVehicle({ isPublished: true });
      await createTestPurchase({
        vehicle: v1,
        seller,
        createdById: staff.id,
        purchasePrice: 10000,
      });
      await createTestVehicleExpense({
        vehicle: v1,
        createdById: staff.id,
        amount: 500,
      });
      await createTestSale({
        vehicle: v1,
        createdById: staff.id,
        salePrice: 13000,
      });

      const { vehicle: v2 } = await createTestVehicle({ isPublished: true });
      await createTestPurchase({
        vehicle: v2,
        seller,
        createdById: staff.id,
        purchasePrice: 8000,
      });
      await createTestSale({
        vehicle: v2,
        createdById: staff.id,
        salePrice: 9500,
      });

      const report = await service.getProfitReport({});

      expect(report.items).toHaveLength(2);
      expect(report.totals.count).toBe(2);
      expect(report.totals.totalRevenue).toBe(22500);
      expect(report.totals.totalCost).toBe(18500); // (10000+500) + 8000
      expect(report.totals.totalGrossProfit).toBe(4000); // 2500 + 1500
    });

    it('should return empty totals when no sales', async () => {
      const report = await service.getProfitReport({});
      expect(report.items).toHaveLength(0);
      expect(report.totals.count).toBe(0);
      expect(report.totals.totalRevenue).toBe(0);
    });
  });
});