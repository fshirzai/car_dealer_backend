'use strict';

const express = require('express');
const controller = require('./vehicle.profit.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');

const router = express.Router();

router.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SELLER));

// Static BEFORE dynamic
router.get('/report', controller.getReport);
router.get('/:id/profit', controller.getVehicle);

module.exports = router;