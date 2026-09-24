'use strict';

const SALE_SELECT_FIELDS = '-__v';

const SALE_VEHICLE_POPULATE = {
  path: 'vehicleId',
  select:
    'stockNumber make model year trim color bodyType fuelType transmission condition mileage mileageUnit askingPrice currency status isPublished',
};

const SALE_CUSTOMER_POPULATE = {
  path: 'customerId',
  select: 'name email phone role',
};

const SALE_CREATED_BY_POPULATE = {
  path: 'createdById',
  select: 'name email role',
};

const SALE_ORDER_POPULATE = {
  path: 'orderId',
  select: 'orderNumber status createdAt customerName customerPhone',
};

const SALE_NUMBER_PREFIX = 'SAL';

module.exports = {
  SALE_SELECT_FIELDS,
  SALE_VEHICLE_POPULATE,
  SALE_CUSTOMER_POPULATE,
  SALE_CREATED_BY_POPULATE,
  SALE_ORDER_POPULATE,
  SALE_NUMBER_PREFIX,
};