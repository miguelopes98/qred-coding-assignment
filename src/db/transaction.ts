import { Transaction, Card } from '@prisma/client';
import prisma from './prisma';

type TransactionWithCard = Transaction & { card: Card };

export async function findTransactionsByCompany(
  companyId: string,
  page: number,
  pageSize: number
): Promise<TransactionWithCard[]> {
  const skip = (page - 1) * pageSize;
  return prisma.transaction.findMany({
    where: { card: { employee: { companyId } } },
    include: { card: true },
    orderBy: { date: 'desc' },
    skip,
    take: pageSize,
  });
}

export async function countTransactionsByCompany(companyId: string): Promise<number> {
  return prisma.transaction.count({
    where: { card: { employee: { companyId } } },
  });
}

export async function findAllTransactionsByCompany(
  companyId: string
): Promise<TransactionWithCard[]> {
  return prisma.transaction.findMany({
    where: { card: { employee: { companyId } } },
    include: { card: true },
    orderBy: { date: 'desc' },
  });
}
