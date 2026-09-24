'use strict';

const express = require('express');
const controller = require('./sale.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./sale.validation');

const router = express.Router();

router.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SELLER));

router.post('/', validate(v.createSchema), controller.create);
router.get('/', validate(v.listSchema), controller.list);
router.get('/:id', validate(v.idParamSchema), controller.getById);
router.patch('/:id', validate(v.updateSchema), controller.update);

// Deleting a sale reverses the vehicle status — admin-only
router.delete(
  '/:id',
  authorize(USER_ROLES.ADMIN),
  validate(v.idParamSchema),
  controller.remove
);

module.exports = router;