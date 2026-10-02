import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dashboard } from '@/lib/api/types';
import { SetupGuide } from './SetupGuide';

const state = vi.hoisted(() => ({ role: 'OWNER', holders: 0 }));

vi.mock('@/lib/company', () => ({
  useCompany: () => ({ companyId: 'c1', company: { role: state.role } }),
}));
vi.mock('@/lib/api/hooks', () => ({
  useApiQuery: () => ({ data: { totalCount: state.holders } }),
}));

function dashboard(authorizedShares: number, poolSize: number): Dashboard {
  return {
    kpis: { authorizedShares, pool: { size: poolSize, availableQuantity: poolSize } },
  } as Dashboard;
}

describe('setup guide for a company with nothing issued yet', () => {
  afterEach(cleanup);
  beforeEach(() => {
    state.role = 'OWNER';
    state.holders = 0;
  });

  // A step's title and its button can read the same, so steps are addressed by position.
  const STEPS = { class: 0, pool: 1, holder: 2, issue: 3 } as const;
  const step = (key: keyof typeof STEPS) => screen.getAllByRole('listitem')[STEPS[key]] as HTMLElement;

  it('points a brand-new company at creating its first share class', () => {
    render(<SetupGuide data={dashboard(0, 0)} />);
    expect(within(step('class')).getByText('Bước tiếp theo')).toBeInTheDocument();
    expect(within(step('class')).getByRole('link', { name: 'Tạo lớp cổ phần' })).toBeInTheDocument();
  });

  it('marks the share class done and moves on to the stakeholders once the pool is optional', () => {
    render(<SetupGuide data={dashboard(2_000_000, 0)} />);
    expect(within(step('class')).getByText('Xong')).toBeInTheDocument();
    expect(within(step('pool')).queryByText('Bước tiếp theo')).not.toBeInTheDocument();
    expect(within(step('holder')).getByText('Bước tiếp theo')).toBeInTheDocument();
  });

  it('offers the first issue as the next step once there are stakeholders', () => {
    state.holders = 3;
    render(<SetupGuide data={dashboard(2_000_000, 150_000)} />);
    expect(within(step('holder')).getByText('Xong')).toBeInTheDocument();
    expect(within(step('pool')).getByText('Xong')).toBeInTheDocument();
    expect(within(step('issue')).getByText('Bước tiếp theo')).toBeInTheDocument();
  });

  it('only tells a viewer to wait for an owner, with nothing to click', () => {
    state.role = 'VIEWER';
    render(<SetupGuide data={dashboard(0, 0)} />);
    expect(screen.getByText(/cần thiết lập trước/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
