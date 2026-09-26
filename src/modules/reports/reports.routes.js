'use strict';

const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const validate = require('../../middleware/validate.middleware');
const controller = require('./reports.controller');
const v = require('./reports.validation');

const router = express.Router();

// Reports are staff-only
router.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SELLER));

router.get('/sales', validate(v.dateRangeSchema), controller.sales);
router.get('/inventory', controller.inventory);
router.get('/profit', validate(v.dateRangeSchema), controller.profit);
router.get('/orders', validate(v.dateRangeSchema), controller.orders);
router.get('/expenses', validate(v.dateRangeSchema), controller.expenses);
router.get('/customers', validate(v.dateRangeSchema), controller.customers);

module.exports = router;