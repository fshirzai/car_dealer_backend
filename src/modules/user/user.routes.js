'use strict';

const express = require('express');
const controller = require('./user.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./user.validation');

const router = express.Router();

// Current user profile (any authenticated user)
router.get('/me', authenticate, controller.me);
router.patch('/me', authenticate, validate(v.updateProfileSchema), controller.updateOwn);
router.patch('/me/password', authenticate, validate(v.changePasswordSchema), controller.changePassword);

// Admin-only management
router.use(authenticate, authorize(USER_ROLES.ADMIN));

router.post('/', validate(v.createUserSchema), controller.create);
router.get('/', validate(v.listUsersSchema), controller.list);
router.get('/:id', validate(v.idParamSchema), controller.getById);
router.patch('/:id', validate(v.updateUserSchema), controller.update);
router.patch('/:id/deactivate', validate(v.idParamSchema), controller.deactivate);
router.patch('/:id/activate', validate(v.idParamSchema), controller.activate);
router.delete('/:id', validate(v.idParamSchema), controller.remove);

module.exports = router;