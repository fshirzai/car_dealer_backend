'use strict';

const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./customerProfile.service');

/* ----- Self (any authenticated customer) ----- */

const getMine = asyncHandler(async (req, res) => {
  const profile = await service.getMyProfile(req.user.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(profile));
});

const updateMine = asyncHandler(async (req, res) => {
  const profile = await service.updateMyProfile(req.user.id, req.body);
  res.status(StatusCodes.OK).json(ApiResponse.success(profile, 'Profile updated'));
});

/* ----- Admin ----- */

const create = asyncHandler(async (req, res) => {
  const profile = await service.createProfile(req.body);
  res.status(StatusCodes.CREATED).json(ApiResponse.created(profile, 'Profile created'));
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listProfiles(req.query);
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, { items, meta }, 'Profiles fetched'));
});

const getById = asyncHandler(async (req, res) => {
  const profile = await service.getProfileById(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(profile));
});

const update = asyncHandler(async (req, res) => {
  const profile = await service.updateProfile(req.params.id, req.body);
  res.status(StatusCodes.OK).json(ApiResponse.success(profile, 'Profile updated'));
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteProfile(req.params.id);
  res.status(StatusCodes.OK).json(ApiResponse.success(null, 'Profile deleted'));
});

module.exports = { getMine, updateMine, create, list, getById, update, remove };