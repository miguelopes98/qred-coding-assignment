import Joi from 'joi';

export const companyIdSchema = Joi.object({
  companyId: Joi.string().uuid().required(),
});

export const invoiceQuerySchema = Joi.object({
  status: Joi.string().valid('DUE', 'PAID').optional(),
});

export const transactionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
});
