import Joi from 'joi';

export const employeeIdSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
});
