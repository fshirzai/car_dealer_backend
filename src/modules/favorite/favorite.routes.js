'use strict';

const express = require('express');
const controller = require('./favorite.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./favorite.validation');

const router = express.Router();

// Only customers own favorites
router.use(authenticate, authorize(USER_ROLES.CUSTOMER));

router.get('/', validate(v.listSchema), controller.list);
router.post('/', validate(v.addSchema), controller.add);
router.post('/toggle', validate(v.toggleSchema), controller.toggle);
router.delete('/', validate(v.addSchema), controller.remove); // body: { vehicleId }
router.delete('/:id', validate(v.idParamSchema), controller.removeById);

module.exports = router;