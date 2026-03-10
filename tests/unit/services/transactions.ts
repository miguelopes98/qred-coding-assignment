import { expect } from 'chai';
import sinon from 'sinon';
import { Market } from '@prisma/client';
import * as transactionDb from '../../../src/db/transaction';
import {
  getTransactionsByCompany,
  exportTransactionsByCompany,
} from '../../../src/services/transactions';

const makeTransaction = (i: number) => ({
  id: `tx-${i}`,
  cardId: 'card-1',
  description: `Transaction ${i}`,
  amount: 10000 + i * 100,
  date: new Date('2026-03-01'),
  category: 'Office',
  createdAt: new Date(),
  updatedAt: new Date(),
  card: {
    id: 'card-1',
    employeeId: 'emp-1',
    status: 'ACTIVE' as const,
    market: Market.SWEDEN,
    creditLimit: 1000000,
    amountSpent: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
});

describe('transactions service', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getTransactionsByCompany', () => {
    it('returns paginated result with correct structure', async () => {
      const fakeTxs = [makeTransaction(1), makeTransaction(2), makeTransaction(3)];
      sandbox.stub(transactionDb, 'findTransactionsByCompany').resolves(fakeTxs);
      sandbox.stub(transactionDb, 'countTransactionsByCompany').resolves(57);

      const result = await getTransactionsByCompany('co-1', 1, 3);

      expect(result.items).to.have.length(3);
      expect(result.totalCount).to.equal(57);
      expect(result.page).to.equal(1);
      expect(result.pageSize).to.equal(3);
    });

    it('derives currency from card market', async () => {
      sandbox.stub(transactionDb, 'findTransactionsByCompany').resolves([makeTransaction(1)]);
      sandbox.stub(transactionDb, 'countTransactionsByCompany').resolves(1);

      const result = await getTransactionsByCompany('co-1', 1, 10);

      expect(result.items[0].currency).to.equal('SEK');
    });

    it('returns empty items array when there are no transactions', async () => {
      sandbox.stub(transactionDb, 'findTransactionsByCompany').resolves([]);
      sandbox.stub(transactionDb, 'countTransactionsByCompany').resolves(0);

      const result = await getTransactionsByCompany('co-1', 1, 10);

      expect(result.items).to.have.length(0);
      expect(result.totalCount).to.equal(0);
    });

    it('formats date as YYYY-MM-DD string', async () => {
      const tx = makeTransaction(1);
      tx.date = new Date('2026-03-08T12:00:00.000Z');
      sandbox.stub(transactionDb, 'findTransactionsByCompany').resolves([tx]);
      sandbox.stub(transactionDb, 'countTransactionsByCompany').resolves(1);

      const result = await getTransactionsByCompany('co-1', 1, 10);

      expect(result.items[0].date).to.equal('2026-03-08');
    });
  });

  describe('exportTransactionsByCompany', () => {
    it('produces a CSV string with a header row and one data row per transaction', async () => {
      sandbox
        .stub(transactionDb, 'findAllTransactionsByCompany')
        .resolves([makeTransaction(1), makeTransaction(2)]);

      const csv = await exportTransactionsByCompany('co-1');
      const lines = csv.split('\n');

      expect(lines[0]).to.equal('id,description,amount,date,category,currency');
      expect(lines).to.have.length(3);
    });

    it('escapes double quotes in description', async () => {
      const tx = makeTransaction(1);
      tx.description = 'He said "hello"';
      sandbox.stub(transactionDb, 'findAllTransactionsByCompany').resolves([tx]);

      const csv = await exportTransactionsByCompany('co-1');
      const dataRow = csv.split('\n')[1];

      expect(dataRow).to.include('"He said ""hello"""');
    });
  });
});
