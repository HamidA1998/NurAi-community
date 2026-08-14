const EXPECTED_SUPABASE_PROJECT_REF = "ciujskeftflqdoxvgvwz";
const EXPECTED_DATABASE_NAME = "postgres";
const EXPECTED_RAILWAY_PROJECT_ID = "dbc362f3-1eb9-445a-a233-74ccf3215553";
const EXPECTED_RAILWAY_DATABASE_NAME = "railway";

function isLoopbackHost(hostname) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "127.0.0.1" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

function looksLikeSecretReference(value) {
  return /^{{\s*[A-Za-z_][A-Za-z0-9_]*\s*}}$/.test((value || "").trim());
}

function looksLikePlaceholder(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return true;
  return [
    "changeme",
    "change-me",
    "placeholder",
    "replace-me",
    "replace_with",
    "replace-with",
    "to" + "do",
    "example.com",
    "example.org",
    "example.net",
    "your-",
    "your_",
    "<",
    ">",
  ].some((marker) => normalized.includes(marker));
}

function redactUsername(username) {
  if (!username) return "missing";
  if (username === "postgres") return "postgres";
  if (username.startsWith("postgres.")) return "postgres.[project-ref]";
  return "present";
}

function connectionMode(parsed, expectedProjectRef) {
  const host = parsed.hostname.toLowerCase();
  const username = decodeURIComponent(parsed.username || "");

  if (host === `db.${expectedProjectRef}.supabase.co`) {
    if (parsed.port === "6543") return "supabase-transaction-pooler";
    return "supabase-direct";
  }

  if (
    host.endsWith(".pooler.supabase.com") &&
    username === `postgres.${expectedProjectRef}`
  ) {
    return parsed.port === "6543"
      ? "supabase-shared-pooler-transaction"
      : "supabase-shared-pooler-session";
  }

  return "unknown";
}

function railwayConnectionMode(parsed) {
  const host = parsed.hostname.toLowerCase();
  const railwayProxyDomain = String(process.env.RAILWAY_TCP_PROXY_DOMAIN || "")
    .trim()
    .toLowerCase();

  if (host === "postgres.railway.internal") return "railway-private";
  if (railwayProxyDomain && host === railwayProxyDomain)
    return "railway-tcp-proxy";
  if (host.endsWith(".proxy.rlwy.net")) return "railway-tcp-proxy";
  return "unknown";
}

function railwayProjectMatched(expectedRailwayProjectId) {
  return (
    String(
      process.env.RAILWAY_PROJECT_ID ||
        process.env.NURAI_RAILWAY_PROJECT_ID ||
        "",
    ).trim() === expectedRailwayProjectId
  );
}

function inspectDatabaseUrl(value, options = {}) {
  const source = options.source || "process";
  const expectedProjectRef =
    options.expectedProjectRef || EXPECTED_SUPABASE_PROJECT_REF;
  const expectedRailwayProjectId =
    options.expectedRailwayProjectId || EXPECTED_RAILWAY_PROJECT_ID;
  const rawValue = String(value || "").trim();

  if (!rawValue) return { ok: false, source, state: "missing" };
  if (looksLikeSecretReference(rawValue)) {
    return { ok: false, source, state: "secret-reference" };
  }
  if (looksLikePlaceholder(rawValue)) {
    return { ok: false, source, state: "placeholder" };
  }

  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    return { ok: false, source, state: "invalid-url" };
  }

  const protocolOk =
    parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
  const databaseName = parsed.pathname.replace(/^\//, "");
  const hasDatabaseName = Boolean(databaseName);
  const hasPassword = Boolean(parsed.password);
  const loopback = isLoopbackHost(parsed.hostname);
  const mode = connectionMode(parsed, expectedProjectRef);
  const railwayMode = railwayConnectionMode(parsed);
  const sslMode = parsed.searchParams.get("sslmode");
  const sslDisabled = String(sslMode || "").toLowerCase() === "disable";
  const projectRefMatched = mode !== "unknown";
  const railwayTargetMatched =
    railwayMode !== "unknown" &&
    railwayProjectMatched(expectedRailwayProjectId);
  const expectedDatabaseName = railwayTargetMatched
    ? EXPECTED_RAILWAY_DATABASE_NAME
    : EXPECTED_DATABASE_NAME;
  const databaseNameOk =
    (projectRefMatched && databaseName === EXPECTED_DATABASE_NAME) ||
    (railwayTargetMatched && databaseName === EXPECTED_RAILWAY_DATABASE_NAME);

  const evidence = {
    ok: false,
    source,
    state: "present",
    protocol: parsed.protocol.replace(":", ""),
    host: parsed.hostname ? "present" : "missing",
    port: parsed.port || "default",
    username: redactUsername(decodeURIComponent(parsed.username || "")),
    password: hasPassword ? "present" : "missing",
    databaseName: hasDatabaseName ? databaseName : "missing",
    expectedDatabaseName,
    expectedSupabaseProjectRef: expectedProjectRef,
    expectedRailwayProjectId,
    projectRefMatched,
    railwayTargetMatched,
    connectionMode: mode,
    railwayConnectionMode: railwayMode,
    sslMode: sslMode || "not-specified",
  };

  if (!protocolOk) return { ...evidence, state: "invalid-protocol" };
  if (!hasDatabaseName) return { ...evidence, state: "missing-database-name" };
  if (!databaseNameOk) {
    return { ...evidence, state: "unexpected-database-name" };
  }
  if (!hasPassword) return { ...evidence, state: "missing-password" };
  if (loopback) return { ...evidence, state: "loopback-host" };
  if (!projectRefMatched && !railwayTargetMatched)
    return { ...evidence, state: "unexpected-production-db-target" };
  if (sslDisabled) return { ...evidence, state: "ssl-disabled" };

  return {
    ...evidence,
    ok: true,
    state: "present",
    sslRecommended: sslMode
      ? "configured"
      : "add sslmode=require or verify-full",
  };
}

module.exports = {
  EXPECTED_DATABASE_NAME,
  EXPECTED_RAILWAY_DATABASE_NAME,
  EXPECTED_RAILWAY_PROJECT_ID,
  EXPECTED_SUPABASE_PROJECT_REF,
  inspectDatabaseUrl,
};
