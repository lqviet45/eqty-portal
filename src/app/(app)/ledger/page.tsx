import type { Metadata } from 'next';
import { LedgerPage } from '@/features/ledger/LedgerPage';

export const metadata: Metadata = { title: 'Nhật ký sổ cái' };

export default function Page() {
  return <LedgerPage />;
}
