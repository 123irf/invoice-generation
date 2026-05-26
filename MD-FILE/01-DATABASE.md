# Step 1 — Database Schema

## Goal

Define the complete Prisma schema for all models, run the initial migration, generate the
Prisma client, and create the seed file skeleton (we'll fill it in Step 13).

This step writes ALL models we'll need throughout the build. No schema changes after this
point unless explicitly noted in a later step.

## Prerequisites

- Step 0 complete (Next.js scaffold, Prisma initialized, `DATABASE_URL` set)

## Steps

### 1. Replace `prisma/schema.prisma` with the full schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// SETTINGS — Singleton tables (one row each)
// ============================================================

model BusinessSettings {
  id              String   @id @default(cuid())
  logoUrl         String?
  name            String   @default("Ultrakey IT Solutions Private Limited")
  address         String   @default("Flat No. 204, 2nd Floor, Cyber Residency,\nInidra Nagar, Gachibowli,\nHyderabad, Telangana, India-500032\nsupport@ultrakeyit.com")
  extraInfo       String   @default("<b>GST No:</b> 36AADCU5062A1ZO")
  website         String   @default("https://ultrakeyit.com")
  fiscalYearStart String   @default("04-01")  // MM-DD
  fiscalYearEnd   String   @default("03-31")
  updatedAt       DateTime @updatedAt
}

model QuoteSettings {
  id                       String   @id @default(cuid())
  prefix                   String   @default("AKEYQ-")
  suffix                   String   @default("")
  autoIncrement            Boolean  @default(true)
  nextNumber               String   @default("52")
  validForDays             Int      @default(15)
  defaultTerms             String   @default("This is a fixed price quote. If accepted, we require a 60% deposit upfront before work commences.")
  defaultFooter            String   @default("Thanks for choosing <a href=\"https://ultrakeyit.com\" target=\"_blank\">Ultrakey IT Solutions Private Limited</a> | <a href=\"mailto:support@ultrakeyit.com\">support@ultrakeyit.com</a>")
  showAcceptButton         Boolean  @default(true)
  acceptedQuoteAction      String   @default("convert_and_send")  // convert_and_send | convert_only | mark_accepted
  acceptQuoteText          String   @default("**Please Note: After accepting this Quote an Invoice will be automatically generated. This will then become a legally binding contract.")
  acceptedQuoteMessage     String   @default("")
  declineReasonRequired    Boolean  @default(true)
  declinedQuoteMessage     String   @default("")
  notifyOnAccept           Boolean  @default(true)
  notifyOnViewed           Boolean  @default(false)
  updatedAt                DateTime @updatedAt
}

model InvoiceSettings {
  id                       String   @id @default(cuid())
  prefix                   String   @default("AKEYI-")
  suffix                   String   @default("")
  autoIncrement            Boolean  @default(true)
  nextNumber               String   @default("0128")
  dueDateDays              Int      @default(14)
  defaultTerms             String   @default("Payment is due within 14 days from date of invoice. Late payment is subject to fees of 5% per month.<br /><br /><b>Payment Methods:</b><br />- 60% Advance Payment for Commencement<br />- Remaining 40% Final Settlement")
  defaultFooter            String   @default("Thanks for choosing <a href=\"https://ultrakeyit.com\" target=\"_blank\">Ultrakey IT Solutions Private Limited</a> | <a href=\"mailto:support@ultrakeyit.com\">support@ultrakeyit.com</a>")
  notifyOnInvoicePaid      Boolean  @default(true)
  notifyOnInvoiceViewed    Boolean  @default(false)
  updatedAt                DateTime @updatedAt
}

model PaymentSettings {
  id                  String   @id @default(cuid())
  currencySymbol      String   @default("₹")
  currencyPosition    String   @default("left")     // left | left_space | right | right_space
  thousandSeparator   String   @default(",")
  decimalSeparator    String   @default(".")
  numberOfDecimals    Int      @default(2)
  paymentPageFooter   String   @default("Thanks for choosing <a href=\"https://ultrakeyit.com\">Ultrakey IT Solutions Private Limited</a>")
  bankDetails         String?
  genericPayment      String   @default("Pay Invoice amount via one of the options mentioned in the below<br><br><a href=\"https://pages.razorpay.com/ultrakeyitinvoices\" target=\"_blank\">1. Click here for Online Payment through Razorpay - Debit/Credit Card/UPI etc.</a><br>2. Gpay (or) Phonepe Number: 6300440316")
  updatedAt           DateTime @updatedAt
}

model TaxSettings {
  id                     String   @id @default(cuid())
  pricesEnteredWithTax   String   @default("exclusive")  // inclusive | exclusive
  taxPercentage          Float    @default(18)
  taxName                String   @default("GST (18%)")
  updatedAt              DateTime @updatedAt
}

model EmailSettings {
  id                       String   @id @default(cuid())
  emailAddress             String   @default("support@ultrakeyit.com")
  emailName                String   @default("Ultrakey IT Solutions Private Limited")
  bccOnClientEmails        Boolean  @default(true)
  footerText               String   @default("© 2015–2026 Ultrakey IT Solutions Private Limited. All rights reserved.")

  quoteAvailableSubject    String   @default("New quote %number% available")
  quoteAvailableContent    String   @default("Hi %client_first_name%,\n\nYou have a new quote available ( %number% ) which can be viewed at %link%.")
  quoteAvailableButton     String   @default("View this quote online")

  invoiceAvailableSubject  String   @default("New invoice %number% available")
  invoiceAvailableContent  String   @default("Hi %client_first_name%,\n\nYou have a new invoice available ( %number% ) which can be viewed at %link%.")
  invoiceAvailableButton   String   @default("View this invoice online")

  paymentReceivedSubject   String   @default("Thanks for your payment!")
  paymentReceivedContent   String   @default("Thanks for your payment, %client_first_name%.\n\nYour recent payment for %last_payment% on invoice %number% has been successful.")

  paymentReminderSubject   String   @default("A friendly reminder")
  paymentReminderContent   String   @default("Hi %client_first_name%,\n\nJust a friendly reminder that your invoice %number% for %total% %is_was% due on %due_date%.")
  paymentReminderButton    String   @default("View this invoice online")

  reminder7DaysBefore      Boolean  @default(true)
  reminder1DayBefore       Boolean  @default(true)
  reminderOnDueDate        Boolean  @default(true)
  reminder1DayAfter        Boolean  @default(true)
  reminder7DaysAfter       Boolean  @default(true)
  reminder14DaysAfter      Boolean  @default(true)
  reminder21DaysAfter      Boolean  @default(true)
  reminder30DaysAfter      Boolean  @default(true)

  updatedAt                DateTime @updatedAt
}

model TranslateSettings {
  id                   String   @id @default(cuid())
  quoteLabel           String   @default("Quote")
  quoteLabelPlural     String   @default("Quotes")
  invoiceLabel         String   @default("Invoice")
  invoiceLabelPlural   String   @default("Invoices")
  hrsQtyLabel          String   @default("Hrs/Qty")
  serviceLabel         String   @default("Service")
  ratePriceLabel       String   @default("Rate/Price")
  adjustLabel          String   @default("Adjust")
  subTotalLabel        String   @default("Sub Total")
  discountLabel        String   @default("Discount")
  totalLabel           String   @default("Total")
  totalDueLabel        String   @default("Total Due")
  updatedAt            DateTime @updatedAt
}

// ============================================================
// PREDEFINED LINE ITEMS
// ============================================================

model PredefinedLineItem {
  id          String   @id @default(cuid())
  qty         Int      @default(1)
  title       String
  rate        Float
  description String?
  order       Int      @default(0)
  createdAt   DateTime @default(now())
}

// ============================================================
// CLIENTS
// ============================================================

model Client {
  id             String    @id @default(cuid())
  businessName   String
  firstName      String?
  lastName       String?
  email          String
  phone          String?
  address        String?
  extraInfo      String?
  website        String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  quotes         Quote[]
  invoices       Invoice[]

  @@index([businessName])
  @@index([email])
}

// ============================================================
// QUOTES
// ============================================================

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  DECLINED
  EXPIRED
  CANCELLED
  CONVERTED
}

