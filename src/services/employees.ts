import { findEmployeesByCompany, findEmployeeById } from '../db/employee';
import { NotFoundError } from '../types/errors';
import { EmployeeResponse, EmployeeSummaryResponse } from '../types/api.types';
import { withCache } from '../cache/withCache';
import { employeesByCompanyKey, employeeKey } from '../cache/keys';

export const getEmployeesByCompany = withCache(
  employeesByCompanyKey,
  async (companyId: string): Promise<EmployeeSummaryResponse[]> => {
    const employees = await findEmployeesByCompany(companyId);
    return employees.map((e) => ({ id: e.id, name: e.name, email: e.email }));
  }
);

export const getEmployee = withCache(employeeKey, async (id: string): Promise<EmployeeResponse> => {
  const employee = await findEmployeeById(id);
  if (!employee) {
    throw new NotFoundError('Employee not found');
  }
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    companyId: employee.companyId,
  };
});
