import {
  findTransactionsByCompany,
  countTransactionsByCompany,
  findAllTransactionsByCompany,
} from '../db/transaction';
import { TransactionResponse, PaginatedResponse } from '../types/api.types';
import { getCurrency } from '../utils/market';

export async function getTransactionsByCompany(
  companyId: string,
  page: number,
  pageSize: number
): Promise<PaginatedResponse<TransactionResponse>> {
  const [transactions, totalCount] = await Promise.all([
    findTransactionsByCompany(companyId, page, pageSize),
    countTransactionsByCompany(companyId),
  ]);

  const items: TransactionResponse[] = transactions.map((tx) => ({
    id: tx.id,
    description: tx.description,
    amount: tx.amount,
    date: tx.date.toISOString().slice(0, 10),
    category: tx.category,
    currency: getCurrency(tx.card.market),
  }));

  return { items, totalCount, page, pageSize };
}

export async function exportTransactionsByCompany(companyId: string): Promise<string> {
  const transactions = await findAllTransactionsByCompany(companyId);

  const header = 'id,description,amount,date,category,currency';
  const rows = transactions.map((tx) => {
    const currency = getCurrency(tx.card.market);
    const description = `"${tx.description.replace(/"/g, '""')}"`;
    return `${tx.id},${description},${tx.amount},${tx.date.toISOString().slice(0, 10)},${tx.category},${currency}`;
  });

  return [header, ...rows].join('\n');
}
