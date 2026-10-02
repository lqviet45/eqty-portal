import type { Metadata } from 'next';
import { PortfolioPage } from '@/features/portfolio/PortfolioPage';

export const metadata: Metadata = { title: 'Danh mục' };

export default function Page() {
  return <PortfolioPage />;
}
