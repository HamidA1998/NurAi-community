#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const wantsJson = process.argv.includes("--json");

function parseEnvValue(raw) {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const fileEnv = {};

  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    const value = parseEnvValue(line.slice(equalsIndex + 1));
    fileEnv[key] = value;
    if (!process.env[key]) process.env[key] = value;
  }

  return fileEnv;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isPresent(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function looksLikeSecretReference(value) {
  return /^{{\s*[A-Za-z_][A-Za-z0-9_]*\s*}}$/.test((value || "").trim());
}

function looksLikePlaceholder(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return (
    !normalized ||
    [
      "changeme",
      "change-me",
      "placeholder",
      "replace-me",
      "replace_with",
      "replace-with",
      "example",
      "your-",
      "your_",
    ].some((marker) => normalized.includes(marker))
  );
}

function valueState(name, fileEnv, env) {
  const value = env[name];
  const processHasValue = Object.prototype.hasOwnProperty.call(
    process.env,
    name,
  );
  const fileHasValue = Object.prototype.hasOwnProperty.call(fileEnv, name);
  const source = processHasValue
    ? fileHasValue
      ? ".env.local"
      : "process"
    : "missing";
  if (!isPresent(value)) return { ok: false, source, state: "missing" };
  if (looksLikeSecretReference(value)) {
    return { ok: false, source, state: "secret-reference" };
  }
  if (looksLikePlaceholder(value)) {
    return { ok: false, source, state: "placeholder" };
  }
  return { ok: true, source, state: "present" };
}

function validateServiceAccountJson(filePath) {
  if (!filePath) {
    return { ok: false, skipped: true, reason: "service account file missing" };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return { ok: false, state: "invalid-json" };
  }

  const requiredFields = [
    "type",
    "project_id",
    "private_key_id",
    "private_key",
    "client_email",
    "client_id",
    "token_uri",
  ];
  const missingFields = requiredFields.filter(
    (field) => !isPresent(parsed[field]),
  );
  const serviceAccountEmail =
    typeof parsed.client_email === "string" &&
    parsed.client_email.endsWith(".iam.gserviceaccount.com");
  const privateKeyLooksValid =
    typeof parsed.private_key === "string" &&
    parsed.private_key.includes("BEGIN PRIVATE KEY") &&
    parsed.private_key.includes("END PRIVATE KEY");
  const tokenUriLooksGoogle =
    typeof parsed.token_uri === "string" &&
    /^https:\/\/oauth2\.googleapis\.com\/token\/?$/.test(parsed.token_uri);

  return {
    ok:
      missingFields.length === 0 &&
      parsed.type === "service_account" &&
      serviceAccountEmail &&
      privateKeyLooksValid &&
      tokenUriLooksGoogle,
    state: missingFields.length ? "missing-fields" : "present",
    missingFields,
    type: parsed.type === "service_account" ? "service_account" : "invalid",
    clientEmail: serviceAccountEmail ? "service-account-email" : "invalid",
    privateKey: privateKeyLooksValid ? "present" : "invalid",
    tokenUri: tokenUriLooksGoogle ? "google-oauth-token-uri" : "invalid",
  };
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function redactGoogleError(value) {
  return String(value || "unknown")
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "ya29.[REDACTED]")
    .replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      "[REDACTED_PRIVATE_KEY]",
    )
    .slice(0, 500);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { response, text, data };
}

async function getGoogleAccessToken(serviceAccountJson) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccountJson.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: serviceAccountJson.token_uri,
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(claim),
  )}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(serviceAccountJson.private_key);
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const { response, text, data } = await fetchJson(
    serviceAccountJson.token_uri,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!response.ok || !data?.access_token) {
    return {
      ok: false,
      httpStatus: response.status,
      state: "token-request-failed",
      error: redactGoogleError(data?.error_description || data?.error || text),
    };
  }

  return {
    ok: true,
    accessToken: data.access_token,
    tokenType: data.token_type || "Bearer",
    expiresIn: data.expires_in || null,
  };
}

