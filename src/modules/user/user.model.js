'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const baseSchemaPlugin = require('../../utils/baseSchemaPlugin');
const { USER_ROLES } = require('../../constants/enums');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      select: false,
      default: null,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.CUSTOMER,
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    emailVerifiedAt: { type: Date, default: null },
    image: { type: String, default: null },
    phone: { type: String, default: null, trim: true },
  },
  { timestamps: true, versionKey: false }
);

userSchema.plugin(baseSchemaPlugin);

// Methods
userSchema.methods.comparePassword = function (candidate) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.isCustomer = function () {
  return this.role === USER_ROLES.CUSTOMER;
};

// Statics
userSchema.statics.hashPassword = async function (plain) {
  const env = require('../../config/env');
  return bcrypt.hash(plain, env.bcryptSaltRounds);
};

// Indexes
userSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model('User', userSchema);