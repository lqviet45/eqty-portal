import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MonitorPage } from './MonitorPage';

const auth = vi.hoisted(() => ({ isPlatformAdmin: true }));
const config = vi.hoisted(() => ({ monitorUrl: 'https://monitor.example.vn' }));

vi.mock('@/lib/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { subject: 's', displayName: 'A', email: null, isPlatformAdmin: auth.isPlatformAdmin } }),
}));
vi.mock('@/lib/company', () => ({
  useCompany: () => ({ companyId: 'c1', company: { role: 'OWNER' } }),
}));
vi.mock('@/lib/config', () => ({ loadConfig: () => Promise.resolve({ monitorUrl: config.monitorUrl }) }));

describe('monitoring screen', () => {
  // Vitest has no globals here, so Testing Library does not unmount between tests by itself.
  afterEach(cleanup);

  beforeEach(() => {
    auth.isPlatformAdmin = true;
    config.monitorUrl = 'https://monitor.example.vn';
  });

  it('opens the dashboard in a new tab for a platform-admin', async () => {
    render(<MonitorPage />);
    const link = await screen.findByRole('link', { name: /Mở trang giám sát/ });
    expect(link).toHaveAttribute('href', 'https://monitor.example.vn');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('shows nothing of the dashboard to anyone else', () => {
    auth.isPlatformAdmin = false;
    render(<MonitorPage />);
    expect(screen.getByText('Bạn không có quyền xem màn này')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Mở trang giám sát/ })).not.toBeInTheDocument();
  });

  it('says so when no address is configured', async () => {
    config.monitorUrl = '';
    render(<MonitorPage />);
    expect(await screen.findByText('Chưa có địa chỉ trang giám sát')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Mở trang giám sát/ })).not.toBeInTheDocument();
  });
});
