'use strict';

const express = require('express');
const controller = require('./vehicle.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./vehicle.validation');

/* ---------------- Public router (no auth) ---------------- */
const publicRouter = express.Router();

publicRouter.get('/', validate(v.listSchema), controller.listPublic);
publicRouter.get('/:id', validate(v.idParamSchema), controller.getPublicById);

/* ---------------- Staff router (auth required) ---------------- */
const staffRouter = express.Router();

staffRouter.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SELLER));

staffRouter.post('/', validate(v.createSchema), controller.create);
staffRouter.get('/', validate(v.listSchema), controller.list);
staffRouter.get('/:id', validate(v.idParamSchema), controller.getById);
staffRouter.patch('/:id', validate(v.updateSchema), controller.update);
staffRouter.patch(
  '/:id/status',
  validate(v.statusChangeSchema),
  controller.changeStatus
);
staffRouter.patch('/:id/publish', validate(v.idParamSchema), controller.publish);
staffRouter.patch('/:id/unpublish', validate(v.idParamSchema), controller.unpublish);
staffRouter.delete('/:id', validate(v.idParamSchema), controller.remove);

module.exports = { publicRouter, staffRouter };