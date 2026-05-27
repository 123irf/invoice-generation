'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { calculateTotals, lineItemAmount } from '@/lib/totals';
import { formatCurrency } from '@/lib/currency';
import { createQuote, updateQuote } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClientFormDialog } from '@/app/(admin)/clients/client-form-dialog';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';

interface LineItemState {
  qty: number;
  title: string;
  description: string;
  rate: number;
  taxable: boolean;
}

interface ClientOption {
  id: string;
  businessName: string;
  email: string;
}

interface PredefinedItem {
  id: string;
  qty: number;
  title: string;
  description: string | null;
  rate: number;
}

interface TaxSettingsType {
  taxPercentage: number;
  pricesEnteredWithTax: string;
  taxName: string;
}

interface QuoteDefaults {
  defaultTerms: string;
  defaultFooter: string;
  validForDays: number;
}

interface InitialQuote {
  id: string;
  clientId: string;
  title: string | null;
  description: string | null;
  orderNumber: string | null;
  validUntil: string;
  createdDate: string;
  terms: string | null;
  footer: string | null;
  discount: number;
  status: string;
  lineItems: Array<{
    qty: number;
    title: string;
    description: string | null;
    rate: number;
    taxable: boolean;
  }>;
}

interface Props {
  initial?: InitialQuote;
  clients: ClientOption[];
  predefinedItems: PredefinedItem[];
  defaults: QuoteDefaults;
  taxSettings: TaxSettingsType;
}

