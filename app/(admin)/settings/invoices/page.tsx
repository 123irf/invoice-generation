import { getInvoiceSettings } from '@/lib/settings';
import { InvoicesForm } from './invoices-form';

export default async function InvoicesSettingsPage() {
  const s = await getInvoiceSettings();
  return <InvoicesForm settings={s} />;
}
