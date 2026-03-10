import express, { NextFunction, Request, Response } from 'express';
import { InvoiceStatus } from '@prisma/client';
import { listCompanies, getCompany } from '../../services/companies';
import { getCardsByCompany } from '../../services/cards';
import { getInvoicesByCompany } from '../../services/invoices';
import { getTransactionsByCompany, exportTransactionsByCompany } from '../../services/transactions';
import { getEmployeesByCompany } from '../../services/employees';
import { requestValidatorMiddleware } from '../../middlewares/requestValidator';
import {
  companyIdSchema,
  invoiceQuerySchema,
  transactionQuerySchema,
} from './validation/companies';

const router = express.Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const companies = await listCompanies();
    res.json(companies);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/:companyId',
  requestValidatorMiddleware({ params: companyIdSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = res.locals.validatedParams as { companyId: string };
      const company = await getCompany(companyId);
      res.json(company);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:companyId/cards',
  requestValidatorMiddleware({ params: companyIdSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = res.locals.validatedParams as { companyId: string };
      const cards = await getCardsByCompany(companyId);
      res.json(cards);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:companyId/invoices',
  requestValidatorMiddleware({ params: companyIdSchema, query: invoiceQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = res.locals.validatedParams as { companyId: string };
      const { status } = res.locals.validatedQuery as { status?: InvoiceStatus };
      const invoices = await getInvoicesByCompany(companyId, status);
      res.json(invoices);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:companyId/transactions/export',
  requestValidatorMiddleware({ params: companyIdSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = res.locals.validatedParams as { companyId: string };
      const csv = await exportTransactionsByCompany(companyId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:companyId/transactions',
  requestValidatorMiddleware({ params: companyIdSchema, query: transactionQuerySchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = res.locals.validatedParams as { companyId: string };
      const { page, pageSize } = res.locals.validatedQuery as { page: number; pageSize: number };
      const result = await getTransactionsByCompany(companyId, page, pageSize);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:companyId/employees',
  requestValidatorMiddleware({ params: companyIdSchema }),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = res.locals.validatedParams as { companyId: string };
      const employees = await getEmployeesByCompany(companyId);
      res.json(employees);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
