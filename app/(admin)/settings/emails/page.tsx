import { getEmailSettings } from '@/lib/settings';
import { EmailsForm } from './emails-form';

export default async function EmailsSettingsPage() {
  const s = await getEmailSettings();
  return <EmailsForm settings={s} />;
}