async function playPublisherAccessEvidence(serviceAccount, androidPackage) {
  if (!serviceAccount.ok) {
    return {
      ok: false,
      skipped: true,
      reason:
        "Valid Google Play service account JSON is required before API permission can be verified.",
    };
  }
  if (!androidPackage) {
    return {
      ok: false,
      skipped: true,
      reason:
        "Android package name is required before Google Play API access can be verified.",
    };
  }

  let serviceAccountJson;
  try {
    serviceAccountJson = JSON.parse(
      fs.readFileSync(serviceAccount._resolvedPath, "utf8"),
    );
  } catch {
    return { ok: false, state: "service-account-json-unreadable" };
  }

  try {
    const token = await getGoogleAccessToken(serviceAccountJson);
    if (!token.ok) return { ok: false, stage: "oauth-token", token };

    const encodedPackage = encodeURIComponent(androidPackage);
    const insertUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodedPackage}/edits`;
    const insert = await fetchJson(insertUrl, {
      method: "POST",
      headers: {
        Authorization: `${token.tokenType} ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    if (!insert.response.ok || !insert.data?.id) {
      return {
        ok: false,
        stage: "edits.insert",
        httpStatus: insert.response.status,
        packageAccess: false,
        error: redactGoogleError(
          insert.data?.error?.message ||
            insert.text ||
            insert.response.statusText,
        ),
      };
    }

    const editId = insert.data.id;
    const deleteUrl = `${insertUrl}/${encodeURIComponent(editId)}`;
    const deleteEdit = await fetchJson(deleteUrl, {
      method: "DELETE",
      headers: { Authorization: `${token.tokenType} ${token.accessToken}` },
    });

    return {
      ok: deleteEdit.response.ok,
      stage: deleteEdit.response.ok
        ? "verified-and-cleaned-up"
        : "cleanup-failed",
      packageAccess: true,
      editCreated: true,
      editDeleted: deleteEdit.response.ok,
      deleteHttpStatus: deleteEdit.response.status,
      serviceAccountEmail: "service-account-email",
    };
  } catch (error) {
    return {
      ok: false,
      stage: "request-failed",
      error: redactGoogleError(
        error instanceof Error ? error.message : String(error),
      ),
    };
  }
}

function serviceAccountEvidence(eas, fileEnv, env) {
  const androidSubmit = eas?.submit?.production?.android || {};
  const configuredPath = String(
    androidSubmit.serviceAccountKeyPath ||
      env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH ||
      "",
  ).trim();
  const source = isPresent(String(androidSubmit.serviceAccountKeyPath || ""))
    ? "eas.json"
    : valueState("GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH", fileEnv, env).ok
      ? valueState("GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH", fileEnv, env).source
      : "missing";
  const resolvedPath = configuredPath ? path.resolve(root, configuredPath) : "";
  const relativePath = resolvedPath ? path.relative(root, resolvedPath) : "";
  const filePresent = Boolean(resolvedPath) && fs.existsSync(resolvedPath);
  const outsideRepo =
    Boolean(resolvedPath) &&
    (relativePath.startsWith("..") || path.isAbsolute(relativePath));
  const json = validateServiceAccountJson(filePresent ? resolvedPath : null);

  const evidence = {
    ok: Boolean(configuredPath) && filePresent && outsideRepo && json.ok,
    source,
    configured: Boolean(configuredPath),
    filePresent,
    fileOutsideRepo: outsideRepo,
    json,
  };
  Object.defineProperty(evidence, "_resolvedPath", {
    value: resolvedPath,
    enumerable: false,
  });
  return evidence;
}

