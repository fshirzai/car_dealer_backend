'use strict';

const express = require('express');
const controller = require('./cartItem.controller');
const validate = require('../../middleware/validate.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const v = require('./cartItem.validation');

const router = express.Router();

router.use(authenticate, authorize(USER_ROLES.CUSTOMER));

router.get('/', validate(v.listSchema), controller.list);
router.get('/count', controller.count);

router.post('/', validate(v.addSchema), controller.add);

// Static paths BEFORE dynamic :id
router.delete('/clear', controller.clear);
router.delete('/', validate(v.removeSchema), controller.remove);
router.delete('/:id', validate(v.idParamSchema), controller.removeById);

module.exports = router;