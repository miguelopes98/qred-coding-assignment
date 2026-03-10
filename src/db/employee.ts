import { Employee } from '@prisma/client';
import prisma from './prisma';

export async function findEmployeesByCompany(companyId: string): Promise<Employee[]> {
  return prisma.employee.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
}

export async function findEmployeeById(id: string): Promise<Employee | null> {
  return prisma.employee.findUnique({ where: { id } });
}
