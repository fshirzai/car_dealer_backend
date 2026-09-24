'use strict';

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ApiError = require('../../utils/ApiError');
const {
  LOGO_DIR,
  IMAGE_DIR,
  VIDEO_DIR,
  DOCUMENT_DIR,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_DOC_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
} = require('./upload.constants');

// Ensure directories exist
[LOGO_DIR, IMAGE_DIR, VIDEO_DIR, DOCUMENT_DIR].forEach((dir) =>
  fs.mkdirSync(dir, { recursive: true })
);

/* ------------------------------------------------------------------ */
/* Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const makeFilter = (allowed, label) => (_req, file, cb) => {
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      ApiError.badRequest(
        `Unsupported ${label} type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`
      )
    );
  }
};

const makeStorage = (dir, prefix) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.bin';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${prefix}-${unique}${ext}`);
    },
  });

const wrapMulter = (inner, sizeMessage) => (req, res, next) => {
  inner(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(ApiError.badRequest(sizeMessage));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(ApiError.badRequest('Too many files'));
    }
    return next(err);
  });
};

/* ------------------------------------------------------------------ */
/* Logo                                                               */
/* ------------------------------------------------------------------ */

const uploadLogoMiddleware = wrapMulter(
  multer({
    storage: makeStorage(LOGO_DIR, 'logo'),
    fileFilter: makeFilter(ALLOWED_IMAGE_TYPES, 'image'),
    limits: { fileSize: MAX_IMAGE_SIZE },
  }).single('file'),
  'Logo is too large (max 5 MB)'
);

/* ------------------------------------------------------------------ */
/* Single image                                                       */
/* ------------------------------------------------------------------ */

const uploadImageMiddleware = wrapMulter(
  multer({
    storage: makeStorage(IMAGE_DIR, 'img'),
    fileFilter: makeFilter(ALLOWED_IMAGE_TYPES, 'image'),
    limits: { fileSize: MAX_IMAGE_SIZE },
  }).single('file'),
  'Image is too large (max 5 MB)'
);

/* ------------------------------------------------------------------ */
/* Multiple images                                                    */
/* ------------------------------------------------------------------ */

const uploadImagesMiddleware = wrapMulter(
  multer({
    storage: makeStorage(IMAGE_DIR, 'img'),
    fileFilter: makeFilter(ALLOWED_IMAGE_TYPES, 'image'),
    limits: { fileSize: MAX_IMAGE_SIZE, files: 10 },
  }).array('files', 10),
  'One or more images exceed 5 MB'
);

/* ------------------------------------------------------------------ */
/* Single video                                                       */
/* ------------------------------------------------------------------ */

const uploadVideoMiddleware = wrapMulter(
  multer({
    storage: makeStorage(VIDEO_DIR, 'vid'),
    fileFilter: makeFilter(ALLOWED_VIDEO_TYPES, 'video'),
    limits: { fileSize: MAX_VIDEO_SIZE },
  }).single('file'),
  'Video is too large (max 100 MB)'
);

/* ------------------------------------------------------------------ */
/* Single document                                                    */
/* ------------------------------------------------------------------ */

const uploadDocumentMiddleware = wrapMulter(
  multer({
    storage: makeStorage(DOCUMENT_DIR, 'doc'),
    fileFilter: makeFilter(ALLOWED_DOCUMENT_TYPES, 'document'),
    limits: { fileSize: MAX_DOC_SIZE },
  }).single('file'),
  'Document is too large (max 20 MB)'
);

module.exports = {
  uploadLogoMiddleware,
  uploadImageMiddleware,
  uploadImagesMiddleware,
  uploadVideoMiddleware,
  uploadDocumentMiddleware,
};