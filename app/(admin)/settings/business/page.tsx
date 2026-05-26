import { getBusinessSettings } from '@/lib/settings';
import { BusinessForm } from './business-form';

export default async function BusinessSettingsPage() {
  const s = await getBusinessSettings();
  return <BusinessForm settings={s} />;
}
