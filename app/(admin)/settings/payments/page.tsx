import { getPaymentSettings } from '@/lib/settings';
import { PaymentsForm } from './payments-form';

export default async function PaymentsSettingsPage() {
  const s = await getPaymentSettings();
  return <PaymentsForm settings={s} />;
}
