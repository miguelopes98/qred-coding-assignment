import { expect } from 'chai';
import request from 'supertest';
import { Server } from '../../../src/server';
import { seedIds } from '../setup';

const app = new Server(0).expressApp;

describe('GET /v1/employees/:employeeId', () => {
  it('returns the employee with companyId', async () => {
    const res = await request(app).get(`/v1/employees/${seedIds.annaId}`);
    expect(res.status).to.equal(200);
    expect(res.body.id).to.equal(seedIds.annaId);
    expect(res.body.name).to.equal('Anna Svensson');
    expect(res.body.companyId).to.equal(seedIds.companyAId);
    expect(res.body).to.have.all.keys('id', 'name', 'email', 'companyId');
  });

  it('returns 404 for unknown employee id', async () => {
    const res = await request(app).get('/v1/employees/00000000-0000-0000-0000-000000000000');
    expect(res.status).to.equal(404);
    expect(res.body.error.code).to.equal('NOT_FOUND');
  });

  it('returns 400 for a non-UUID employee id', async () => {
    const res = await request(app).get('/v1/employees/not-a-uuid');
    expect(res.status).to.equal(400);
    expect(res.body.error.code).to.equal('VALIDATION_ERROR');
  });
});

describe('GET /v1/employees/:employeeId/cards', () => {
  it('returns cards with computed fields for an employee', async () => {
    const res = await request(app).get(`/v1/employees/${seedIds.annaId}/cards`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.length(1);
    const card = res.body[0];
    expect(card).to.have.all.keys(
      'id',
      'status',
      'market',
      'currency',
      'creditLimit',
      'amountSpent',
      'remainingSpend'
    );
    expect(card.remainingSpend).to.equal(card.creditLimit - card.amountSpent);
    expect(card.currency).to.equal('SEK');
  });

  it('returns empty array for employee with no cards', async () => {
    const res = await request(app).get('/v1/employees/00000000-0000-0000-0000-000000000000/cards');
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([]);
  });
});
