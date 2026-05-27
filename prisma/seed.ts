import { config } from 'dotenv';
config({ path: '.env.local' });
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
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

  // Demo clients — only create if DB has no clients
  const existingClients = await prisma.client.findMany({ select: { id: true, businessName: true }, orderBy: { businessName: 'asc' } });

  let clients: { id: string; businessName: string }[];

  if (existingClients.length > 0) {
    console.log(`✓ ${existingClients.length} clients already exist, using them for demo data`);
    clients = existingClients;
  } else {
  const createdClients = await Promise.all([
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
  clients = createdClients;
  console.log(`✓ ${clients.length} demo clients created`);
  } // end else (no existing clients)

  // Delete existing quotes and invoices to re-seed
  const deletedPayments = await prisma.payment.deleteMany({});
  const deletedInvLines = await prisma.lineItem.deleteMany({ where: { invoiceId: { not: null } } });
  const deletedQuoteLines = await prisma.lineItem.deleteMany({ where: { quoteId: { not: null } } });
  const deletedInvoices = await prisma.invoice.deleteMany({});
  const deletedQuotes = await prisma.quote.deleteMany({});
  console.log(`✓ Cleared ${deletedQuotes.count} quotes, ${deletedInvoices.count} invoices, ${deletedPayments.count} payments`);

  const today = new Date();
  const inDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };

  // ---- Service packages for varied line items ----
  const servicePackages = [
    {
      title: 'Website Design & Development',
      items: [
        { qty: 1, title: 'Website Design', rate: 25000, description: 'Responsive design with up to 8 pages', taxable: true, order: 0 },
        { qty: 1, title: '.com Domain Registration', rate: 1600, description: 'Annual registration', taxable: true, order: 1 },
        { qty: 1, title: 'Hosting Plan for 1 year', rate: 2500, description: 'Web hosting', taxable: true, order: 2 },
        { qty: 1, title: 'SSL Certificate', rate: 1200, description: '1 year SSL', taxable: true, order: 3 },
      ],
    },
    {
      title: 'SEO & Digital Marketing',
      items: [
        { qty: 1, title: 'SEO Audit & Strategy', rate: 15000, description: 'Complete website SEO audit', taxable: true, order: 0 },
        { qty: 3, title: 'Monthly SEO Optimization', rate: 8000, description: 'On-page & off-page SEO per month', taxable: true, order: 1 },
        { qty: 1, title: 'Google Ads Setup', rate: 5000, description: 'Campaign setup and optimization', taxable: true, order: 2 },
      ],
    },
    {
      title: 'Mobile App Development',
      items: [
        { qty: 1, title: 'UI/UX Design', rate: 35000, description: 'Mobile app wireframes and design', taxable: true, order: 0 },
        { qty: 1, title: 'App Development (Android)', rate: 75000, description: 'Native Android app development', taxable: true, order: 1 },
        { qty: 1, title: 'App Development (iOS)', rate: 75000, description: 'Native iOS app development', taxable: true, order: 2 },
        { qty: 1, title: 'Backend API Development', rate: 40000, description: 'REST API for mobile app', taxable: true, order: 3 },
      ],
    },
    {
      title: 'IT Infrastructure Setup',
      items: [
        { qty: 5, title: 'Workstation Setup', rate: 3000, description: 'Per workstation configuration', taxable: true, order: 0 },
        { qty: 1, title: 'Network Configuration', rate: 12000, description: 'Office network setup', taxable: true, order: 1 },
        { qty: 1, title: 'Firewall & Security', rate: 8000, description: 'Security configuration', taxable: true, order: 2 },
      ],
    },
    {
      title: 'E-Commerce Solution',
      items: [
        { qty: 1, title: 'E-Commerce Website', rate: 45000, description: 'Full e-commerce platform', taxable: true, order: 0 },
        { qty: 1, title: 'Payment Gateway Integration', rate: 5000, description: 'Razorpay/Stripe integration', taxable: true, order: 1 },
        { qty: 1, title: 'Inventory Management Module', rate: 15000, description: 'Stock tracking system', taxable: true, order: 2 },
      ],
    },
    {
      title: 'Annual Maintenance',
      items: [
        { qty: 12, title: 'Monthly Maintenance', rate: 3500, description: 'Website maintenance per month', taxable: true, order: 0 },
        { qty: 1, title: 'Domain Renewal', rate: 1600, description: 'Annual domain renewal', taxable: true, order: 1 },
        { qty: 1, title: 'Hosting Renewal', rate: 2500, description: 'Annual hosting renewal', taxable: true, order: 2 },
      ],
    },
  ];

  function getPackage(index: number) {
    const pkg = servicePackages[index % servicePackages.length];
    const subtotal = pkg.items.reduce((s, li) => s + li.qty * li.rate, 0);
    const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const total = subtotal + taxAmount;
    return { ...pkg, subtotal, taxAmount, total };
  }

  // ---- Seed 50 Quotes ----
  const QUOTE_COUNT = 50;
  const quoteStatuses: Array<'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED' | 'CONVERTED'> = [
    'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'CONVERTED',
  ];

  for (let i = 0; i < QUOTE_COUNT; i++) {
    const pkg = getPackage(i);
    const clientIdx = i % clients.length;
    const number = `AKEYQ-${String(48 + i).padStart(3, '0')}`;
    const status = quoteStatuses[i % quoteStatuses.length];
    const dayOffset = -(i * 3 + Math.floor(i / 5)); // spread across ~5 months

    await prisma.quote.create({
      data: {
        number,
        clientId: clients[clientIdx].id,
        title: `${pkg.title} — ${clients[clientIdx].businessName}`,
        status,
        validUntil: inDays(dayOffset + 30),
        createdDate: inDays(dayOffset),
        subtotal: pkg.subtotal,
        taxPercentage: 18,
        taxAmount: pkg.taxAmount,
        discount: 0,
        total: pkg.total,
        terms: 'This is a fixed price quote. If accepted, we require a 60% deposit upfront.',
        footer: 'Thanks for choosing Ultrakey IT Solutions Private Limited.',
        ...(status === 'ACCEPTED' ? { acceptedAt: inDays(dayOffset + 5) } : {}),
        ...(status === 'DECLINED' ? { declinedAt: inDays(dayOffset + 7), declineReason: 'Budget constraints' } : {}),
        lineItems: {
          create: pkg.items.map((li) => ({ ...li, parentType: 'QUOTE' as const, amount: li.qty * li.rate })),
        },
      },
    });
  }
  console.log(`✓ ${QUOTE_COUNT} demo quotes created`);

  // Update QuoteSettings.nextNumber
  await prisma.quoteSettings.updateMany({ data: { nextNumber: String(48 + QUOTE_COUNT) } });

  // ---- Seed 50 Invoices ----
  const INV_COUNT = 50;
  const invConfigs: Array<{ status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'CANCELLED'; dueOffset: number; paidPct: number }> = [
    { status: 'DRAFT', dueOffset: 14, paidPct: 0 },
    { status: 'SENT', dueOffset: -5, paidPct: 0 },       // overdue
    { status: 'PARTIAL', dueOffset: 10, paidPct: 0.4 },
    { status: 'PAID', dueOffset: -10, paidPct: 1 },
    { status: 'SENT', dueOffset: 7, paidPct: 0 },
    { status: 'CANCELLED', dueOffset: 14, paidPct: 0 },
    { status: 'PAID', dueOffset: -20, paidPct: 1 },
    { status: 'SENT', dueOffset: -1, paidPct: 0 },       // overdue
    { status: 'PARTIAL', dueOffset: 5, paidPct: 0.6 },
    { status: 'DRAFT', dueOffset: 21, paidPct: 0 },
  ];

  for (let i = 0; i < INV_COUNT; i++) {
    const cfg = invConfigs[i % invConfigs.length];
    const pkg = getPackage(i);
    const clientIdx = i % clients.length;
    const number = `AKEYI-${String(124 + i).padStart(4, '0')}`;
    const paid = Math.round(pkg.total * cfg.paidPct);
    const totalDue = Math.max(0, pkg.total - paid);
    const dayOffset = -(i * 2 + Math.floor(i / 5)); // spread across ~4 months

    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: clients[clientIdx].id,
        title: `${pkg.title} — ${clients[clientIdx].businessName}`,
        status: cfg.status,
        dueDate: inDays(dayOffset + cfg.dueOffset),
        createdDate: inDays(dayOffset),
        subtotal: pkg.subtotal,
        taxPercentage: 18,
        taxAmount: pkg.taxAmount,
        discount: 0,
        paid,
        totalDue,
        total: pkg.total,
        terms: 'Payment due within 14 days. Late payment subject to 5% per month fees.',
        footer: 'Thanks for choosing Ultrakey IT Solutions Private Limited.',
        lineItems: {
          create: pkg.items.map((li) => ({ ...li, parentType: 'INVOICE' as const, amount: li.qty * li.rate })),
        },
      },
    });

    if (paid > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          date: inDays(dayOffset + 5),
          amount: paid,
          method: i % 3 === 0 ? 'BANK' : i % 3 === 1 ? 'UPI' : 'RAZORPAY',
          paymentId: `SEED-PMT-${i}`,
          memo: 'Demo seed payment',
          status: 'COMPLETED',
        },
      });
    }
  }
  console.log(`✓ ${INV_COUNT} demo invoices created (with payments)`);

  // Update InvoiceSettings.nextNumber
  await prisma.invoiceSettings.updateMany({ data: { nextNumber: String(124 + INV_COUNT).padStart(4, '0') } });

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
