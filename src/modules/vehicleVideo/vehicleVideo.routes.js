'use strict';

const express = require('express');
const controller = require('./vehicleVideo.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./vehicleVideo.validation');

/* ---------------- Public ---------------- */
const publicRouter = express.Router();
publicRouter.get(
  '/:vehicleId/video',
  validate(v.vehicleIdParamSchema),
  controller.getPublic
);

/* ---------------- Staff ---------------- */
const staffRouter = express.Router();
staffRouter.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SELLER));

staffRouter.put(
  '/:vehicleId/video',
  validate(v.upsertSchema),
  controller.upsert
);
staffRouter.patch(
  '/:vehicleId/video',
  validate(v.updateSchema),
  controller.update
);
staffRouter.delete(
  '/:vehicleId/video',
  validate(v.vehicleIdParamSchema),
  controller.remove
);

module.exports = { publicRouter, staffRouter };