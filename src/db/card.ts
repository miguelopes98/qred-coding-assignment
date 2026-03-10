import { Card, CardStatus, Employee } from '@prisma/client';
import prisma from './prisma';

type CardWithEmployee = Card & { employee: Employee };

export async function findCardsByCompany(companyId: string): Promise<CardWithEmployee[]> {
  return prisma.card.findMany({
    where: { employee: { companyId } },
    include: { employee: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findCardsByEmployee(employeeId: string): Promise<Card[]> {
  return prisma.card.findMany({ where: { employeeId }, orderBy: { createdAt: 'asc' } });
}

export async function findCardById(id: string): Promise<CardWithEmployee | null> {
  return prisma.card.findUnique({ where: { id }, include: { employee: true } });
}

export async function updateCardStatus(id: string, status: CardStatus): Promise<Card> {
  return prisma.card.update({ where: { id }, data: { status } });
}
