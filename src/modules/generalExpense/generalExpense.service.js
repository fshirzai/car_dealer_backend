'use strict';

const GeneralExpense = require('./generalExpense.model');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { emit } = require('../auditLog/auditLog.utils');
const {
  GENERAL_EXPENSE_SELECT_FIELDS,
  GENERAL_EXPENSE_CREATED_BY_POPULATE,
} = require('./generalExpense.constants');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nullify = (v) => (v === '' || v === undefined ? null : v);

const populateAll = (q) => q.populate(GENERAL_EXPENSE_CREATED_BY_POPULATE);

const findByIdOrFail = async (id) => {
  const expense = await populateAll(
    GeneralExpense.findById(id).select(GENERAL_EXPENSE_SELECT_FIELDS)
  );
  if (!expense) throw ApiError.notFound('General expense not found');
  return expense;
};

const createExpense = async (payload, createdById) => {
  const expense = await GeneralExpense.create({
    category: payload.category,
    description: payload.description.trim(),
    amount: payload.amount,
    currency: payload.currency || 'USD',
    expenseDate: payload.expenseDate ? new Date(payload.expenseDate) : new Date(),
    documentUrl: nullify(payload.documentUrl),
    notes: nullify(payload.notes),
    createdById,
  });

  await emit({
    action: 'CREATE',
    entityType: 'GeneralExpense',
    entityId: expense.id,
    userId: createdById,
    description: `Recorded general ${expense.category} expense of $${expense.amount}`,
    newValues: expense.toObject(),
  });

  return findByIdOrFail(expense.id);
};

const listExpenses = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.category) filter.category = query.category;

  if (query.dateFrom || query.dateTo) {
    filter.expenseDate = {};
    if (query.dateFrom) filter.expenseDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.expenseDate.$lte = new Date(query.dateTo);
  }

  if (query.search) {
    const s = escapeRegex(query.search);
    filter.$or = [{ description: { $regex: s, $options: 'i' } }];
  }

  const sort = query.sort || '-expenseDate';

  const [items, total] = await Promise.all([
    populateAll(
      GeneralExpense.find(filter)
        .select(GENERAL_EXPENSE_SELECT_FIELDS)
        .sort(sort)
        .skip(skip)
        .limit(limit)
    ),
    GeneralExpense.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const getExpenseById = async (id) => findByIdOrFail(id);

const getSummary = async ({ dateFrom, dateTo } = {}) => {
  const match = {};
  if (dateFrom || dateTo) {
    match.expenseDate = {};
    if (dateFrom) match.expenseDate.$gte = new Date(dateFrom);
    if (dateTo) match.expenseDate.$lte = new Date(dateTo);
  }

  const pipeline = [];
  if (Object.keys(match).length > 0) pipeline.push({ $match: match });
  pipeline.push({
    $group: {
      _id: '$category',
      total: { $sum: '$amount' },
      count: { $sum: 1 },
    },
  });

  const agg = await GeneralExpense.aggregate(pipeline);

  const byCategory = {};
  let total = 0;
  let count = 0;
  agg.forEach((row) => {
    byCategory[row._id] = { total: row.total, count: row.count };
    total += row.total;
    count += row.count;
  });

  return { total, count, byCategory };
};

const updateExpense = async (id, payload, actorId = null) => {
  const expense = await GeneralExpense.findById(id);
  if (!expense) throw ApiError.notFound('General expense not found');

  const before = expense.toObject();

  const directFields = ['category', 'description', 'amount', 'currency', 'documentUrl', 'notes'];
  directFields.forEach((key) => {
    if (payload[key] === undefined) return;
    if (key === 'description') {
      expense.description = payload.description.trim();
    } else if (key === 'documentUrl' || key === 'notes') {
      expense[key] = nullify(payload[key]);
    } else {
      expense[key] = payload[key];
    }
  });

  if (payload.expenseDate !== undefined) {
    expense.expenseDate = new Date(payload.expenseDate);
  }

  await expense.save();

  await emit({
    action: 'UPDATE',
    entityType: 'GeneralExpense',
    entityId: expense.id,
    userId: actorId,
    description: `Updated general ${expense.category} expense`,
    oldValues: before,
    newValues: expense.toObject(),
  });

  return findByIdOrFail(expense.id);
};

const deleteExpense = async (id, actorId = null) => {
  const expense = await GeneralExpense.findByIdAndDelete(id);
  if (!expense) throw ApiError.notFound('General expense not found');

  await emit({
    action: 'DELETE',
    entityType: 'GeneralExpense',
    entityId: id,
    userId: actorId,
    description: `Deleted general ${expense.category} expense of $${expense.amount}`,
    oldValues: expense.toObject(),
  });

  return true;
};

module.exports = {
  createExpense,
  listExpenses,
  getExpenseById,
  getSummary,
  updateExpense,
  deleteExpense,
};