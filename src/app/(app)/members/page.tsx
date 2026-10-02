import type { Metadata } from 'next';
import { MembersPage } from '@/features/members/MembersPage';

export const metadata: Metadata = { title: 'Thành viên' };

export default function Page() {
  return <MembersPage />;
}
