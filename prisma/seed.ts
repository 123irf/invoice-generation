import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding...');

  // Singleton settings — only create if missing
  const existingBusiness = await prisma.businessSettings.findFirst();
  if (!existingBusiness) {
    await prisma.businessSettings.create({ data: {} });
    await prisma.quoteSettings.create({ data: {} });
    await prisma.invoiceSettings.create({ data: {} });
    await prisma.paymentSettings.create({ data: {} });
    await prisma.taxSettings.create({ data: {} });
    await prisma.emailSettings.create({ data: {} });
    await prisma.translateSettings.create({ data: {} });
    console.log('✓ Default settings created');
  }

  // Pre-defined line items
  if ((await prisma.predefinedLineItem.count()) === 0) {
    await prisma.predefinedLineItem.createMany({
      data: [
        { qty: 1, title: '.com/.in Domain Registration Charges per year', rate: 1600, description: 'Domain Registration Per Year', order: 0 },
        { qty: 1, title: 'Hosting Plan for 1 year', rate: 2500, description: 'Web Hosting Space for 1 year', order: 1 },
        { qty: 1, title: 'SSL Certificate for 1 Year', rate: 1200, description: 'SSL Certificate for 1 Year', order: 2 },
        { qty: 1, title: 'Website Design', rate: 25000, description: 'Custom website design and development', order: 3 },
      ],
    });
    console.log('✓ Predefined line items created');
  }

  // Demo clients — only seed if DB is otherwise empty (don't override real data)
  const clientCount = await prisma.client.count();
  if (clientCount > 0) {
    console.log(`✓ ${clientCount} clients already exist, skipping demo data`);
    return;
  }

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        businessName: 'Sainbiz Solutions Pvt. Ltd.',
        firstName: 'Sankara',
        lastName: 'Vaka',
        email: 'sankara.vaka@sainbiz.com',
        phone: '+91 98765 43210',
        address: 'Hyderabad, Telangana, India',
        extraInfo: '<b>GST:</b> 36AABCS1234N1Z5',
        website: 'https://sainbiz.com',
      },
    }),
    prisma.client.create({
      data: {
        businessName: 'First Partner Consultancy',
        firstName: 'Admin',
        email: 'support@firstpartnerconsulting.com',
        phone: '+91 90000 11111',
        address: 'Bangalore, Karnataka, India',
      },
    }),
    prisma.client.create({
      data: {
        businessName: 'Infasta',
        firstName: 'Nagaraj',
        email: 'accounts@infasta.com',
        phone: '+91 99887 76655',
        address: 'Mumbai, Maharashtra, India',
      },
    }),
    prisma.client.create({
      data: {
        businessName: 'Goldenkey Chikki',
        firstName: 'Pranay',
        lastName: 'Raj',
        email: 'sales@goldenkey.in',
        phone: '+91 90909 80808',
        address: 'Chennai, Tamil Nadu, India',
      },
    }),
    prisma.client.create({
      data: {
        businessName: 'Sai Gayatri Curry Point',
        firstName: 'DRK',
        lastName: 'Chowdary',
        email: 'drkchowdary55@gmail.com',
        phone: '+91 98765 12345',
        address: 'Hyderabad, Telangana, India',
      },
    }),
    prisma.client.create({
      data: {
        businessName: 'PrepMode Education',
        firstName: 'Admin',
        email: 'admin@prepmode.in',
        phone: '+91 88888 77777',
        address: 'Hyderabad, Telangana, India',
      },
    }),
  ]);
  console.log(`✓ ${clients.length} demo clients created`);

  const today = new Date();
  const inDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };

  // Seed quotes — AKEYQ-48 through AKEYQ-52
  const quoteLineItems = [
    { qty: 1, title: 'Website Design', rate: 25000, description: 'Responsive design with up to 8 pages', taxable: true, order: 0 },
    { qty: 1, title: '.com Domain Registration', rate: 1600, description: 'Annual registration', taxable: true, order: 1 },
    { qty: 1, title: 'Hosting Plan for 1 year', rate: 2500, description: 'Web hosting', taxable: true, order: 2 },
    { qty: 1, title: 'SSL Certificate', rate: 1200, description: '1 year SSL', taxable: true, order: 3 },
  ];
  const quoteSubtotal = quoteLineItems.reduce((s, li) => s + li.qty * li.rate, 0);
  const quoteTax = Math.round(quoteSubtotal * 0.18 * 100) / 100;
  const quoteTotal = quoteSubtotal + quoteTax;

  const quoteStatuses: Array<'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'CONVERTED'> = [
    'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'CONVERTED',
  ];

  for (let i = 0; i < 5; i++) {
    const number = `AKEYQ-${48 + i}`;
    await prisma.quote.create({
      data: {
        number,
        clientId: clients[i % clients.length].id,
        title: `Website redesign — ${clients[i % clients.length].businessName}`,
        status: quoteStatuses[i],
        validUntil: inDays(15),
        createdDate: inDays(-(i * 3)),
        subtotal: quoteSubtotal,
        taxPercentage: 18,
        taxAmount: quoteTax,
        discount: 0,
        total: quoteTotal,
        terms: 'This is a fixed price quote. If accepted, we require a 60% deposit upfront.',
        footer: 'Thanks for choosing Ultrakey IT Solutions Private Limited.',
        lineItems: {
          create: quoteLineItems.map((li) => ({ ...li, parentType: 'QUOTE' as const, amount: li.qty * li.rate })),
        },
      },
    });
  }
  console.log('✓ 5 demo quotes created');

  // Update QuoteSettings.nextNumber to 53
  await prisma.quoteSettings.updateMany({ data: { nextNumber: '53' } });

  // Seed invoices — AKEYI-0124 through AKEYI-0127 with mixed statuses
  const invStatuses: Array<{ status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL'; dueOffset: number; paid?: number }> = [
    { status: 'DRAFT', dueOffset: 14 },
    { status: 'SENT', dueOffset: -3 }, // past-due → OVERDUE
    { status: 'PARTIAL', dueOffset: 7, paid: 15000 },
    { status: 'PAID', dueOffset: -10, paid: quoteTotal },
  ];

  for (let i = 0; i < invStatuses.length; i++) {
    const cfg = invStatuses[i];
    const number = `AKEYI-${String(124 + i).padStart(4, '0')}`;
    const paid = cfg.paid ?? 0;
    const totalDue = Math.max(0, quoteTotal - paid);

    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: clients[i % clients.length].id,
        title: `Project services — ${clients[i % clients.length].businessName}`,
        status: cfg.status,
        dueDate: inDays(cfg.dueOffset),
        createdDate: inDays(-Math.abs(cfg.dueOffset) - 14),
        subtotal: quoteSubtotal,
        taxPercentage: 18,
        taxAmount: quoteTax,
        discount: 0,
        paid,
        totalDue,
        total: quoteTotal,
        terms: 'Payment due within 14 days. Late payment subject to 5% per month fees.',
        footer: 'Thanks for choosing Ultrakey IT Solutions Private Limited.',
        lineItems: {
          create: quoteLineItems.map((li) => ({ ...li, parentType: 'INVOICE' as const, amount: li.qty * li.rate })),
        },
      },
    });

    if (paid > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          date: inDays(-3),
          amount: paid,
          method: 'BANK',
          paymentId: `SEED-PMT-${i}`,
          memo: 'Demo seed payment',
          status: 'COMPLETED',
        },
      });
    }
  }
  console.log('✓ 4 demo invoices created (with payments)');

  // Update InvoiceSettings.nextNumber to 0128
  await prisma.invoiceSettings.updateMany({ data: { nextNumber: '0128' } });

  console.log('Seeding complete ✓');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
