import express from 'express';
import companiesRouter from './companies';
import employeesRouter from './employees';
import cardsRouter from './cards';

const router = express.Router();

router.use('/companies', companiesRouter);
router.use('/employees', employeesRouter);
router.use('/cards', cardsRouter);

export const v1Router = router;
