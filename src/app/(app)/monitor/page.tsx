import type { Metadata } from 'next';
import { MonitorPage } from '@/features/monitor/MonitorPage';

export const metadata: Metadata = { title: 'Giám sát hệ thống' };

export default function Page() {
  return <MonitorPage />;
}
