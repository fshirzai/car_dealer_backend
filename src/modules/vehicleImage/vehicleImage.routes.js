'use strict';

const express = require('express');
const controller = require('./vehicleImage.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./vehicleImage.validation');

/* ---------------- Public ---------------- */
const publicRouter = express.Router();
publicRouter.get(
  '/:vehicleId/images',
  validate(v.vehicleIdParamSchema),
  controller.listPublic
);

/* ---------------- Staff ---------------- */
const staffRouter = express.Router();
staffRouter.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SELLER));

staffRouter.post(
  '/:vehicleId/images',
  validate(v.createSchema),
  controller.create
);
staffRouter.post(
  '/:vehicleId/images/bulk',
  validate(v.bulkCreateSchema),
  controller.bulkCreate
);
staffRouter.patch(
  '/:vehicleId/images/reorder',
  validate(v.reorderSchema),
  controller.reorder
);
staffRouter.patch(
  '/images/:id',
  validate(v.updateSchema),
  controller.update
);
staffRouter.patch(
  '/images/:id/primary',
  validate(v.idParamSchema),
  controller.setPrimary
);
staffRouter.delete(
  '/images/:id',
  validate(v.idParamSchema),
  controller.remove
);

module.exports = { publicRouter, staffRouter };