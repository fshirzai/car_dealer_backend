'use strict';

const FAVORITE_SELECT_FIELDS = '-__v';

// Fields we expose from the populated vehicle
const FAVORITE_VEHICLE_POPULATE = {
  path: 'vehicleId',
  select:
    'stockNumber make model year trim color bodyType fuelType transmission driveType condition mileage mileageUnit askingPrice currency status isPublished createdAt',
};

module.exports = { FAVORITE_SELECT_FIELDS, FAVORITE_VEHICLE_POPULATE };