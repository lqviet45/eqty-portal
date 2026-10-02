/**
 * Where to send a visitor whose request was answered with the home page by a proxy that falls back to
 * `/index.html` for any path that is not a file (`try_files $uri /index.html`). The exported page for
 * `/dashboard/` is the file `/dashboard/index.html`, so asking for that file directly works on such a proxy.
 * Returns null when the request already is the home page or a file.
 *
 * Self-contained on purpose: it is also inlined as a script in the home page, which runs before React hydrates
 * (Next would otherwise rewrite the address bar to `/` and the original path would be lost).
 */
export function entryFallbackTarget(location: { pathname: string; search: string; hash: string }): string | null {
  const { pathname, search, hash } = location;
  if (pathname === '/' || /\.[a-z0-9]+$/i.test(pathname)) {
    return null;
  }
  return `${pathname.endsWith('/') ? pathname : `${pathname}/`}index.html${search}${hash}`;
}

/** The inline script for the home page: redirects once, before hydration. */
export const ENTRY_FALLBACK_SCRIPT = `(${function redirectToEntry() {
  const { pathname, search, hash } = window.location;
  if (pathname === '/' || /\.[a-z0-9]+$/i.test(pathname)) {
    return;
  }
  window.location.replace(`${pathname.endsWith('/') ? pathname : `${pathname}/`}index.html${search}${hash}`);
}.toString()})()`;
