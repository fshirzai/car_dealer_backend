'use strict';

const mongoose = require('mongoose');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');
const { TOKEN_TYPES } = require('./auth.constants');

const { Schema } = mongoose;

/* ------------------------------------------------------------------ */
/* RefreshToken — persisted for revocation & rotation                  */
/* ------------------------------------------------------------------ */
const refreshTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL — Mongo auto-deletes expired docs
    },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null },
    userAgent: { type: String, default: null },
    ipAddress: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

refreshTokenSchema.plugin(baseSchemaPlugin);

refreshTokenSchema.methods.isActive = function () {
  return !this.revokedAt && this.expiresAt > new Date();
};

/* ------------------------------------------------------------------ */
/* VerificationToken — email verify + password reset                   */
/* ------------------------------------------------------------------ */
const verificationTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TOKEN_TYPES),
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

verificationTokenSchema.plugin(baseSchemaPlugin);

verificationTokenSchema.methods.isActive = function () {
  return !this.consumedAt && this.expiresAt > new Date();
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
const VerificationToken = mongoose.model(
  'VerificationToken',
  verificationTokenSchema
);

module.exports = { RefreshToken, VerificationToken };