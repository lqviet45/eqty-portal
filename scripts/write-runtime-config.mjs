// Writes public/config.json from the environment before `next build` (npm "prebuild").
// Vercel gets the values from vercel.json ("build.env"); without EQTY_OIDC_AUTHORITY the committed
// local-development config.json is left alone.
import { writeFileSync } from 'node:fs';

const authority = process.env.EQTY_OIDC_AUTHORITY;
if (!authority) {
  console.log('write-runtime-config: EQTY_OIDC_AUTHORITY not set, keeping public/config.json');
  process.exit(0);
}

const config = {
  oidcAuthority: authority,
  oidcClientId: process.env.EQTY_OIDC_CLIENT_ID || 'eqty-portal',
  // Empty = same origin (a proxy serving both). On Vercel it is the backend's origin: the API allows CORS.
  apiBaseUrl: process.env.EQTY_API_BASE_URL || '',
};
writeFileSync(new URL('../public/config.json', import.meta.url), `${JSON.stringify(config, null, 2)}\n`);
console.log(`write-runtime-config: wrote public/config.json for ${config.oidcAuthority}`);
