'use strict';

const CART_ITEM_SELECT_FIELDS = '-__v';

const CART_ITEM_VEHICLE_POPULATE = {
  path: 'vehicleId',
  select:
    'stockNumber make model year trim color bodyType fuelType transmission driveType condition mileage mileageUnit askingPrice currency status isPublished createdAt',
};

module.exports = { CART_ITEM_SELECT_FIELDS, CART_ITEM_VEHICLE_POPULATE };