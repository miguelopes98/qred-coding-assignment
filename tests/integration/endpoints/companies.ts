import { expect } from 'chai';
import request from 'supertest';
import { Server } from '../../../src/server';
import { seedIds } from '../setup';

const app = new Server(0).expressApp;

describe('GET /v1/companies', () => {
  it('returns a list of companies', async () => {
    const res = await request(app).get('/v1/companies');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.be.at.least(2);
    expect(res.body[0]).to.have.all.keys('id', 'name');
  });
});

describe('GET /v1/companies/:companyId', () => {
  it('returns the company by id', async () => {
    const res = await request(app).get(`/v1/companies/${seedIds.companyAId}`);
    expect(res.status).to.equal(200);
    expect(res.body.id).to.equal(seedIds.companyAId);
    expect(res.body.name).to.equal('Qred AB');
  });

  it('returns 404 for an unknown company id', async () => {
    const res = await request(app).get('/v1/companies/00000000-0000-0000-0000-000000000000');
    expect(res.status).to.equal(404);
    expect(res.body.error.code).to.equal('NOT_FOUND');
  });

  it('returns 400 for a non-UUID company id', async () => {
    const res = await request(app).get('/v1/companies/not-a-uuid');
    expect(res.status).to.equal(400);
    expect(res.body.error.code).to.equal('VALIDATION_ERROR');
  });
});

describe('GET /v1/companies/:companyId/cards', () => {
  it('returns cards with computed fields', async () => {
    const res = await request(app).get(`/v1/companies/${seedIds.companyAId}/cards`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body).to.have.length(2);

    const card = res.body[0];
    expect(card).to.have.all.keys(
      'id',
      'status',
      'market',
      'currency',
      'creditLimit',
      'amountSpent',
      'remainingSpend',
      'employee'
    );
    expect(card.remainingSpend).to.equal(card.creditLimit - card.amountSpent);
    expect(card.employee).to.have.all.keys('id', 'name');
  });

  it('returns an empty array for a company with no cards', async () => {
    const res = await request(app).get('/v1/companies/00000000-0000-0000-0000-000000000000/cards');
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([]);
  });

  it('returns 400 for a non-UUID company id', async () => {
    const res = await request(app).get('/v1/companies/bad-id/cards');
    expect(res.status).to.equal(400);
  });
});

describe('GET /v1/companies/:companyId/invoices', () => {
  it('returns the latest DUE invoice per market when status=DUE', async () => {
    const res = await request(app).get(`/v1/companies/${seedIds.companyAId}/invoices?status=DUE`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.be.at.least(1);
    const invoice = res.body[0];
    expect(invoice).to.have.all.keys('id', 'amount', 'dueDate', 'status', 'market', 'currency');
    expect(invoice.status).to.equal('DUE');
  });

  it('returns empty array when no invoices match status=PAID', async () => {
    const res = await request(app).get(`/v1/companies/${seedIds.companyAId}/invoices?status=PAID`);
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([]);
  });

  it('returns 400 for an invalid status value', async () => {
    const res = await request(app).get(
      `/v1/companies/${seedIds.companyAId}/invoices?status=INVALID`
    );
    expect(res.status).to.equal(400);
  });
});

describe('GET /v1/companies/:companyId/transactions', () => {
  it('returns page 1 with pageSize 3 and correct totalCount', async () => {
    const res = await request(app).get(
      `/v1/companies/${seedIds.companyAId}/transactions?page=1&pageSize=3`
    );
    expect(res.status).to.equal(200);
    expect(res.body.items).to.have.length(3);
    expect(res.body.totalCount).to.equal(57);
    expect(res.body.page).to.equal(1);
    expect(res.body.pageSize).to.equal(3);
  });

  it('returns items with correct shape', async () => {
    const res = await request(app).get(
      `/v1/companies/${seedIds.companyAId}/transactions?page=1&pageSize=1`
    );
    const tx = res.body.items[0];
    expect(tx).to.have.all.keys('id', 'description', 'amount', 'date', 'category', 'currency');
    expect(tx.currency).to.equal('SEK');
  });

  it('returns 400 for invalid page param', async () => {
    const res = await request(app).get(`/v1/companies/${seedIds.companyAId}/transactions?page=0`);
    expect(res.status).to.equal(400);
  });

  it('returns 400 for pageSize exceeding 100', async () => {
    const res = await request(app).get(
      `/v1/companies/${seedIds.companyAId}/transactions?pageSize=101`
    );
    expect(res.status).to.equal(400);
  });
});

describe('GET /v1/companies/:companyId/transactions/export', () => {
  it('returns a CSV file with correct content-type', async () => {
    const res = await request(app).get(`/v1/companies/${seedIds.companyAId}/transactions/export`);
    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.include('text/csv');
  });

  it('includes a header row in the CSV', async () => {
    const res = await request(app).get(`/v1/companies/${seedIds.companyAId}/transactions/export`);
    const lines = res.text.split('\n');
    expect(lines[0]).to.equal('id,description,amount,date,category,currency');
  });

  it('includes all 57 transaction rows', async () => {
    const res = await request(app).get(`/v1/companies/${seedIds.companyAId}/transactions/export`);
    const lines = res.text.trim().split('\n');
    expect(lines).to.have.length(58);
  });
});

describe('GET /v1/companies/:companyId/employees', () => {
  it('returns all employees for a company', async () => {
    const res = await request(app).get(`/v1/companies/${seedIds.companyAId}/employees`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body).to.have.length(2);
    expect(res.body[0]).to.have.all.keys('id', 'name', 'email');
  });

  it('returns empty array for a company with no employees', async () => {
    const res = await request(app).get(
      '/v1/companies/00000000-0000-0000-0000-000000000000/employees'
    );
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([]);
  });
});
