import express, { NextFunction, Request, Response } from 'express';
import { activateCard } from '../../services/cards';
import { requestValidatorMiddleware } from '../../middlewares/requestValidator';
import { cardIdSchema } from './validation/cards';

const router = express.Router();

router.post(
  '/:cardId/activate',
  requestValidatorMiddleware({ params: cardIdSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { cardId } = res.locals.validatedParams as { cardId: string };
      const card = await activateCard(cardId);
      res.json(card);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
