export interface RuntimeConfig {
  /** Realm URL, e.g. https://auth.example.vn/realms/eqty */
  oidcAuthority: string;
  /** Public client of the web app (Authorization Code + PKCE). */
  oidcClientId: string;
  /** Empty = same origin as the web app (the deployed setup: /api and /bff behind the same proxy). */
  apiBaseUrl: string;
  /** Address of the operators' monitoring dashboard (https://monitor.<domain>); empty when there is none. */
  monitorUrl: string;
}

// Loaded at runtime from /config.json so one build runs on any domain; deployment writes that file.
let pending: Promise<RuntimeConfig> | undefined;

export function loadConfig(): Promise<RuntimeConfig> {
  pending ??= fetchConfig().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}

async function fetchConfig(): Promise<RuntimeConfig> {
  const response = await fetch('/config.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Không đọc được /config.json (${response.status}).`);
  }
  return parseConfig(await response.json());
}

export function parseConfig(raw: unknown): RuntimeConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('/config.json không hợp lệ.');
  }
  const { oidcAuthority, oidcClientId, apiBaseUrl, monitorUrl } = raw as Record<string, unknown>;
  if (typeof oidcAuthority !== 'string' || oidcAuthority === '') {
    throw new Error('/config.json thiếu oidcAuthority.');
  }
  if (typeof oidcClientId !== 'string' || oidcClientId === '') {
    throw new Error('/config.json thiếu oidcClientId.');
  }
  if (apiBaseUrl !== undefined && typeof apiBaseUrl !== 'string') {
    throw new Error('/config.json: apiBaseUrl phải là chuỗi.');
  }
  return {
    oidcAuthority,
    oidcClientId,
    apiBaseUrl: (apiBaseUrl ?? '').replace(/\/+$/, ''),
    monitorUrl: parseMonitorUrl(monitorUrl),
  };
}

// The link is rendered as an href, so anything but http(s) (a javascript: URL in a tampered file) is refused.
function parseMonitorUrl(value: unknown): string {
  if (value === undefined || value === '') {
    return '';
  }
  if (typeof value !== 'string' || !/^https?:\/\/[^\s/]/i.test(value)) {
    throw new Error('/config.json: monitorUrl phải là địa chỉ http(s).');
  }
  return value.replace(/\/+$/, '');
}
