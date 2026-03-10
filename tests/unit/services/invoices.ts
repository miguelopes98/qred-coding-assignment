import { expect } from 'chai';
import sinon from 'sinon';
import { InvoiceStatus, Market } from '@prisma/client';
import * as invoiceDb from '../../../src/db/invoice';
import { getInvoicesByCompany } from '../../../src/services/invoices';

const makeInvoice = (id: string, market: Market, date: Date) => ({
  id,
  companyId: 'co-1',
  amount: 100000,
  dueDate: date,
  status: InvoiceStatus.DUE,
  createdAt: date,
  updatedAt: date,
  cards: [
    {
      id: `card-${id}`,
      employeeId: 'emp-1',
      status: 'ACTIVE' as const,
      market,
      creditLimit: 1000000,
      amountSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
});

const march2026 = '2026-03-01';

describe('invoices service', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getInvoicesByCompany with status=DUE', () => {
    it('returns only the most recent DUE invoice per market', async () => {
      const older = makeInvoice('inv-1', Market.SWEDEN, new Date('2026-02-01'));
      const newer = makeInvoice('inv-2', Market.SWEDEN, new Date(march2026));
      sandbox.stub(invoiceDb, 'findInvoicesByCompany').resolves([newer, older]);

      const result = await getInvoicesByCompany('co-1', InvoiceStatus.DUE);

      expect(result).to.have.length(1);
      expect(result[0].id).to.equal('inv-2');
    });

    it('returns one invoice per market when multiple markets exist', async () => {
      const sweInvoice = makeInvoice('inv-swe', Market.SWEDEN, new Date(march2026));
      const finInvoice = makeInvoice('inv-fin', Market.FINLAND, new Date(march2026));
      sandbox.stub(invoiceDb, 'findInvoicesByCompany').resolves([sweInvoice, finInvoice]);

      const result = await getInvoicesByCompany('co-1', InvoiceStatus.DUE);

      expect(result).to.have.length(2);
      const markets = result.map((r) => r.market).sort();
      expect(markets).to.deep.equal(['FINLAND', 'SWEDEN']);
    });

    it('returns empty array when there are no DUE invoices', async () => {
      sandbox.stub(invoiceDb, 'findInvoicesByCompany').resolves([]);

      const result = await getInvoicesByCompany('co-1', InvoiceStatus.DUE);

      expect(result).to.deep.equal([]);
    });

    it('derives SEK currency for SWEDEN market', async () => {
      const invoice = makeInvoice('inv-1', Market.SWEDEN, new Date(march2026));
      sandbox.stub(invoiceDb, 'findInvoicesByCompany').resolves([invoice]);

      const result = await getInvoicesByCompany('co-1', InvoiceStatus.DUE);

      expect(result[0].currency).to.equal('SEK');
      expect(result[0].market).to.equal('SWEDEN');
    });

    it('formats dueDate as YYYY-MM-DD string', async () => {
      const invoice = makeInvoice('inv-1', Market.SWEDEN, new Date('2026-04-01'));
      sandbox.stub(invoiceDb, 'findInvoicesByCompany').resolves([invoice]);

      const result = await getInvoicesByCompany('co-1', InvoiceStatus.DUE);

      expect(result[0].dueDate).to.equal('2026-04-01');
    });
  });
});