model Quote {
  id                 String      @id @default(cuid())
  number             String      @unique
  publicToken        String      @unique @default(cuid())
  title              String?
  description        String?
  orderNumber        String?

  clientId           String
  client             Client      @relation(fields: [clientId], references: [id])

  status             QuoteStatus @default(DRAFT)

  validUntil         DateTime
  createdDate        DateTime    @default(now())

  subtotal           Float       @default(0)
  taxPercentage      Float       @default(18)
  taxAmount          Float       @default(0)
  discount           Float       @default(0)
  total              Float       @default(0)

  terms              String?
  footer             String?

  acceptedAt         DateTime?
  declinedAt         DateTime?
  declineReason      String?
  convertedInvoiceId String?     @unique

  lineItems          LineItem[]
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  @@index([clientId])
  @@index([status])
  @@index([createdAt])
}

// ============================================================
// INVOICES
// ============================================================

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  PARTIAL
  OVERDUE
  CANCELLED
}

model Invoice {
  id              String        @id @default(cuid())
  number          String        @unique
  publicToken     String        @unique @default(cuid())
  title           String?
  description     String?
  orderNumber     String?

  clientId        String
  client          Client        @relation(fields: [clientId], references: [id])

  sourceQuoteId   String?       @unique

  status          InvoiceStatus @default(DRAFT)

  dueDate         DateTime
  createdDate     DateTime      @default(now())

  subtotal        Float         @default(0)
  taxPercentage   Float         @default(18)
  taxAmount       Float         @default(0)
  discount        Float         @default(0)
  paid            Float         @default(0)
  totalDue        Float         @default(0)
  total           Float         @default(0)

  terms           String?
  footer          String?

  lineItems       LineItem[]
  payments        Payment[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([clientId])
  @@index([status])
  @@index([dueDate])
}

// ============================================================
// LINE ITEMS (polymorphic — belongs to either Quote or Invoice)
// ============================================================

enum LineItemParent {
  QUOTE
  INVOICE
}

model LineItem {
  id            String          @id @default(cuid())
  parentType    LineItemParent
  quoteId       String?
  quote         Quote?          @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  invoiceId     String?
  invoice       Invoice?        @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  qty           Int             @default(1)
  title         String
  description   String?
  rate          Float           @default(0)
  amount        Float           @default(0)   // qty * rate, stored for query convenience
  taxable       Boolean         @default(true)
  order         Int             @default(0)

  createdAt     DateTime        @default(now())

  @@index([quoteId])
  @@index([invoiceId])
}

// ============================================================
// PAYMENTS (only on invoices)
// ============================================================

enum PaymentMethod {
  GENERIC
  RAZORPAY
  BANK
  UPI
  CASH
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
}

model Payment {
  id           String         @id @default(cuid())
  invoiceId    String
  invoice      Invoice        @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  date         DateTime       @default(now())
  amount       Float
  method       PaymentMethod  @default(GENERIC)
  paymentId    String?        // Razorpay payment ID, external reference, etc.
  status       PaymentStatus  @default(COMPLETED)
  memo         String?
  createdAt    DateTime       @default(now())

  @@index([invoiceId])
}

// ============================================================
// EMAIL LOG
// ============================================================

enum EmailStatus {
  SENT
  FAILED
}

model EmailLog {
  id          String      @id @default(cuid())
  templateKey String
  to          String
  bcc         String?
  subject     String
  status      EmailStatus
  errorMsg    String?
  resendId    String?     // ID from Resend API for tracking
  sentAt      DateTime    @default(now())

  @@index([sentAt])
}

// ============================================================
// AUDIT LOG
// ============================================================

model AuditLog {
  id          String   @id @default(cuid())
  actor       String   // Clerk user email OR "client@public"
  actorIp     String?
  action      String   // e.g., "QUOTE_ACCEPTED_BY_CLIENT", "INVOICE_PAID_MANUAL"
  targetType  String   // "QUOTE" | "INVOICE" | "CLIENT" | "SETTINGS"
  targetId    String?
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([createdAt])
  @@index([targetType, targetId])
}
```

### 2. Create the seed file scaffold

```ts
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default settings...');

  // Singleton settings — upsert by checking existence
  const existing = await prisma.businessSettings.findFirst();
  if (!existing) {
    await prisma.businessSettings.create({ data: {} });
    await prisma.quoteSettings.create({ data: {} });
    await prisma.invoiceSettings.create({ data: {} });
    await prisma.paymentSettings.create({ data: {} });
    await prisma.taxSettings.create({ data: {} });
    await prisma.emailSettings.create({ data: {} });
    await prisma.translateSettings.create({ data: {} });
    console.log('Default settings created.');
  } else {
    console.log('Settings already exist, skipping.');
  }

  // Pre-defined line items
  const existingItems = await prisma.predefinedLineItem.count();
  if (existingItems === 0) {
    await prisma.predefinedLineItem.createMany({
      data: [
        { qty: 1, title: '.com/.in Domain Registration Charges per year', rate: 1600, description: 'Domain Registration Per Year', order: 0 },
        { qty: 1, title: 'Hosting Plan for 1 year', rate: 2500, description: 'Web Hosting Space for 1 year', order: 1 },
        { qty: 1, title: 'SSL Certificate for 1 Year', rate: 1200, description: 'SSL Certificate for 1 Year', order: 2 },
        { qty: 1, title: 'Website Design', rate: 25000, description: 'Custom website design and development', order: 3 },
      ],
    });
    console.log('Pre-defined line items created.');
  }

  // Client/quote/invoice seed data is added in Step 13.
  console.log('Step 1 seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 3. Add seed script to `package.json`

In `package.json`, add:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### 4. Run migration and seed

```bash
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

### 5. Verify with Prisma Studio

```bash
npx prisma studio
```

Open the browser tab it gives you. Confirm:
- All 9 settings tables have exactly 1 row each with the defaults shown above
- `PredefinedLineItem` has 4 rows
- All other tables exist but are empty

## Verification Checklist

- [ ] `npx prisma migrate status` reports up to date
- [ ] `npx prisma studio` shows all tables
- [ ] BusinessSettings, QuoteSettings, InvoiceSettings, PaymentSettings, TaxSettings, EmailSettings, TranslateSettings each have one row
- [ ] PredefinedLineItem has 4 rows
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run dev` still boots without errors

## Commit

```bash
git add -A
git commit -m "step-1: complete Prisma schema for settings, clients, quotes, invoices, payments, audit"
```

## Next

Proceed to `02-AUTH.md`.
