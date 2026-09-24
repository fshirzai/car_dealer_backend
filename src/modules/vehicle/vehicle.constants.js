'use strict';

const VEHICLE_SELECT_FIELDS = '-__v';

// Fields safe to return to the public (no purchase price, no internal notes)
const VEHICLE_PUBLIC_FIELDS = [
  'id',
  'stockNumber',
  'make',
  'model',
  'year',
  'trim',
  'color',
  'bodyType',
  'fuelType',
  'transmission',
  'driveType',
  'condition',
  'mileage',
  'mileageUnit',
  'description',
  'askingPrice',
  'currency',
  'status',
  'createdAt',
  'updatedAt',
];

const STOCK_NUMBER_PREFIX = 'STK';

module.exports = {
  VEHICLE_SELECT_FIELDS,
  VEHICLE_PUBLIC_FIELDS,
  STOCK_NUMBER_PREFIX,
};