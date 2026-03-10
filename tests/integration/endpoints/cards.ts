import { expect } from 'chai';
import request from 'supertest';
import { PrismaClient, CardStatus } from '@prisma/client';
import { Server } from '../../../src/server';
import { seedIds } from '../setup';

const app = new Server(0).expressApp;
const prisma = new PrismaClient();

describe('POST /v1/cards/:cardId/activate', () => {
  beforeEach(async () => {
    await prisma.card.update({
      where: { id: seedIds.annasCardId },
      data: { status: CardStatus.INACTIVE },
    });
  });

  it('activates an INACTIVE card and returns it with status ACTIVE', async () => {
    const res = await request(app).post(`/v1/cards/${seedIds.annasCardId}/activate`);
    expect(res.status).to.equal(200);
    expect(res.body.status).to.equal('ACTIVE');
    expect(res.body.id).to.equal(seedIds.annasCardId);
    expect(res.body).to.have.all.keys(
      'id',
      'status',
      'market',
      'currency',
      'creditLimit',
      'amountSpent',
      'remainingSpend'
    );
  });

  it('returns 409 when activating an already ACTIVE card', async () => {
    await prisma.card.update({
      where: { id: seedIds.annasCardId },
      data: { status: CardStatus.ACTIVE },
    });
    const res = await request(app).post(`/v1/cards/${seedIds.annasCardId}/activate`);
    expect(res.status).to.equal(409);
    expect(res.body.error.code).to.equal('CONFLICT');
  });

  it('returns 409 when activating a PENDING card', async () => {
    await prisma.card.update({
      where: { id: seedIds.annasCardId },
      data: { status: CardStatus.PENDING },
    });
    const res = await request(app).post(`/v1/cards/${seedIds.annasCardId}/activate`);
    expect(res.status).to.equal(409);
    expect(res.body.error.code).to.equal('CONFLICT');
  });

  it('returns 404 for an unknown card id', async () => {
    const res = await request(app).post('/v1/cards/00000000-0000-0000-0000-000000000000/activate');
    expect(res.status).to.equal(404);
    expect(res.body.error.code).to.equal('NOT_FOUND');
  });

  it('returns 400 for a non-UUID card id', async () => {
    const res = await request(app).post('/v1/cards/not-a-uuid/activate');
    expect(res.status).to.equal(400);
    expect(res.body.error.code).to.equal('VALIDATION_ERROR');
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
