'use strict';

const express = require('express');
const controller = require('./dealershipSettings.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./dealershipSettings.validation');

/* -------------------- Public router (no auth) -------------------- */
const publicRouter = express.Router();
publicRouter.get('/', controller.getPublic);

/* -------------------- Admin router -------------------- */
const adminRouter = express.Router();
adminRouter.use(authenticate, authorize(USER_ROLES.ADMIN));
adminRouter.get('/', controller.get);           // full view
adminRouter.put('/', validate(v.upsertSchema), controller.upsert);
adminRouter.patch('/', validate(v.patchSchema), controller.update);

module.exports = { publicRouter, adminRouter };