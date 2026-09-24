'use strict';

const express = require('express');
const controller = require('./order.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./order.validation');

/* ---------------- Customer router (mounted at /orders) ---------------- */
const customerRouter = express.Router();
customerRouter.use(authenticate, authorize(USER_ROLES.CUSTOMER));

customerRouter.post('/', validate(v.createSchema), controller.create);
customerRouter.get('/mine', validate(v.listSchema), controller.listMine);
customerRouter.get('/mine/:id', validate(v.idParamSchema), controller.getMine);
customerRouter.post(
  '/mine/:id/cancel',
  validate(v.cancelByCustomerSchema),
  controller.cancelMine
);

/* ---------------- Staff router (mounted at /orders/staff) ---------------- */
const staffRouter = express.Router();
staffRouter.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SELLER));

staffRouter.get('/', validate(v.listSchema), controller.list);
staffRouter.get('/:id', validate(v.idParamSchema), controller.getById);
staffRouter.patch(
  '/:id/status',
  validate(v.updateStatusSchema),
  controller.updateStatus
);
staffRouter.patch(
  '/:id/staff-notes',
  validate(v.updateStaffNotesSchema),
  controller.updateStaffNotes
);

module.exports = { customerRouter, staffRouter };