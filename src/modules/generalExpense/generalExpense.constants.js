'use strict';

const GENERAL_EXPENSE_SELECT_FIELDS = '-__v';

const GENERAL_EXPENSE_CREATED_BY_POPULATE = {
  path: 'createdById',
  select: 'name email role',
};

module.exports = {
  GENERAL_EXPENSE_SELECT_FIELDS,
  GENERAL_EXPENSE_CREATED_BY_POPULATE,
};