import type { Metadata } from 'next';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';

export const metadata: Metadata = { title: 'Ghi nhận giao dịch' };

export default function Page() {
  return <TransactionsPage />;
}
