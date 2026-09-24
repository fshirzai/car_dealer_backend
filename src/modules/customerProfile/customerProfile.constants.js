'use strict';

const CUSTOMER_PROFILE_SELECT_FIELDS = '-__v';

const CUSTOMER_PROFILE_POPULATE = [
  {
    path: 'userId',
    select: 'name email role isActive emailVerifiedAt image phone createdAt',
  },
];

module.exports = {
  CUSTOMER_PROFILE_SELECT_FIELDS,
  CUSTOMER_PROFILE_POPULATE,
};