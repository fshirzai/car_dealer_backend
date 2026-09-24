'use strict';

const AuditLog = require('./auditLog.model');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const {
  AUDIT_LOG_SELECT_FIELDS,
  AUDIT_LOG_USER_POPULATE,
} = require('./auditLog.constants');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const listLogs = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.userId) filter.userId = query.userId;
  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.entityId) filter.entityId = query.entityId;

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
  }

  if (query.search) {
    const s = escapeRegex(query.search);
    filter.$or = [
      { description: { $regex: s, $options: 'i' } },
      { entityType: { $regex: s, $options: 'i' } },
    ];
  }

  const sort = query.sort || '-createdAt';

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .select(AUDIT_LOG_SELECT_FIELDS)
      .populate(AUDIT_LOG_USER_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

const getLogById = async (id) => {
  const log = await AuditLog.findById(id)
    .select(AUDIT_LOG_SELECT_FIELDS)
    .populate(AUDIT_LOG_USER_POPULATE);
  if (!log) throw ApiError.notFound('Audit log not found');
  return log;
};

const listByEntity = async (entityType, entityId) => {
  return AuditLog.find({ entityType, entityId })
    .select(AUDIT_LOG_SELECT_FIELDS)
    .populate(AUDIT_LOG_USER_POPULATE)
    .sort({ createdAt: -1 })
    .limit(200);
};

module.exports = { listLogs, getLogById, listByEntity };