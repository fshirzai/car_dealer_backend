'use strict';

const path = require('path');

// Where uploaded files live on disk
const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const LOGO_DIR = path.join(UPLOAD_ROOT, 'logos');
const IMAGE_DIR = path.join(UPLOAD_ROOT, 'images');
const VIDEO_DIR = path.join(UPLOAD_ROOT, 'videos');
const DOCUMENT_DIR = path.join(UPLOAD_ROOT, 'documents');

// Public URL prefix (served as static files)
const PUBLIC_URL_PREFIX = '/uploads';

// Max file sizes (bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_DOC_SIZE = 20 * 1024 * 1024;    // 20 MB

// Accepted mime types
const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
];

const ALLOWED_DOCUMENT_TYPES = [
  // PDFs
  'application/pdf',
  // Images as documents (receipts, scans)
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  // Common office formats
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

module.exports = {
  UPLOAD_ROOT,
  LOGO_DIR,
  IMAGE_DIR,
  VIDEO_DIR,
  DOCUMENT_DIR,
  PUBLIC_URL_PREFIX,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_DOC_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
};