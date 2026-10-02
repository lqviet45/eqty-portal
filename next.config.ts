import type { NextConfig } from 'next';

const isProduction = process.env.NODE_ENV === 'production';

// Dev only: the browser talks to one origin, like in production behind nginx/Caddy (no CORS).
const apiOrigin = process.env.EQTY_API_ORIGIN ?? 'http://localhost:5270';

const config: NextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isProduction
    ? {
        // The web app is static files served next to /api and /bff (README: Triển khai).
        output: 'export' as const,
      }
    : {
        // Custom-method URLs such as ".../grants/{id}:accept" must not get a trailing slash.
        skipTrailingSlashRedirect: true,
        async rewrites() {
          return [
            { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
            { source: '/bff/:path*', destination: `${apiOrigin}/bff/:path*` },
            { source: '/healthz', destination: `${apiOrigin}/healthz` },
          ];
        },
      }),
};

export default config;
