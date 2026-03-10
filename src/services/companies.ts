import { findAllCompanies, findCompanyById } from '../db/company';
import { NotFoundError } from '../types/errors';
import { CompanyResponse } from '../types/company';
import { withCache } from '../cache/withCache';
import { companyListKey, companyKey } from '../cache/keys';

export const listCompanies = withCache(companyListKey, async (): Promise<CompanyResponse[]> => {
  const companies = await findAllCompanies();
  return companies.map((c) => ({ id: c.id, name: c.name }));
});

export const getCompany = withCache(companyKey, async (id: string): Promise<CompanyResponse> => {
  const company = await findCompanyById(id);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  return { id: company.id, name: company.name };
});
