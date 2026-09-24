'use strict';

const express = require('express');
const controller = require('./customerProfile.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./customerProfile.validation');

const router = express.Router();

/* ----- Self (any authenticated CUSTOMER) ----- */
router.get(
  '/me',
  authenticate,
  authorize(USER_ROLES.CUSTOMER),
  controller.getMine
);

router.patch(
  '/me',
  authenticate,
  authorize(USER_ROLES.CUSTOMER),
  validate(v.updateOwnSchema),
  controller.updateMine
);

/* ----- Admin-only management ----- */
router.use(authenticate, authorize(USER_ROLES.ADMIN));

router.post('/', validate(v.createSchema), controller.create);
router.get('/', validate(v.listSchema), controller.list);
router.get('/:id', validate(v.idParamSchema), controller.getById);
router.patch('/:id', validate(v.updateSchema), controller.update);
router.delete('/:id', validate(v.idParamSchema), controller.remove);

module.exports = router;