'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { PUBLIC_URL_PREFIX } = require('./upload.constants');

const buildFileResponse = (file, folder) => ({
  url: `${PUBLIC_URL_PREFIX}/${folder}/${file.filename}`,
  filename: file.filename,
  size: file.size,
  mimeType: file.mimetype,
  originalName: file.originalname,
});

/* ------------------------------------------------------------------ */
/* Logo                                                               */
/* ------------------------------------------------------------------ */

const uploadLogoHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const result = buildFileResponse(req.file, 'logos');
  res
    .status(StatusCodes.CREATED)
    .json(ApiResponse.created(result, 'Logo uploaded'));
});

/* ------------------------------------------------------------------ */
/* Single image                                                       */
/* ------------------------------------------------------------------ */

const uploadImageHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const result = buildFileResponse(req.file, 'images');
  res
    .status(StatusCodes.CREATED)
    .json(ApiResponse.created(result, 'Image uploaded'));
});

/* ------------------------------------------------------------------ */
/* Multiple images                                                    */
/* ------------------------------------------------------------------ */

const uploadImagesHandler = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('No files uploaded');
  }
  const files = req.files.map((f) => buildFileResponse(f, 'images'));
  res
    .status(StatusCodes.CREATED)
    .json(ApiResponse.created(files, `${files.length} image(s) uploaded`));
});

/* ------------------------------------------------------------------ */
/* Video                                                              */
/* ------------------------------------------------------------------ */

const uploadVideoHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const result = buildFileResponse(req.file, 'videos');
  res
    .status(StatusCodes.CREATED)
    .json(ApiResponse.created(result, 'Video uploaded'));
});

/* ------------------------------------------------------------------ */
/* Document                                                           */
/* ------------------------------------------------------------------ */

const uploadDocumentHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const result = buildFileResponse(req.file, 'documents');
  res
    .status(StatusCodes.CREATED)
    .json(ApiResponse.created(result, 'Document uploaded'));
});

module.exports = {
  uploadLogoHandler,
  uploadImageHandler,
  uploadImagesHandler,
  uploadVideoHandler,
  uploadDocumentHandler,
};