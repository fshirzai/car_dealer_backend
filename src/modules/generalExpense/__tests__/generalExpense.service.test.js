'use strict';

const service = require('../generalExpense.service');
const {
  createTestUser,
  createTestGeneralExpense,
} = require('../../../../tests/helpers/factories');
const {
  GENERAL_EXPENSE_CATEGORY,
  USER_ROLES,
} = require('../../../constants/enums');

const makeStaff = async () => {
  const { user } = await createTestUser({ role: USER_ROLES.ADMIN });
  return user;
};

describe('GeneralExpenseService (unit)', () => {
  describe('createExpense', () => {
    it('should record a general expense', async () => {
      const staff = await makeStaff();
      const expense = await service.createExpense(
        {
          category: GENERAL_EXPENSE_CATEGORY.RENT,
          description: 'September rent',
          amount: 2000,
        },
        staff.id
      );
      expect(expense.id).toBeDefined();
      expect(expense.amount).toBe(2000);
      expect(expense.createdById.id).toBe(staff.id);
    });
  });

  describe('listExpenses', () => {
    it('should filter by category', async () => {
      const staff = await makeStaff();
      await createTestGeneralExpense({
        createdById: staff.id,
        category: GENERAL_EXPENSE_CATEGORY.RENT,
      });
      await createTestGeneralExpense({
        createdById: staff.id,
        category: GENERAL_EXPENSE_CATEGORY.MARKETING,
      });

      const { items } = await service.listExpenses({
        category: GENERAL_EXPENSE_CATEGORY.MARKETING,
      });
      expect(items).toHaveLength(1);
    });
  });

  describe('getSummary', () => {
    it('should aggregate totals by category', async () => {
      const staff = await makeStaff();
      await createTestGeneralExpense({
        createdById: staff.id,
        category: GENERAL_EXPENSE_CATEGORY.RENT,
        amount: 1000,
      });
      await createTestGeneralExpense({
        createdById: staff.id,
        category: GENERAL_EXPENSE_CATEGORY.RENT,
        amount: 1500,
      });
      await createTestGeneralExpense({
        createdById: staff.id,
        category: GENERAL_EXPENSE_CATEGORY.UTILITIES,
        amount: 300,
      });

      const summary = await service.getSummary({});
      expect(summary.total).toBe(2800);
      expect(summary.count).toBe(3);
      expect(summary.byCategory[GENERAL_EXPENSE_CATEGORY.RENT].total).toBe(2500);
      expect(summary.byCategory[GENERAL_EXPENSE_CATEGORY.UTILITIES].total).toBe(300);
    });
  });

  describe('updateExpense / deleteExpense', () => {
    it('should update', async () => {
      const staff = await makeStaff();
      const { expense } = await createTestGeneralExpense({ createdById: staff.id });
      const updated = await service.updateExpense(expense.id, { amount: 999 });
      expect(updated.amount).toBe(999);
    });

    it('should delete', async () => {
      const staff = await makeStaff();
      const { expense } = await createTestGeneralExpense({ createdById: staff.id });
      const ok = await service.deleteExpense(expense.id);
      expect(ok).toBe(true);
    });

    it('should 404 on unknown id', async () => {
      await expect(
        service.updateExpense('507f1f77bcf86cd799439011', { amount: 1 })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});