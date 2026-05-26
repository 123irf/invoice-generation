import { SettingsTabs } from '@/components/admin/settings-tabs';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
      <SettingsTabs />
      <div className="max-w-3xl">{children}</div>
    </div>
  );
}
