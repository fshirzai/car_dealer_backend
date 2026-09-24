'use strict';

const express = require('express');
const controller = require('./vehicleExpense.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./vehicleExpense.validation');

const router = express.Router();

router.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SELLER));

router.post('/', validate(v.createSchema), controller.create);
router.get('/', validate(v.listSchema), controller.list);

// Vehicle-scoped helpers (static paths BEFORE :id)
router.get(
  '/by-vehicle/:vehicleId',
  validate(v.vehicleIdParamSchema),
  controller.listByVehicle
);
router.get(
  '/by-vehicle/:vehicleId/summary',
  validate(v.vehicleIdParamSchema),
  controller.sumByVehicle
);

router.get('/:id', validate(v.idParamSchema), controller.getById);
router.patch('/:id', validate(v.updateSchema), controller.update);

// Delete is ADMIN only
router.delete(
  '/:id',
  authorize(USER_ROLES.ADMIN),
  validate(v.idParamSchema),
  controller.remove
);

module.exports = router;