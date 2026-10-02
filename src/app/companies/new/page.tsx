import type { Metadata } from 'next';
import { NewCompanyPage } from '@/features/companies/NewCompanyPage';

export const metadata: Metadata = { title: 'Tạo công ty mới' };

export default function Page() {
  return <NewCompanyPage />;
}
