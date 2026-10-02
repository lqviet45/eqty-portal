import type { Metadata } from 'next';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const metadata: Metadata = { title: 'Cài đặt công ty' };

export default function Page() {
  return <SettingsPage />;
}
