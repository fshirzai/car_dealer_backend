'use strict';

const express = require('express');
const controller = require('./seller.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./seller.validation');

const router = express.Router();

// All seller routes require staff auth
router.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SELLER));

router.post('/', validate(v.createSchema), controller.create);
router.get('/', validate(v.listSchema), controller.list);
router.get('/:id', validate(v.idParamSchema), controller.getById);
router.patch('/:id', validate(v.updateSchema), controller.update);
router.patch('/:id/deactivate', validate(v.idParamSchema), controller.deactivate);
router.patch('/:id/activate', validate(v.idParamSchema), controller.activate);

// Only ADMIN can hard-delete
router.delete(
  '/:id',
  authorize(USER_ROLES.ADMIN),
  validate(v.idParamSchema),
  controller.remove
);

module.exports = router;