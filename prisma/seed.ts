import { PrismaClient, CardStatus, Market, InvoiceStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.card.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.company.deleteMany();

  const companyA = await prisma.company.create({ data: { name: 'Qred AB' } });
  const companyB = await prisma.company.create({ data: { name: 'Qred OY' } });

  const anna = await prisma.employee.create({
    data: { companyId: companyA.id, name: 'Anna Svensson', email: 'anna@qredab.se' },
  });
  const erik = await prisma.employee.create({
    data: { companyId: companyA.id, name: 'Erik Lindqvist', email: 'erik@qredab.se' },
  });
  const lars = await prisma.employee.create({
    data: { companyId: companyB.id, name: 'Lars Hansen', email: 'lars@qredoy.fi' },
  });

  const annasCard = await prisma.card.create({
    data: {
      employeeId: anna.id,
      status: CardStatus.INACTIVE,
      market: Market.SWEDEN,
      creditLimit: 10000000,
      amountSpent: 5400000,
    },
  });
  const eriksCard = await prisma.card.create({
    data: {
      employeeId: erik.id,
      status: CardStatus.ACTIVE,
      market: Market.FINLAND,
      creditLimit: 5000000,
      amountSpent: 1200000,
    },
  });
  await prisma.card.create({
    data: {
      employeeId: lars.id,
      status: CardStatus.ACTIVE,
      market: Market.SWEDEN,
      creditLimit: 8000000,
      amountSpent: 3100000,
    },
  });

  await prisma.invoice.create({
    data: {
      companyId: companyA.id,
      amount: 6600000,
      dueDate: new Date('2026-04-01'),
      status: InvoiceStatus.DUE,
      cards: { connect: [{ id: annasCard.id }, { id: eriksCard.id }] },
    },
  });

  const categories = ['Office', 'Travel', 'Software', 'Meals', 'Marketing', 'Hardware', 'Other'];
  const descriptions = [
    'Office supplies',
    'Flight to Stockholm',
    'GitHub subscription',
    'Team lunch',
    'Google Ads',
    'Laptop charger',
    'Taxi to airport',
    'Slack subscription',
    'Client dinner',
    'Printer paper',
    'Train to Gothenburg',
    'Figma license',
    'Conference catering',
    'Facebook Ads',
    'USB hub',
    'Coffee shop meeting',
    'Adobe subscription',
    'Team breakfast',
    'LinkedIn Ads',
    'Monitor stand',
  ];

  const baseDate = new Date('2026-03-01');
  for (let i = 0; i < 57; i++) {
    const daysBack = Math.floor(i / 2);
    const txDate = new Date(baseDate);
    txDate.setDate(baseDate.getDate() - daysBack);
    await prisma.transaction.create({
      data: {
        cardId: annasCard.id,
        description: descriptions[i % descriptions.length],
        amount: 10000 + ((i * 3700) % 490000),
        date: txDate,
        category: categories[i % categories.length],
      },
    });
  }
}

main()
  .then(() => {
    console.log('Seed complete');
  })
  .catch((err) => {
    console.error('Seed failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
