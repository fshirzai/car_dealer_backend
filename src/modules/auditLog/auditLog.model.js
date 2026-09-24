'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');
const { ACTION } = require('./auditLog.constants');

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(ACTION),
      required: true,
      index: true,
    },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, default: null, index: true },
    description: { type: String, trim: true, default: null, maxlength: 1000 },
    oldValues: { type: Schema.Types.Mixed, default: null },
    newValues: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, trim: true, default: null, maxlength: 60 },
    userAgent: { type: String, trim: true, default: null, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

auditLogSchema.plugin(baseSchemaPlugin);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);