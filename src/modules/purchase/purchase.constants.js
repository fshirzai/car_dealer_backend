'use strict';

const PURCHASE_SELECT_FIELDS = '-__v';

const PURCHASE_VEHICLE_POPULATE = {
  path: 'vehicleId',
  select:
    'stockNumber make model year trim color bodyType fuelType transmission condition mileage mileageUnit askingPrice currency status isPublished',
};

const PURCHASE_SELLER_POPULATE = {
  path: 'sellerId',
  select: 'name type phone email city country isActive',
};

const PURCHASE_CREATED_BY_POPULATE = {
  path: 'createdById',
  select: 'name email role',
};

const PURCHASE_NUMBER_PREFIX = 'PUR';

module.exports = {
  PURCHASE_SELECT_FIELDS,
  PURCHASE_VEHICLE_POPULATE,
  PURCHASE_SELLER_POPULATE,
  PURCHASE_CREATED_BY_POPULATE,
  PURCHASE_NUMBER_PREFIX,
};