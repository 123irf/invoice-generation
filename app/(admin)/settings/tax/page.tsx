import { getTaxSettings } from '@/lib/settings';
import { TaxForm } from './tax-form';

export default async function TaxSettingsPage() {
  const s = await getTaxSettings();
  return <TaxForm settings={s} />;
}
