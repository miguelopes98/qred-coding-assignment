import { expect } from 'chai';
import { findAllCompanies, findCompanyById } from '../../../src/db/company';
import { seedIds } from '../setup';

describe('db/company', () => {
  describe('findAllCompanies', () => {
    it('returns all companies', async () => {
      const companies = await findAllCompanies();
      expect(companies.length).to.be.at.least(2);
    });

    it('returns companies ordered by name ascending', async () => {
      const companies = await findAllCompanies();
      const names = companies.map((c) => c.name);
      const sorted = [...names].sort();
      expect(names).to.deep.equal(sorted);
    });
  });

  describe('findCompanyById', () => {
    it('returns the correct company by id', async () => {
      const company = await findCompanyById(seedIds.companyAId);
      expect(company).to.not.be.null;
      expect(company!.id).to.equal(seedIds.companyAId);
      expect(company!.name).to.equal('Qred AB');
    });

    it('returns null for an unknown id', async () => {
      const company = await findCompanyById('00000000-0000-0000-0000-000000000000');
      expect(company).to.be.null;
    });
  });
});
