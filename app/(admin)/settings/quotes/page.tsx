import { getQuoteSettings } from '@/lib/settings';
import { QuotesForm } from './quotes-form';

export default async function QuotesSettingsPage() {
  const s = await getQuoteSettings();
  return <QuotesForm settings={s} />;
}
