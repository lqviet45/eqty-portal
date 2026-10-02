import type { Metadata } from 'next';
import { CapTablePage } from '@/features/cap-table/CapTablePage';

export const metadata: Metadata = { title: 'Cap table' };

export default function Page() {
  return <CapTablePage />;
}
