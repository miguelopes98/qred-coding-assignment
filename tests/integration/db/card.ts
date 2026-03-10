import { expect } from 'chai';
import { findCardsByCompany, findCardsByEmployee, findCardById } from '../../../src/db/card';
import { seedIds } from '../setup';

const unknownId = '00000000-0000-0000-0000-000000000000';

describe('db/card', () => {
  describe('findCardsByCompany', () => {
    it('returns all cards for a company joined through employees', async () => {
      const cards = await findCardsByCompany(seedIds.companyAId);
      expect(cards).to.have.length(2);
    });

    it('includes the employee on each card', async () => {
      const cards = await findCardsByCompany(seedIds.companyAId);
      for (const card of cards) {
        expect(card.employee).to.not.be.undefined;
        expect(card.employee.companyId).to.equal(seedIds.companyAId);
      }
    });

    it('returns empty array for a company with no cards', async () => {
      const cards = await findCardsByCompany(unknownId);
      expect(cards).to.deep.equal([]);
    });
  });

  describe('findCardsByEmployee', () => {
    it('returns all cards for an employee', async () => {
      const cards = await findCardsByEmployee(seedIds.annaId);
      expect(cards).to.have.length(1);
      expect(cards[0].id).to.equal(seedIds.annasCardId);
    });

    it('returns empty array for an employee with no cards', async () => {
      const cards = await findCardsByEmployee(unknownId);
      expect(cards).to.deep.equal([]);
    });
  });

  describe('findCardById', () => {
    it('returns the correct card by id', async () => {
      const card = await findCardById(seedIds.annasCardId);
      expect(card).to.not.be.null;
      expect(card!.market).to.equal('SWEDEN');
      expect(card!.status).to.equal('INACTIVE');
    });

    it('returns null for an unknown id', async () => {
      const card = await findCardById(unknownId);
      expect(card).to.be.null;
    });
  });
});
