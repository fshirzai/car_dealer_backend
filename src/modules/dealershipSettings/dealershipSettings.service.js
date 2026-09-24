'use strict';

const DealershipSettings = require('./dealershipSettings.model');
const ApiError = require('../../utils/ApiError');
const { emit } = require('../auditLog/auditLog.utils');
const {
  DEALERSHIP_SETTINGS_SELECT_FIELDS,
  SINGLETON_ID,
  PUBLIC_FIELDS,
} = require('./dealershipSettings.constants');

const nullify = (v) => (v === '' || v === undefined ? null : v);

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

const getSettings = async () => {
  const settings = await DealershipSettings.findById(SINGLETON_ID).select(
    DEALERSHIP_SETTINGS_SELECT_FIELDS
  );
  return settings;
};

const getPublicSettings = async () => {
  const settings = await getSettings();
  if (!settings) return null;
  const obj = settings.toObject();
  return PUBLIC_FIELDS.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});
};

const getOrCreate = async () => {
  let settings = await getSettings();
  if (!settings) {
    settings = await DealershipSettings.create({
      _id: SINGLETON_ID,
      businessName: 'My Dealership',
      email: 'contact@example.com',
      address: 'Main Street',
      country: 'Afghanistan',
      defaultCurrency: 'USD',
      timezone: 'Asia/Kabul',
    });
  }
  return settings;
};

/* ------------------------------------------------------------------ */
/* Upsert / Update                                                     */
/* ------------------------------------------------------------------ */

const upsertSettings = async (payload, actorId = null) => {
  const before = await getSettings();
  const beforeSnapshot = before ? before.toObject() : null;

  const data = {
    businessName: payload.businessName.trim(),
    legalName: nullify(payload.legalName),
    email: payload.email.toLowerCase().trim(),
    phone: nullify(payload.phone),
    address: payload.address.trim(),
    city: nullify(payload.city),
    country: payload.country.trim(),
    logoUrl: nullify(payload.logoUrl),
    websiteUrl: nullify(payload.websiteUrl),
    defaultCurrency: payload.defaultCurrency || 'USD',
    timezone: payload.timezone || 'Asia/Kabul',
  };

  const settings = await DealershipSettings.findByIdAndUpdate(
    SINGLETON_ID,
    { $set: data, $setOnInsert: { _id: SINGLETON_ID } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).select(DEALERSHIP_SETTINGS_SELECT_FIELDS);

  await emit({
    action: before ? 'UPDATE' : 'CREATE',
    entityType: 'DealershipSettings',
    entityId: SINGLETON_ID,
    userId: actorId,
    description: before
      ? 'Updated dealership settings'
      : 'Created dealership settings',
    oldValues: beforeSnapshot,
    newValues: settings.toObject(),
  });

  return settings;
};

const updateSettings = async (payload, actorId = null) => {
  const settings = await DealershipSettings.findById(SINGLETON_ID);
  if (!settings) {
    throw ApiError.notFound('Dealership settings have not been created yet');
  }

  const before = settings.toObject();

  const directFields = [
    'businessName', 'legalName', 'email', 'phone', 'address', 'city',
    'country', 'logoUrl', 'websiteUrl', 'defaultCurrency', 'timezone',
  ];

  directFields.forEach((key) => {
    if (payload[key] === undefined) return;
    switch (key) {
      case 'businessName':
      case 'address':
      case 'country':
        settings[key] = payload[key].trim();
        break;
      case 'email':
        settings.email = payload.email.toLowerCase().trim();
        break;
      case 'defaultCurrency':
        settings.defaultCurrency = payload.defaultCurrency;
        break;
      case 'timezone':
        settings.timezone = payload.timezone;
        break;
      default:
        settings[key] = nullify(payload[key]);
    }
  });

  await settings.save();

  await emit({
    action: 'UPDATE',
    entityType: 'DealershipSettings',
    entityId: SINGLETON_ID,
    userId: actorId,
    description: 'Updated dealership settings',
    oldValues: before,
    newValues: settings.toObject(),
  });

  return DealershipSettings.findById(SINGLETON_ID).select(
    DEALERSHIP_SETTINGS_SELECT_FIELDS
  );
};

module.exports = {
  getSettings,
  getPublicSettings,
  getOrCreate,
  upsertSettings,
  updateSettings,
};