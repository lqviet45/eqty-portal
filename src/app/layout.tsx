import type { Metadata, Viewport } from 'next';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'eqty', template: '%s · eqty' },
  description: 'Sổ cái cổ phần & ESOP',
  // Invitation links carry a one-time token in the query string: never leak it through the Referer header.
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
