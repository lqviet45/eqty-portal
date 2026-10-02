import type { Metadata } from 'next';
import { InvitePage } from '@/features/invite/InvitePage';

export const metadata: Metadata = { title: 'Nhận lời mời' };

export default function Page() {
  return <InvitePage />;
}
