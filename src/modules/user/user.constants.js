'use strict';

const USER_POPULATE_FIELDS = [];
const USER_SELECT_FIELDS = '-passwordHash -__v';
const USER_SELECT_WITH_PASSWORD = '+passwordHash';

module.exports = {
  USER_POPULATE_FIELDS,
  USER_SELECT_FIELDS,
  USER_SELECT_WITH_PASSWORD,
};