'use strict';

const ORDER_SELECT_FIELDS = '-__v';

const ORDER_CUSTOMER_POPULATE = {
  path: 'customerId',
  select: 'name email phone role isActive',
};

const ORDER_ITEM_VEHICLE_POPULATE = {
  path: 'items.vehicleId',
  select:
    'stockNumber make model year trim color bodyType fuelType transmission condition mileage mileageUnit askingPrice currency status isPublished',
};

const ORDER_NUMBER_PREFIX = 'ORD';

/**
 * Allowed staff transitions.
 * A customer can only cancel from PENDING (handled separately).
 */
const STAFF_TRANSITIONS = Object.freeze({
  PENDING: ['CONTACTED', 'CANCELLED'],
  CONTACTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // terminal
  CANCELLED: [], // terminal
});

module.exports = {
  ORDER_SELECT_FIELDS,
  ORDER_CUSTOMER_POPULATE,
  ORDER_ITEM_VEHICLE_POPULATE,
  ORDER_NUMBER_PREFIX,
  STAFF_TRANSITIONS,
};