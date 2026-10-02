import type { Metadata } from 'next';
import { StakeholdersPage } from '@/features/stakeholders/StakeholdersPage';

export const metadata: Metadata = { title: 'Cổ đông' };

export default function Page() {
  return <StakeholdersPage />;
}
