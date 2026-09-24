'use strict';

const DEALERSHIP_SETTINGS_SELECT_FIELDS = '-__v';

// The one and only settings document uses a fixed, well-known _id.
// This makes "singleton" enforceable at the DB level.
const SINGLETON_ID = 'dealership-settings';

// Fields safe to expose to the public (e.g. for the storefront footer).
const PUBLIC_FIELDS = [
  'businessName',
  'email',
  'phone',
  'address',
  'city',
  'country',
  'logoUrl',
  'websiteUrl',
  'defaultCurrency',
  'timezone',
];

module.exports = {
  DEALERSHIP_SETTINGS_SELECT_FIELDS,
  SINGLETON_ID,
  PUBLIC_FIELDS,
};