function defaultValidUntil(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function QuoteForm({ initial, clients, predefinedItems, defaults, taxSettings }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showDescription, setShowDescription] = useState(!!initial?.description);
  const [showTerms, setShowTerms] = useState(true);
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);

  const [state, setState] = useState({
    clientId: initial?.clientId ?? '',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    orderNumber: initial?.orderNumber ?? '',
    validUntil: initial?.validUntil ?? defaultValidUntil(defaults.validForDays),
    createdDate: initial?.createdDate ?? todayStr(),
    terms: initial?.terms ?? defaults.defaultTerms,
    footer: initial?.footer ?? defaults.defaultFooter,
    discount: initial?.discount ?? 0,
    status: initial?.status ?? 'DRAFT',
    lineItems: initial?.lineItems?.map((li) => ({
      qty: li.qty,
      title: li.title,
      description: li.description ?? '',
      rate: li.rate,
      taxable: li.taxable,
    })) ?? [{ qty: 1, title: '', description: '', rate: 0, taxable: true }],
  });

  const totals = useMemo(
    () =>
      calculateTotals({
        lineItems: state.lineItems,
        taxPercentage: taxSettings.taxPercentage,
        pricesEnteredWithTax: taxSettings.pricesEnteredWithTax as 'inclusive' | 'exclusive',
        discount: state.discount,
      }),
    [state.lineItems, state.discount, taxSettings]
  );

  function updateLineItem(index: number, field: keyof LineItemState, value: string | number | boolean) {
    setState((s) => ({
      ...s,
      lineItems: s.lineItems.map((li, i) =>
        i === index ? { ...li, [field]: value } : li
      ),
    }));
  }

  function removeLineItem(index: number) {
    setState((s) => ({
      ...s,
      lineItems: s.lineItems.filter((_, i) => i !== index),
    }));
  }

  function moveLineItem(index: number, direction: 'up' | 'down') {
    setState((s) => {
      const items = [...s.lineItems];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= items.length) return s;
      [items[index], items[target]] = [items[target], items[index]];
      return { ...s, lineItems: items };
    });
  }

  function addRow() {
    setState((s) => ({
      ...s,
      lineItems: [...s.lineItems, { qty: 1, title: '', description: '', rate: 0, taxable: true }],
    }));
  }

  function addPredefined(itemId: string) {
    const item = predefinedItems.find((p) => p.id === itemId);
    if (!item) return;
    setState((s) => ({
      ...s,
      lineItems: [
        ...s.lineItems,
        { qty: item.qty, title: item.title, description: item.description ?? '', rate: item.rate, taxable: true },
      ],
    }));
  }

  function save(asStatus: 'DRAFT' | 'SENT') {
    if (!state.clientId) {
      toast.error('Please select a client');
      return;
    }
    if (state.lineItems.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    startTransition(async () => {
      try {
        const payload = { ...state, status: asStatus };
        if (initial) {
          const r = await updateQuote(initial.id, payload);
          if (r.ok) {
            toast.success('Quote updated');
            router.push(`/invoice-generation/${initial.id}`);
            router.refresh();
          }
        } else {
          await createQuote(payload);
          // createQuote redirects on success
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to save quote';
        toast.error(msg);
      }
    });
  }

  return (
    <div className="flex gap-8">
      {/* Main column */}
      <div className="flex-1 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Quote title..."
            value={state.title}
            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          />
        </div>

        {/* Description (collapsible) */}
        <div>
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            onClick={() => setShowDescription(!showDescription)}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${showDescription ? 'rotate-90' : ''}`} />
            Description
          </button>
          {showDescription && (
            <Textarea
              className="mt-2"
              rows={3}
              placeholder="Additional description..."
              value={state.description}
              onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
            />
          )}
        </div>

        {/* Line Items */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900">Line Items</h3>
          <div className="bg-white rounded-lg border border-slate-200">
            {/* Header */}
            <div className="grid grid-cols-[60px_1fr_120px_120px_40px_60px] gap-2 px-4 py-2 bg-slate-50 border-b text-xs font-medium text-slate-600 rounded-t-lg">
              <div>Qty</div>
              <div>Title</div>
              <div>Rate</div>
              <div>Amount</div>
              <div>Tax</div>
              <div></div>
            </div>

            {/* Rows */}
            {state.lineItems.map((li, idx) => (
              <div key={idx} className="border-b last:border-b-0">
                <div className="grid grid-cols-[60px_1fr_120px_120px_40px_60px] gap-2 px-4 py-3 items-center">
                  <Input
                    type="number"
                    min={0}
                    value={li.qty}
                    onChange={(e) => updateLineItem(idx, 'qty', parseInt(e.target.value) || 0)}
                    className="h-8 text-sm"
                  />
                  <Input
                    value={li.title}
                    onChange={(e) => updateLineItem(idx, 'title', e.target.value)}
                    placeholder="Item title..."
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={li.rate}
                    onChange={(e) => updateLineItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm"
                  />
                  <div className="text-sm font-medium text-slate-700 px-2">
                    {formatCurrency(lineItemAmount(li.qty, li.rate))}
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={li.taxable}
                      onCheckedChange={(checked) => updateLineItem(idx, 'taxable', !!checked)}
                    />
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveLineItem(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLineItem(idx, 'down')}
                      disabled={idx === state.lineItems.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {/* Line item description */}
                <div className="px-4 pb-3">
                  <Input
                    value={li.description}
                    onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                    placeholder="Item description (optional)..."
                    className="h-7 text-xs text-slate-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add buttons */}
          <div className="flex gap-3 items-center">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" />
              Add Another Item
            </Button>
            {predefinedItems.length > 0 && (
              <Select onValueChange={(val: string | null) => { if (val) addPredefined(val); }}>
                <SelectTrigger className="w-[250px] h-8 text-sm">
                  <SelectValue placeholder="Add a pre-defined item..." />
                </SelectTrigger>
                <SelectContent>
                  {predefinedItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title} — {formatCurrency(item.rate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Totals box */}
        <div className="flex justify-end">
          <div className="w-72 bg-white rounded-lg border border-slate-200 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Sub Total</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{taxSettings.taxName}</span>
              <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-slate-600">Discount</span>
              {editingDiscount ? (
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={state.discount}
                  onChange={(e) => setState((s) => ({ ...s, discount: parseFloat(e.target.value) || 0 }))}
                  onBlur={() => setEditingDiscount(false)}
                  autoFocus
                  className="w-28 h-7 text-sm text-right"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDiscount(true)}
                  className="font-medium hover:underline"
                >
                  {formatCurrency(totals.discount)}
                </button>
              )}
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total Due</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        {/* Terms (collapsible) */}
        <div>
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            onClick={() => setShowTerms(!showTerms)}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${showTerms ? 'rotate-90' : ''}`} />
            Terms & Conditions
          </button>
          {showTerms && (
            <Textarea
              className="mt-2"
              rows={4}
              value={state.terms}
              onChange={(e) => setState((s) => ({ ...s, terms: e.target.value }))}
            />
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-72 shrink-0 space-y-4">
        {/* Publish box */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
          <h3 className="font-semibold text-sm text-slate-900">Publish</h3>
          <Button
            className="w-full"
            variant="outline"
            disabled={pending}
            onClick={() => save('DRAFT')}
          >
            {pending ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            className="w-full"
            disabled={pending}
            onClick={() => save('SENT')}
          >
            {pending ? 'Saving...' : initial ? 'Save & Send' : 'Create & Send'}
          </Button>
        </div>

        {/* Quote Details box */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
          <h3 className="font-semibold text-sm text-slate-900">Quote Details</h3>

          {/* Client picker */}
          <div className="space-y-1">
            <Label className="text-xs">Client *</Label>
            <Select
              value={state.clientId}
              onValueChange={(val: string | null) => {
                if (!val) return;
                if (val === '__new__') {
                  setClientDialogOpen(true);
                } else {
                  setState((s) => ({ ...s, clientId: val }));
                }
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.businessName}
                  </SelectItem>
                ))}
                <SelectItem value="__new__">+ New Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Order Number */}
          <div className="space-y-1">
            <Label className="text-xs">Order / PO Number</Label>
            <Input
              value={state.orderNumber}
              onChange={(e) => setState((s) => ({ ...s, orderNumber: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>

          {/* Created Date */}
          <div className="space-y-1">
            <Label className="text-xs">Created Date</Label>
            <Input
              type="date"
              value={state.createdDate}
              onChange={(e) => setState((s) => ({ ...s, createdDate: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>

          {/* Valid Until */}
          <div className="space-y-1">
            <Label className="text-xs">Valid Until</Label>
            <Input
              type="date"
              value={state.validUntil}
              onChange={(e) => setState((s) => ({ ...s, validUntil: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* New Client Dialog */}
      <ClientFormDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
      />
    </div>
  );
}
