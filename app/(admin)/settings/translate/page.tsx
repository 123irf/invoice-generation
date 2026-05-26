import { getTranslateSettings } from '@/lib/settings';
import { TranslateForm } from './translate-form';

export default async function TranslateSettingsPage() {
  const s = await getTranslateSettings();
  return <TranslateForm settings={s} />;
}
