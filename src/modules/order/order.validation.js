'use strict';

const Joi = require('joi');
const { ORDER_STATUS } = require('../../constants/enums');

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID');

/* ------------------------------------------------------------------ */
/* Customer: create order                                              */
/* ------------------------------------------------------------------ */
const createSchema = {
  body: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          vehicleId: objectId.required(),
        })
      )
      .min(1)
      .max(20)
      .required()
      .custom((items, helpers) => {
        const ids = items.map((i) => i.vehicleId);
        if (new Set(ids).size !== ids.length) {
          return helpers.error('array.unique');
        }
        return items;
      })
      .messages({
        'array.unique': 'Duplicate vehicles are not allowed in a single order',
      }),

    // Customer can optionally override contact info at order time
    customerName: Joi.string().max(120),
    customerPhone: Joi.string().max(30),
    customerEmail: Joi.string().email().max(150),
    customerAddress: Joi.string().max(255).allow(null, ''),
    customerNotes: Joi.string().max(2000).allow(null, ''),
  }),
};

/* ------------------------------------------------------------------ */
/* Customer: cancel                                                    */
/* ------------------------------------------------------------------ */
const cancelByCustomerSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    reason: Joi.string().max(1000).allow(null, ''),
  }),
};

/* ------------------------------------------------------------------ */
/* Staff: update status                                                */
/* ------------------------------------------------------------------ */
const updateStatusSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    status: Joi.string()
      .valid(...Object.values(ORDER_STATUS))
      .required(),
    cancelReason: Joi.string().max(1000).allow(null, ''),
  }),
};

/* ------------------------------------------------------------------ */
/* Staff: update notes                                                 */
/* ------------------------------------------------------------------ */
const updateStaffNotesSchema = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    staffNotes: Joi.string().max(2000).allow(null, ''),
  }),
};

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */
const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    status: Joi.string().valid(...Object.values(ORDER_STATUS)),
    customerId: objectId,
    search: Joi.string().max(120),
    sort: Joi.string().valid('createdAt', '-createdAt', 'status', '-status'),
  }),
};

const idParamSchema = {
  params: Joi.object({ id: objectId.required() }),
};

module.exports = {
  createSchema,
  cancelByCustomerSchema,
  updateStatusSchema,
  updateStaffNotesSchema,
  listSchema,
  idParamSchema,
};