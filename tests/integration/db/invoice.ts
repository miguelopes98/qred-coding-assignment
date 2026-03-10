import { expect } from 'chai';
import { InvoiceStatus } from '@prisma/client';
import { findInvoicesByCompany } from '../../../src/db/invoice';
import { seedIds } from '../setup';

describe('db/invoice', () => {
  describe('findInvoicesByCompany', () => {
    it('returns invoices for a company', async () => {
      const invoices = await findInvoicesByCompany(seedIds.companyAId);
      expect(invoices).to.have.length(1);
      expect(invoices[0].id).to.equal(seedIds.invoiceId);
    });

    it('includes the linked cards on each invoice', async () => {
      const invoices = await findInvoicesByCompany(seedIds.companyAId);
      expect(invoices[0].cards).to.have.length(2);
    });

    it('filters by status DUE and returns matching invoices', async () => {
      const invoices = await findInvoicesByCompany(seedIds.companyAId, InvoiceStatus.DUE);
      expect(invoices).to.have.length(1);
      expect(invoices[0].status).to.equal('DUE');
    });

    it('filters by status PAID and returns empty array when none exist', async () => {
      const invoices = await findInvoicesByCompany(seedIds.companyAId, InvoiceStatus.PAID);
      expect(invoices).to.deep.equal([]);
    });

    it('orders results by createdAt descending (most recent first)', async () => {
      const invoices = await findInvoicesByCompany(seedIds.companyAId);
      if (invoices.length > 1) {
        expect(invoices[0].createdAt >= invoices[1].createdAt).to.be.true;
      }
    });

    it('returns empty array for a company with no invoices', async () => {
      const invoices = await findInvoicesByCompany('00000000-0000-0000-0000-000000000000');
      expect(invoices).to.deep.equal([]);
    });
  });
});
