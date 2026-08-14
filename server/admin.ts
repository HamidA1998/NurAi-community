// The community edition has no built-in privileged accounts. Configure any
// operator allowlist through server-only environment variables.
const BUILT_IN_FULL_ACCESS_EMAILS: readonly string[] = [];

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

function configuredEmailSet(
  envName: string,
  builtInEmails: readonly string[] = [],
): Set<string> {
  return new Set(
    [...builtInEmails, ...(process.env[envName] || "").split(",")]
      .map((email: string) => normalizeEmail(email))
      .filter((email): email is string => Boolean(email)),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const normalizedEmail = normalizeEmail(email);
  return Boolean(
    normalizedEmail &&
      configuredEmailSet("NURAI_ADMIN_EMAILS").has(normalizedEmail),
  );
}

export function hasFullAccessEmail(email: string | null | undefined): boolean {
  const normalizedEmail = normalizeEmail(email);
  return Boolean(
    normalizedEmail &&
      (isAdminEmail(normalizedEmail) ||
        configuredEmailSet(
          "NURAI_FULL_ACCESS_EMAILS",
          BUILT_IN_FULL_ACCESS_EMAILS,
        ).has(normalizedEmail)),
  );
}
