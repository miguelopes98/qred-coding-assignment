import express, { NextFunction, Request, Response } from 'express';
import { getEmployee } from '../../services/employees';
import { getCardsByEmployee } from '../../services/cards';
import { requestValidatorMiddleware } from '../../middlewares/requestValidator';
import { employeeIdSchema } from './validation/employees';

const router = express.Router();

router.get(
  '/:employeeId',
  requestValidatorMiddleware({ params: employeeIdSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = res.locals.validatedParams as { employeeId: string };
      const employee = await getEmployee(employeeId);
      res.json(employee);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:employeeId/cards',
  requestValidatorMiddleware({ params: employeeIdSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = res.locals.validatedParams as { employeeId: string };
      const cards = await getCardsByEmployee(employeeId);
      res.json(cards);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
