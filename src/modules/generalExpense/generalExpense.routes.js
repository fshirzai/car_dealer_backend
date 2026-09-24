'use strict';

const express = require('express');
const controller = require('./generalExpense.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./generalExpense.validation');

const router = express.Router();

router.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SELLER));

// Static BEFORE dynamic
router.get('/summary', controller.summary);

router.post('/', validate(v.createSchema), controller.create);
router.get('/', validate(v.listSchema), controller.list);
router.get('/:id', validate(v.idParamSchema), controller.getById);
router.patch('/:id', validate(v.updateSchema), controller.update);

router.delete(
  '/:id',
  authorize(USER_ROLES.ADMIN),
  validate(v.idParamSchema),
  controller.remove
);

module.exports = router;