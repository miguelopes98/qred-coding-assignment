import { expect } from 'chai';
import sinon from 'sinon';
import { CardStatus, Market } from '@prisma/client';
import * as cardDb from '../../../src/db/card';
import { getCardsByCompany, getCardsByEmployee, activateCard } from '../../../src/services/cards';
import { NotFoundError, ConflictError } from '../../../src/types/errors';
import cache from '../../../src/cache/client';

const annaEmail = 'anna@test.se';

const makeCard = (
  overrides: {
    id?: string;
    status?: CardStatus;
    market?: Market;
    creditLimit?: number;
    amountSpent?: number;
    employeeId?: string;
  } = {}
) => ({
  id: 'card-1',
  status: CardStatus.ACTIVE,
  market: Market.SWEDEN,
  creditLimit: 1000000,
  amountSpent: 0,
  employeeId: 'emp-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeEmployee = (
  overrides: { id?: string; name?: string; email?: string; companyId?: string } = {}
) => ({
  id: 'emp-1',
  name: 'Anna',
  email: annaEmail,
  companyId: 'co-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeCardWithEmployee = (
  cardOverrides: Parameters<typeof makeCard>[0] = {},
  employeeOverrides: Parameters<typeof makeEmployee>[0] = {}
) => ({
  ...makeCard(cardOverrides),
  employee: makeEmployee(employeeOverrides),
});

describe('cards service', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    cache.flushAll();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getCardsByCompany', () => {
    it('computes remainingSpend as creditLimit minus amountSpent', async () => {
      const fakeCard = makeCardWithEmployee({ amountSpent: 400000 });
      sandbox.stub(cardDb, 'findCardsByCompany').resolves([fakeCard]);

      const result = await getCardsByCompany('co-1');

      expect(result[0].remainingSpend).to.equal(600000);
    });

    it('derives SEK currency for SWEDEN market', async () => {
      const fakeCard = makeCardWithEmployee();
      sandbox.stub(cardDb, 'findCardsByCompany').resolves([fakeCard]);

      const result = await getCardsByCompany('co-1');

      expect(result[0].currency).to.equal('SEK');
    });

    it('derives EUR currency for FINLAND market', async () => {
      const fakeCard = makeCardWithEmployee(
        { id: 'card-2', market: Market.FINLAND, creditLimit: 500000, employeeId: 'emp-2' },
        { id: 'emp-2', name: 'Erik', email: 'erik@test.fi' }
      );
      sandbox.stub(cardDb, 'findCardsByCompany').resolves([fakeCard]);

      const result = await getCardsByCompany('co-1');

      expect(result[0].currency).to.equal('EUR');
    });

    it('returns empty array when company has no cards', async () => {
      sandbox.stub(cardDb, 'findCardsByCompany').resolves([]);

      const result = await getCardsByCompany('co-empty');

      expect(result).to.deep.equal([]);
    });
  });

  describe('getCardsByEmployee', () => {
    it('includes employee field when fetching by company but not by employee', async () => {
      const fakeCard = makeCard({
        market: Market.DENMARK,
        creditLimit: 2000000,
        amountSpent: 800000,
      });
      sandbox.stub(cardDb, 'findCardsByEmployee').resolves([fakeCard]);

      const result = await getCardsByEmployee('emp-1');

      expect(result[0].remainingSpend).to.equal(1200000);
      expect(result[0].currency).to.equal('DKK');
      expect(result[0]).to.not.have.property('employee');
    });
  });

  describe('activateCard', () => {
    it('activates an INACTIVE card and returns it with status ACTIVE', async () => {
      const inactiveCard = makeCardWithEmployee({ status: CardStatus.INACTIVE });
      const activatedCard = { ...inactiveCard, status: CardStatus.ACTIVE };
      sandbox.stub(cardDb, 'findCardById').resolves(inactiveCard);
      sandbox.stub(cardDb, 'updateCardStatus').resolves(activatedCard);

      const result = await activateCard('card-1');

      expect(result.status).to.equal(CardStatus.ACTIVE);
    });

    it('throws ConflictError if card is already ACTIVE', async () => {
      const activeCard = makeCardWithEmployee();
      sandbox.stub(cardDb, 'findCardById').resolves(activeCard);

      try {
        await activateCard('card-1');
        expect.fail('Expected ConflictError');
      } catch (err) {
        expect(err).to.be.instanceOf(ConflictError);
      }
    });

    it('throws ConflictError if card is PENDING', async () => {
      const pendingCard = makeCardWithEmployee({ status: CardStatus.PENDING });
      sandbox.stub(cardDb, 'findCardById').resolves(pendingCard);

      try {
        await activateCard('card-1');
        expect.fail('Expected ConflictError');
      } catch (err) {
        expect(err).to.be.instanceOf(ConflictError);
      }
    });

    it('throws NotFoundError if card does not exist', async () => {
      sandbox.stub(cardDb, 'findCardById').resolves(null);

      try {
        await activateCard('nonexistent-id');
        expect.fail('Expected NotFoundError');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });
});
