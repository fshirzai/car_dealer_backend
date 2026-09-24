'use strict';

const express = require('express');
const controller = require('./auditLog.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./auditLog.validation');

const router = express.Router();

// Admin-only
router.use(authenticate, authorize(USER_ROLES.ADMIN));

router.get('/', validate(v.listSchema), controller.list);

// Static BEFORE dynamic
router.get(
  '/by-entity/:entityType/:entityId',
  validate(v.entityParamSchema),
  controller.listByEntity
);

router.get('/:id', validate(v.idParamSchema), controller.getById);

module.exports = router;