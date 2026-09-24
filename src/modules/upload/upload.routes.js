'use strict';

const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { USER_ROLES } = require('../../constants/enums');
const controller = require('./upload.controller');
const {
  uploadLogoMiddleware,
  uploadImageMiddleware,
  uploadImagesMiddleware,
  uploadVideoMiddleware,
  uploadDocumentMiddleware,
} = require('./upload.middleware');

const router = express.Router();

// All upload endpoints require staff auth
router.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.SELLER));

// Logo — admin only (site branding)
router.post(
  '/logo',
  authorize(USER_ROLES.ADMIN),
  uploadLogoMiddleware,
  controller.uploadLogoHandler
);

// Images (single or bulk)
router.post('/image', uploadImageMiddleware, controller.uploadImageHandler);
router.post('/images', uploadImagesMiddleware, controller.uploadImagesHandler);

// Videos
router.post('/video', uploadVideoMiddleware, controller.uploadVideoHandler);

// Documents (PDFs, images, office files)
router.post(
  '/document',
  uploadDocumentMiddleware,
  controller.uploadDocumentHandler
);

module.exports = router;