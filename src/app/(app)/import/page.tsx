import type { Metadata } from 'next';
import { ImportPage } from '@/features/import/ImportPage';

export const metadata: Metadata = { title: 'Nhập từ Excel' };

export default function Page() {
  return <ImportPage />;
}
