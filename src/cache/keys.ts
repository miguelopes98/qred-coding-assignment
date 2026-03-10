export const companyListKey = (): string => 'companies:all';

export const companyKey = (id: string): string => `company:${id}`;

export const cardsByCompanyKey = (companyId: string): string => `cards:company:${companyId}`;

export const cardsByEmployeeKey = (employeeId: string): string => `cards:employee:${employeeId}`;

export const employeesByCompanyKey = (companyId: string): string =>
  `employees:company:${companyId}`;

export const employeeKey = (id: string): string => `employee:${id}`;
