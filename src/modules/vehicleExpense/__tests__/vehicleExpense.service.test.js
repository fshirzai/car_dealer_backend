'use strict';

const service = require('../vehicleExpense.service');
const {
  createTestVehicle,
  createTestUser,
  createTestVehicleExpense,
} = require('../../../../tests/helpers/factories');
const {
  EXPENSE_CATEGORY,
  VEHICLE_STATUS,
  USER_ROLES,
} = require('../../../constants/enums');

const makeStaff = async () => {
  const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
  return user;
};

describe('VehicleExpenseService (unit)', () => {
  describe('createExpense', () => {
    it('should record an expense for a vehicle', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();

      const expense = await service.createExpense(
        {
          vehicleId: vehicle.id,
          category: EXPENSE_CATEGORY.REPAIR,
          description: 'Replace brake pads',
          amount: 300,
        },
        staff.id
      );

      expect(expense.id).toBeDefined();
      expect(expense.category).toBe(EXPENSE_CATEGORY.REPAIR);
      expect(expense.amount).toBe(300);
      expect(expense.vehicleId.id).toBe(vehicle.id);
      expect(expense.createdById.id).toBe(staff.id);
    });

    it('should reject unknown vehicle', async () => {
      const staff = await makeStaff();
      await expect(
        service.createExpense(
          {
            vehicleId: '507f1f77bcf86cd799439011',
            category: EXPENSE_CATEGORY.REPAIR,
            description: 'x',
            amount: 100,
          },
          staff.id
        )
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should reject SOLD vehicle', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle({ status: VEHICLE_STATUS.SOLD });

      await expect(
        service.createExpense(
          {
            vehicleId: vehicle.id,
            category: EXPENSE_CATEGORY.REPAIR,
            description: 'x',
            amount: 100,
          },
          staff.id
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should normalize empty notes/documentUrl to null', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const expense = await service.createExpense(
        {
          vehicleId: vehicle.id,
          category: EXPENSE_CATEGORY.REPAIR,
          description: 'x',
          amount: 100,
          notes: '',
          documentUrl: '',
        },
        staff.id
      );
      expect(expense.notes).toBeNull();
      expect(expense.documentUrl).toBeNull();
    });
  });

  describe('listExpenses', () => {
    it('should filter by vehicleId', async () => {
      const staff = await makeStaff();
      const { vehicle: v1 } = await createTestVehicle();
      const { vehicle: v2 } = await createTestVehicle();
      await createTestVehicleExpense({ vehicle: v1, createdById: staff.id });
      await createTestVehicleExpense({ vehicle: v2, createdById: staff.id });

      const { items, meta } = await service.listExpenses({ vehicleId: v1.id });
      expect(items).toHaveLength(1);
      expect(meta.total).toBe(1);
    });

    it('should filter by category', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
        category: EXPENSE_CATEGORY.REPAIR,
      });
      await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
        category: EXPENSE_CATEGORY.TRANSPORT,
      });

      const { items } = await service.listExpenses({
        category: EXPENSE_CATEGORY.TRANSPORT,
      });
      expect(items).toHaveLength(1);
    });
  });

  describe('listByVehicle / sumByVehicle', () => {
    it('should list expenses for a vehicle', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      await createTestVehicleExpense({ vehicle, createdById: staff.id });
      await createTestVehicleExpense({ vehicle, createdById: staff.id });

      const items = await service.listByVehicle(vehicle.id);
      expect(items).toHaveLength(2);
    });

    it('should sum by category', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
        category: EXPENSE_CATEGORY.REPAIR,
        amount: 200,
      });
      await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
        category: EXPENSE_CATEGORY.REPAIR,
        amount: 300,
      });
      await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
        category: EXPENSE_CATEGORY.TRANSPORT,
        amount: 150,
      });

      const summary = await service.sumByVehicle(vehicle.id);
      expect(summary.total).toBe(650);
      expect(summary.byCategory[EXPENSE_CATEGORY.REPAIR]).toBe(500);
      expect(summary.byCategory[EXPENSE_CATEGORY.TRANSPORT]).toBe(150);
    });
  });

  describe('updateExpense', () => {
    it('should update an expense', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const { expense } = await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
      });

      const updated = await service.updateExpense(expense.id, { amount: 500 });
      expect(updated.amount).toBe(500);
    });

    it('should reject update on SOLD vehicle', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const { expense } = await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
      });
      // Mark vehicle SOLD directly
      await require('../../vehicle/vehicle.model').updateOne(
        { _id: vehicle.id },
        { $set: { status: VEHICLE_STATUS.SOLD } }
      );

      await expect(
        service.updateExpense(expense.id, { amount: 500 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('deleteExpense', () => {
    it('should delete', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const { expense } = await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
      });
      const ok = await service.deleteExpense(expense.id);
      expect(ok).toBe(true);
    });

    it('should reject delete on SOLD vehicle', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      const { expense } = await createTestVehicleExpense({
        vehicle,
        createdById: staff.id,
      });
      await require('../../vehicle/vehicle.model').updateOne(
        { _id: vehicle.id },
        { $set: { status: VEHICLE_STATUS.SOLD } }
      );

      await expect(service.deleteExpense(expense.id)).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe('deleteByVehicle', () => {
    it('should cascade delete', async () => {
      const staff = await makeStaff();
      const { vehicle } = await createTestVehicle();
      await createTestVehicleExpense({ vehicle, createdById: staff.id });
      await createTestVehicleExpense({ vehicle, createdById: staff.id });

      const count = await service.deleteByVehicle(vehicle.id);
      expect(count).toBe(2);
    });
  });
});