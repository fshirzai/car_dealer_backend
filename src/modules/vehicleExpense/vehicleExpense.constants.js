'use strict';

const VEHICLE_EXPENSE_SELECT_FIELDS = '-__v';

const VEHICLE_EXPENSE_VEHICLE_POPULATE = {
  path: 'vehicleId',
  select: 'stockNumber make model year status isPublished',
};

const VEHICLE_EXPENSE_CREATED_BY_POPULATE = {
  path: 'createdById',
  select: 'name email role',
};

module.exports = {
  VEHICLE_EXPENSE_SELECT_FIELDS,
  VEHICLE_EXPENSE_VEHICLE_POPULATE,
  VEHICLE_EXPENSE_CREATED_BY_POPULATE,
};