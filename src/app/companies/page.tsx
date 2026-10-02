import type { Metadata } from 'next';
import { CompanyPickerPage } from '@/features/companies/CompanyPickerPage';

export const metadata: Metadata = { title: 'Chọn công ty' };

export default function Page() {
  return <CompanyPickerPage />;
}
