export interface TotalsInput {
  lineItems: Array<{
    qty: number;
    rate: number;
    taxable: boolean;
  }>;
  taxPercentage: number;
  pricesEnteredWithTax: 'inclusive' | 'exclusive';
  discount: number;
}

export interface TotalsResult {
  subtotal: number;
  taxableBase: number;
  taxAmount: number;
  discount: number;
  total: number;
}

export function calculateTotals(input: TotalsInput): TotalsResult {
  const lineAmounts = input.lineItems.map((li) => ({
    amount: li.qty * li.rate,
    taxable: li.taxable,
  }));
  const taxableSum = lineAmounts.filter((x) => x.taxable).reduce((s, x) => s + x.amount, 0);
  const nonTaxableSum = lineAmounts.filter((x) => !x.taxable).reduce((s, x) => s + x.amount, 0);

  const taxPct = input.taxPercentage / 100;
  let subtotal = 0;
  let taxAmount = 0;
  let total = 0;
  const discount = input.discount;

  if (input.taxPercentage === 0 || taxPct <= 0) {
    subtotal = taxableSum + nonTaxableSum;
    taxAmount = 0;
    total = subtotal - discount;
  } else if (input.pricesEnteredWithTax === 'exclusive') {
    subtotal = taxableSum + nonTaxableSum;
    taxAmount = taxableSum * taxPct;
    total = subtotal + taxAmount - discount;
  } else {
    const taxablePreTax = taxableSum / (1 + taxPct);
    taxAmount = taxableSum - taxablePreTax;
    subtotal = taxablePreTax + nonTaxableSum;
    total = taxableSum + nonTaxableSum - discount;
  }

  return {
    subtotal: round(subtotal),
    taxableBase: round(taxableSum),
    taxAmount: round(taxAmount),
    discount: round(discount),
    total: round(total),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function lineItemAmount(qty: number, rate: number): number {
  return round(qty * rate);
}