function androidRevenueCatOfferingsEvidence(enabled) {
  if (!enabled) {
    return {
      ok: false,
      skipped: true,
      reason:
        "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY must be configured before Android offerings can be verified.",
    };
  }

  const result = spawnSync(
    process.execPath,
    ["scripts/check-revenuecat-offerings.js", "--android", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      env: process.env,
      timeout: 30_000,
    },
  );

  let report = null;
  const stdout = result.stdout.trim();
  if (stdout) {
    try {
      report = JSON.parse(stdout);
    } catch {
      report = null;
    }
  }

  return {
    ok: result.status === 0 && report?.ok === true,
    exitCode: result.status,
    signal: result.signal,
    currentOfferingId: report?.currentOfferingId || null,
    offeringCount: report?.offeringCount,
    missingPackages: report?.missingPackages,
    stderr: result.stderr.trim() ? "present" : "empty",
  };
}

async function main() {
  const fileEnv = loadEnvLocal();
  const env = { ...fileEnv, ...process.env };
  const eas = readJson(path.join(root, "eas.json"));
  const app = readJson(path.join(root, "app.json"));
  const androidSubmit = eas?.submit?.production?.android || {};
  const androidPackage = app?.expo?.android?.package;
  const serviceAccount = serviceAccountEvidence(eas, fileEnv, env);
  const revenueCatKey = valueState(
    "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
    fileEnv,
    env,
  );
  const revenueCatKeyValue = String(
    env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "",
  ).trim();
  const revenueCatAndroidKeyConfigured =
    revenueCatKey.ok && /^goog_/i.test(revenueCatKeyValue);
  const androidOfferings = androidRevenueCatOfferingsEvidence(
    revenueCatAndroidKeyConfigured,
  );
  const playPublisherAccess = await playPublisherAccessEvidence(
    serviceAccount,
    androidPackage,
  );
  const track = androidSubmit.track || "missing";
  const releaseStatus = androidSubmit.releaseStatus || "missing";
  const trackOk = track === "production";
  const releaseStatusOk = releaseStatus === "draft";
  const packageOk = androidPackage === "uk.co.eliteautomations.nurai";

  const missing = [
    ...(!serviceAccount.configured ? ["serviceAccountKeyPath"] : []),
    ...(serviceAccount.configured && !serviceAccount.filePresent
      ? ["serviceAccountKeyFile"]
      : []),
    ...(serviceAccount.filePresent && !serviceAccount.fileOutsideRepo
      ? ["serviceAccountKeyFileOutsideRepo"]
      : []),
    ...(serviceAccount.filePresent && !serviceAccount.json.ok
      ? ["validGoogleServiceAccountJson"]
      : []),
    ...(serviceAccount.ok && !playPublisherAccess.ok
      ? ["googlePlayPublisherAccess"]
      : []),
    ...(!revenueCatAndroidKeyConfigured
      ? ["EXPO_PUBLIC_REVENUECAT_ANDROID_KEY"]
      : []),
    ...(revenueCatAndroidKeyConfigured && !androidOfferings.ok
      ? ["androidRevenueCatOffering"]
      : []),
    ...(!trackOk ? ["androidSubmitTrackProduction"] : []),
    ...(!releaseStatusOk ? ["androidSubmitReleaseStatusDraft"] : []),
    ...(!packageOk ? ["androidPackage"] : []),
  ];

  const report = {
    ok: missing.length === 0,
    missing,
    easJsonPresent: Boolean(eas),
    androidPackage,
    androidPackageOk: packageOk,
    serviceAccount,
    playPublisherAccess,
    revenueCatAndroidKey: {
      ok: revenueCatAndroidKeyConfigured,
      source: revenueCatKey.source,
      state: revenueCatKey.ok
        ? revenueCatAndroidKeyConfigured
          ? "present-google-public-key"
          : "invalid-prefix"
        : revenueCatKey.state,
    },
    androidOfferings,
    track,
    releaseStatus,
  };

  if (wantsJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    console.log(
      "Android release credential check passed: Google Play service account JSON and RevenueCat Android key are configured.",
    );
  } else {
    console.error("Android release credential check failed:");
    for (const item of missing) console.error(`- ${item}`);
  }

  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
