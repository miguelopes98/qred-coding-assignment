import { CardStatus } from '@prisma/client';
import {
  findCardsByCompany,
  findCardsByEmployee,
  findCardById,
  updateCardStatus,
} from '../db/card';
import { NotFoundError, ConflictError } from '../types/errors';
import { CardResponse } from '../types/card';
import { getCurrency } from '../utils/market';
import { withCache } from '../cache/withCache';
import { invalidateCardCaches } from '../cache/invalidators';
import { cardsByCompanyKey, cardsByEmployeeKey } from '../cache/keys';

export const getCardsByCompany = withCache(
  cardsByCompanyKey,
  async (companyId: string): Promise<CardResponse[]> => {
    const cards = await findCardsByCompany(companyId);
    return cards.map((card) => ({
      id: card.id,
      status: card.status,
      market: card.market,
      currency: getCurrency(card.market),
      creditLimit: card.creditLimit,
      amountSpent: card.amountSpent,
      remainingSpend: card.creditLimit - card.amountSpent,
      employee: { id: card.employee.id, name: card.employee.name },
    }));
  }
);

export const getCardsByEmployee = withCache(
  cardsByEmployeeKey,
  async (employeeId: string): Promise<CardResponse[]> => {
    const cards = await findCardsByEmployee(employeeId);
    return cards.map((card) => ({
      id: card.id,
      status: card.status,
      market: card.market,
      currency: getCurrency(card.market),
      creditLimit: card.creditLimit,
      amountSpent: card.amountSpent,
      remainingSpend: card.creditLimit - card.amountSpent,
    }));
  }
);

export async function activateCard(cardId: string): Promise<CardResponse> {
  const card = await findCardById(cardId);
  if (!card) {
    throw new NotFoundError('Card not found');
  }

  if (card.status === CardStatus.ACTIVE || card.status === CardStatus.PENDING) {
    throw new ConflictError(`Card cannot be activated: current status is ${card.status}`);
  }

  const updated = await updateCardStatus(cardId, CardStatus.ACTIVE);

  invalidateCardCaches(card.employeeId, card.employee.companyId);

  return {
    id: updated.id,
    status: updated.status,
    market: updated.market,
    currency: getCurrency(updated.market),
    creditLimit: updated.creditLimit,
    amountSpent: updated.amountSpent,
    remainingSpend: updated.creditLimit - updated.amountSpent,
  };
}
