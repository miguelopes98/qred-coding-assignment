import { InvoiceStatus, Market } from '@prisma/client';
import { findInvoicesByCompany } from '../db/invoice';
import { InvoiceResponse } from '../types/invoice';
import { getCurrency } from '../utils/market';

export async function getInvoicesByCompany(
  companyId: string,
  status?: InvoiceStatus
): Promise<InvoiceResponse[]> {
  const invoices = await findInvoicesByCompany(companyId, status);

  if (status !== InvoiceStatus.DUE) {
    return invoices.map((invoice) => {
      const market = invoice.cards[0]?.market ?? Market.SWEDEN;
      return {
        id: invoice.id,
        amount: invoice.amount,
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
        status: invoice.status,
        market,
        currency: getCurrency(market),
      };
    });
  }

  const latestByMarket = new Map<Market, (typeof invoices)[number]>();
  for (const invoice of invoices) {
    const market = invoice.cards[0]?.market ?? Market.SWEDEN;
    if (!latestByMarket.has(market)) {
      latestByMarket.set(market, invoice);
    }
  }

  const result: InvoiceResponse[] = [];
  for (const [market, invoice] of latestByMarket) {
    result.push({
      id: invoice.id,
      amount: invoice.amount,
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      status: invoice.status,
      market,
      currency: getCurrency(market),
    });
  }
  return result;
}
