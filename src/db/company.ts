import { Company } from '@prisma/client';
import prisma from './prisma';

export async function findAllCompanies(): Promise<Company[]> {
  return prisma.company.findMany({ orderBy: { name: 'asc' } });
}

export async function findCompanyById(id: string): Promise<Company | null> {
  return prisma.company.findUnique({ where: { id } });
}
