import Joi from 'joi';

export const cardIdSchema = Joi.object({
  cardId: Joi.string().uuid().required(),
});
