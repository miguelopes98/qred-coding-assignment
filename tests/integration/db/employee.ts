import { expect } from 'chai';
import { findEmployeesByCompany, findEmployeeById } from '../../../src/db/employee';
import { seedIds } from '../setup';

describe('db/employee', () => {
  describe('findEmployeesByCompany', () => {
    it('returns all employees for a company', async () => {
      const employees = await findEmployeesByCompany(seedIds.companyAId);
      expect(employees).to.have.length(2);
      const names = employees.map((e) => e.name).sort();
      expect(names).to.deep.equal(['Anna Svensson', 'Erik Lindqvist']);
    });

    it('returns empty array for a company with no employees', async () => {
      const employees = await findEmployeesByCompany('00000000-0000-0000-0000-000000000000');
      expect(employees).to.deep.equal([]);
    });
  });

  describe('findEmployeeById', () => {
    it('returns the correct employee by id', async () => {
      const employee = await findEmployeeById(seedIds.annaId);
      expect(employee).to.not.be.null;
      expect(employee!.name).to.equal('Anna Svensson');
      expect(employee!.companyId).to.equal(seedIds.companyAId);
    });

    it('returns null for an unknown id', async () => {
      const employee = await findEmployeeById('00000000-0000-0000-0000-000000000000');
      expect(employee).to.be.null;
    });
  });
});
