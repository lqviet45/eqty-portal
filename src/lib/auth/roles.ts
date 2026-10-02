/** Realm role of the people who run the platform (Keycloak, created by deploy/scripts/keycloak-sync.sh). */
export const PLATFORM_ADMIN_ROLE = 'platform-admin';

/**
 * True when the ID token's `roles` claim carries platform-admin. Only the menu depends on it: the monitoring
 * dashboard checks the same role itself, so a forged claim in the browser opens nothing.
 */
export function isPlatformAdmin(profile: Record<string, unknown>): boolean {
  const roles = profile.roles;
  return Array.isArray(roles) && roles.includes(PLATFORM_ADMIN_ROLE);
}
