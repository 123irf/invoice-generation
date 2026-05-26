-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LineItemParent" AS ENUM ('QUOTE', 'INVOICE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('GENERIC', 'RAZORPAY', 'BANK', 'UPI', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL,
    "logoUrl" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Ultrakey IT Solutions Private Limited',
    "address" TEXT NOT NULL DEFAULT 'Flat No. 204, 2nd Floor, Cyber Residency,
Inidra Nagar, Gachibowli,
Hyderabad, Telangana, India-500032
support@ultrakeyit.com',
    "extraInfo" TEXT NOT NULL DEFAULT '<b>GST No:</b> 36AADCU5062A1ZO',
    "website" TEXT NOT NULL DEFAULT 'https://ultrakeyit.com',
    "fiscalYearStart" TEXT NOT NULL DEFAULT '04-01',
    "fiscalYearEnd" TEXT NOT NULL DEFAULT '03-31',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteSettings" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'AKEYQ-',
    "suffix" TEXT NOT NULL DEFAULT '',
    "autoIncrement" BOOLEAN NOT NULL DEFAULT true,
    "nextNumber" TEXT NOT NULL DEFAULT '52',
    "validForDays" INTEGER NOT NULL DEFAULT 15,
    "defaultTerms" TEXT NOT NULL DEFAULT 'This is a fixed price quote. If accepted, we require a 60% deposit upfront before work commences.',
    "defaultFooter" TEXT NOT NULL DEFAULT 'Thanks for choosing <a href="https://ultrakeyit.com" target="_blank">Ultrakey IT Solutions Private Limited</a> | <a href="mailto:support@ultrakeyit.com">support@ultrakeyit.com</a>',
    "showAcceptButton" BOOLEAN NOT NULL DEFAULT true,
    "acceptedQuoteAction" TEXT NOT NULL DEFAULT 'convert_and_send',
    "acceptQuoteText" TEXT NOT NULL DEFAULT '**Please Note: After accepting this Quote an Invoice will be automatically generated. This will then become a legally binding contract.',
    "acceptedQuoteMessage" TEXT NOT NULL DEFAULT '',
    "declineReasonRequired" BOOLEAN NOT NULL DEFAULT true,
    "declinedQuoteMessage" TEXT NOT NULL DEFAULT '',
    "notifyOnAccept" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnViewed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSettings" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'AKEYI-',
    "suffix" TEXT NOT NULL DEFAULT '',
    "autoIncrement" BOOLEAN NOT NULL DEFAULT true,
    "nextNumber" TEXT NOT NULL DEFAULT '0128',
    "dueDateDays" INTEGER NOT NULL DEFAULT 14,
    "defaultTerms" TEXT NOT NULL DEFAULT 'Payment is due within 14 days from date of invoice. Late payment is subject to fees of 5% per month.<br /><br /><b>Payment Methods:</b><br />- 60% Advance Payment for Commencement<br />- Remaining 40% Final Settlement',
    "defaultFooter" TEXT NOT NULL DEFAULT 'Thanks for choosing <a href="https://ultrakeyit.com" target="_blank">Ultrakey IT Solutions Private Limited</a> | <a href="mailto:support@ultrakeyit.com">support@ultrakeyit.com</a>',
    "notifyOnInvoicePaid" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnInvoiceViewed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL,
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "currencyPosition" TEXT NOT NULL DEFAULT 'left',
    "thousandSeparator" TEXT NOT NULL DEFAULT ',',
    "decimalSeparator" TEXT NOT NULL DEFAULT '.',
    "numberOfDecimals" INTEGER NOT NULL DEFAULT 2,
    "paymentPageFooter" TEXT NOT NULL DEFAULT 'Thanks for choosing <a href="https://ultrakeyit.com">Ultrakey IT Solutions Private Limited</a>',
    "bankDetails" TEXT,
    "genericPayment" TEXT NOT NULL DEFAULT 'Pay Invoice amount via one of the options mentioned in the below<br><br><a href="https://pages.razorpay.com/ultrakeyitinvoices" target="_blank">1. Click here for Online Payment through Razorpay - Debit/Credit Card/UPI etc.</a><br>2. Gpay (or) Phonepe Number: 6300440316',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxSettings" (
    "id" TEXT NOT NULL,
    "pricesEnteredWithTax" TEXT NOT NULL DEFAULT 'exclusive',
    "taxPercentage" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "taxName" TEXT NOT NULL DEFAULT 'GST (18%)',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL DEFAULT 'support@ultrakeyit.com',
    "emailName" TEXT NOT NULL DEFAULT 'Ultrakey IT Solutions Private Limited',
    "bccOnClientEmails" BOOLEAN NOT NULL DEFAULT true,
    "footerText" TEXT NOT NULL DEFAULT '© 2015–2026 Ultrakey IT Solutions Private Limited. All rights reserved.',
    "quoteAvailableSubject" TEXT NOT NULL DEFAULT 'New quote %number% available',
    "quoteAvailableContent" TEXT NOT NULL DEFAULT 'Hi %client_first_name%,

