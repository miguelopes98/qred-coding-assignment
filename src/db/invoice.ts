import { Invoice, InvoiceStatus, Card } from '@prisma/client';
import prisma from './prisma';

type InvoiceWithCards = Invoice & { cards: Card[] };

export async function findInvoicesByCompany(
  companyId: string,
  status?: InvoiceStatus
): Promise<InvoiceWithCards[]> {
  return prisma.invoice.findMany({
    where: { companyId, ...(status !== undefined ? { status } : {}) },
    include: { cards: true },
    orderBy: { createdAt: 'desc' },
  });
}
