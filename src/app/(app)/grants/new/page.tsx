import type { Metadata } from 'next';
import { NewGrantPage } from '@/features/grants/NewGrantPage';

export const metadata: Metadata = { title: 'Cấp grant mới' };

export default function Page() {
  return <NewGrantPage />;
}
