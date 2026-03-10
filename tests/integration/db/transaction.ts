import { expect } from 'chai';
import {
  findTransactionsByCompany,
  countTransactionsByCompany,
  findAllTransactionsByCompany,
} from '../../../src/db/transaction';
import { seedIds } from '../setup';

describe('db/transaction', () => {
  describe('findTransactionsByCompany', () => {
    it('returns the correct number of items for page 1 with pageSize 3', async () => {
      const transactions = await findTransactionsByCompany(seedIds.companyAId, 1, 3);
      expect(transactions).to.have.length(3);
    });

    it('returns different items on page 2 vs page 1', async () => {
      const page1 = await findTransactionsByCompany(seedIds.companyAId, 1, 3);
      const page2 = await findTransactionsByCompany(seedIds.companyAId, 2, 3);
      const page1Ids = page1.map((t) => t.id);
      const page2Ids = page2.map((t) => t.id);
      expect(page1Ids).to.not.deep.equal(page2Ids);
    });

    it('includes the card on each transaction', async () => {
      const transactions = await findTransactionsByCompany(seedIds.companyAId, 1, 3);
      for (const tx of transactions) {
        expect(tx.card).to.not.be.undefined;
        expect(tx.card.market).to.equal('SWEDEN');
      }
    });

    it('orders by date descending', async () => {
      const transactions = await findTransactionsByCompany(seedIds.companyAId, 1, 5);
      for (let i = 1; i < transactions.length; i++) {
        expect(transactions[i - 1].date >= transactions[i].date).to.be.true;
      }
    });
  });

  describe('countTransactionsByCompany', () => {
    it('returns 57 for company A with seed data', async () => {
      const count = await countTransactionsByCompany(seedIds.companyAId);
      expect(count).to.equal(57);
    });

    it('returns 0 for a company with no transactions', async () => {
      const count = await countTransactionsByCompany(seedIds.companyBId);
      expect(count).to.equal(0);
    });
  });

  describe('findAllTransactionsByCompany', () => {
    it('returns all 57 transactions for company A', async () => {
      const transactions = await findAllTransactionsByCompany(seedIds.companyAId);
      expect(transactions).to.have.length(57);
    });

    it('returns empty array for a company with no transactions', async () => {
      const transactions = await findAllTransactionsByCompany(seedIds.companyBId);
      expect(transactions).to.deep.equal([]);
    });
  });
});
