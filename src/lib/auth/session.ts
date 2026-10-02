import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';
import { loadConfig } from '@/lib/config';

// One OIDC Authorization Code + PKCE (S256) client for the whole app. Tokens live in sessionStorage:
// they disappear with the tab and are never sent anywhere but our own API.

let managerPromise: Promise<UserManager> | undefined;

export function getUserManager(): Promise<UserManager> {
  managerPromise ??= createManager().catch((error: unknown) => {
    managerPromise = undefined;
    throw error;
  });
  return managerPromise;
}

async function createManager(): Promise<UserManager> {
  const config = await loadConfig();
  return new UserManager({
    authority: config.oidcAuthority,
    client_id: config.oidcClientId,
    redirect_uri: `${window.location.origin}/auth/callback/`,
    post_logout_redirect_uri: `${window.location.origin}/`,
    response_type: 'code',
    scope: 'openid profile email',
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: true,
    monitorSession: false,
  });
}

export interface LoginOptions {
  /** Where to land after signing in (path + query inside this app). */
  returnTo?: string;
  /** Open the registration form instead of the sign-in form. */
  register?: boolean;
  loginHint?: string;
}

export async function startLogin(options: LoginOptions = {}): Promise<void> {
  const manager = await getUserManager();
  const returnTo = options.returnTo ?? `${window.location.pathname}${window.location.search}`;
  await manager.signinRedirect({
    state: { returnTo },
    login_hint: options.loginHint,
    extraQueryParams: options.register ? { prompt: 'create' } : undefined,
  });
}

export async function startLogout(): Promise<void> {
  const manager = await getUserManager();
  await manager.signoutRedirect();
}

export async function currentUser(): Promise<User | null> {
  const manager = await getUserManager();
  return manager.getUser();
}

let renewing: Promise<User | null> | undefined;

function renew(manager: UserManager): Promise<User | null> {
  renewing ??= manager
    .signinSilent()
    .catch(() => null)
    .finally(() => {
      renewing = undefined;
    });
  return renewing;
}

/** A valid access token, renewed first when it has expired; null when the user must sign in again. */
export async function getAccessToken(): Promise<string | null> {
  const manager = await getUserManager();
  const user = await manager.getUser();
  if (!user) {
    return null;
  }
  if (!user.expired) {
    return user.access_token;
  }
  return (await renew(manager))?.access_token ?? null;
}

/** The API answered 401: renew once; if that fails, send the user to sign in again. */
export async function handleUnauthorized(): Promise<boolean> {
  const manager = await getUserManager();
  const renewed = await renew(manager);
  if (renewed) {
    return true;
  }
  await manager.removeUser();
  await startLogin();
  return false;
}

/** The user's own account page in Keycloak (password, email, sessions). */
export async function accountUrl(): Promise<string> {
  const config = await loadConfig();
  return `${config.oidcAuthority}/account`;
}

let callback: Promise<User> | undefined;

/** Finishes the redirect from Keycloak. Memoized: React strict mode runs the effect twice, a code can be used once. */
export function completeLogin(): Promise<User> {
  callback ??= getUserManager().then((manager) => manager.signinRedirectCallback());
  return callback;
}
