import type { Metadata } from 'next';
import { EquityPage } from '@/features/equity/EquityPage';

export const metadata: Metadata = { title: 'Quỹ ESOP & lớp cổ phần' };

export default function Page() {
  return <EquityPage />;
}