You have a new quote available ( %number% ) which can be viewed at %link%.',
    "quoteAvailableButton" TEXT NOT NULL DEFAULT 'View this quote online',
    "invoiceAvailableSubject" TEXT NOT NULL DEFAULT 'New invoice %number% available',
    "invoiceAvailableContent" TEXT NOT NULL DEFAULT 'Hi %client_first_name%,

You have a new invoice available ( %number% ) which can be viewed at %link%.',
    "invoiceAvailableButton" TEXT NOT NULL DEFAULT 'View this invoice online',
    "paymentReceivedSubject" TEXT NOT NULL DEFAULT 'Thanks for your payment!',
    "paymentReceivedContent" TEXT NOT NULL DEFAULT 'Thanks for your payment, %client_first_name%.

Your recent payment for %last_payment% on invoice %number% has been successful.',
    "paymentReminderSubject" TEXT NOT NULL DEFAULT 'A friendly reminder',
    "paymentReminderContent" TEXT NOT NULL DEFAULT 'Hi %client_first_name%,

Just a friendly reminder that your invoice %number% for %total% %is_was% due on %due_date%.',
    "paymentReminderButton" TEXT NOT NULL DEFAULT 'View this invoice online',
    "reminder7DaysBefore" BOOLEAN NOT NULL DEFAULT true,
    "reminder1DayBefore" BOOLEAN NOT NULL DEFAULT true,
    "reminderOnDueDate" BOOLEAN NOT NULL DEFAULT true,
    "reminder1DayAfter" BOOLEAN NOT NULL DEFAULT true,
    "reminder7DaysAfter" BOOLEAN NOT NULL DEFAULT true,
    "reminder14DaysAfter" BOOLEAN NOT NULL DEFAULT true,
    "reminder21DaysAfter" BOOLEAN NOT NULL DEFAULT true,
    "reminder30DaysAfter" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslateSettings" (
    "id" TEXT NOT NULL,
    "quoteLabel" TEXT NOT NULL DEFAULT 'Quote',
    "quoteLabelPlural" TEXT NOT NULL DEFAULT 'Quotes',
    "invoiceLabel" TEXT NOT NULL DEFAULT 'Invoice',
    "invoiceLabelPlural" TEXT NOT NULL DEFAULT 'Invoices',
    "hrsQtyLabel" TEXT NOT NULL DEFAULT 'Hrs/Qty',
    "serviceLabel" TEXT NOT NULL DEFAULT 'Service',
    "ratePriceLabel" TEXT NOT NULL DEFAULT 'Rate/Price',
    "adjustLabel" TEXT NOT NULL DEFAULT 'Adjust',
    "subTotalLabel" TEXT NOT NULL DEFAULT 'Sub Total',
    "discountLabel" TEXT NOT NULL DEFAULT 'Discount',
    "totalLabel" TEXT NOT NULL DEFAULT 'Total',
    "totalDueLabel" TEXT NOT NULL DEFAULT 'Total Due',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslateSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredefinedLineItem" (
    "id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredefinedLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "extraInfo" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "orderNumber" TEXT,
    "clientId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPercentage" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "terms" TEXT,
    "footer" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "convertedInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "orderNumber" TEXT,
    "clientId" TEXT NOT NULL,
    "sourceQuoteId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPercentage" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "terms" TEXT,
    "footer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineItem" (
    "id" TEXT NOT NULL,
    "parentType" "LineItemParent" NOT NULL,
    "quoteId" TEXT,
    "invoiceId" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'GENERIC',
    "paymentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "bcc" TEXT,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "errorMsg" TEXT,
    "resendId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actorIp" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_businessName_idx" ON "Client"("businessName");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_publicToken_key" ON "Quote"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_convertedInvoiceId_key" ON "Quote"("convertedInvoiceId");

-- CreateIndex
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_publicToken_key" ON "Invoice"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_sourceQuoteId_key" ON "Invoice"("sourceQuoteId");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "LineItem_quoteId_idx" ON "LineItem"("quoteId");

-- CreateIndex
CREATE INDEX "LineItem_invoiceId_idx" ON "LineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineItem" ADD CONSTRAINT "LineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineItem" ADD CONSTRAINT "LineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
