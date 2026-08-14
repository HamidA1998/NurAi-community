#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const timeoutMs = Number(process.env.GOOGLE_PLACES_CHECK_TIMEOUT_MS || 15000);
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
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    if (process.env[key]) continue;
    process.env[key] = parseEnvValue(line.slice(equalsIndex + 1));
  }
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

function publicValueState(value) {
  const raw = String(value || "").trim();
  if (!raw) return { ok: false, state: "missing" };
  if (looksLikeSecretReference(raw)) {
    return { ok: false, state: "secret-reference" };
  }
  if (looksLikePlaceholder(raw)) return { ok: false, state: "placeholder" };
  return { ok: true, state: "present" };
}

function redact(value, key) {
  const text = String(value || "");
  return key ? text.replaceAll(key, "[redacted-key]") : text;
}

async function fetchJson(url, key, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    return {
      response,
      data: null,
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
  if (typeof data?.error_message === "string") {
    data.error_message = redact(data.error_message, key);
  }
  return { response, data, parseError: null };
}

function summarizeProviderResponse(name, response, data, parseError) {
  const resultCount = Array.isArray(data?.results) ? data.results.length : 0;
  const providerStatus =
    typeof data?.status === "string" ? data.status : "missing";
  const ok = response.ok && providerStatus === "OK" && resultCount > 0;

  return {
    name,
    ok,
    httpStatus: response.status,
    providerStatus,
    resultCount,
    errorMessage:
      typeof data?.error_message === "string" && data.error_message.trim()
        ? "present"
        : null,
    failureReason:
      parseError ||
      (typeof data?.error_message === "string" && data.error_message.trim()
        ? data.error_message
        : ok
          ? undefined
          : `Expected provider status OK with at least one result; got ${providerStatus} with ${resultCount} result(s).`),
  };
}

function summarizePlacesNewResponse(name, response, data, parseError) {
  const resultCount = Array.isArray(data?.places) ? data.places.length : 0;
  const providerStatus = response.ok ? "OK" : `HTTP_${response.status}`;
  const ok = response.ok && resultCount > 0;
  const providerError =
    data?.error && typeof data.error === "object" ? data.error : null;

  return {
    name,
    ok,
    httpStatus: response.status,
    providerStatus,
    resultCount,
    errorMessage: providerError?.message ? "present" : null,
    failureReason:
      parseError ||
      (providerError?.message
        ? redact(providerError.message, process.env.GOOGLE_PLACES_API_KEY)
        : ok
          ? undefined
          : `Expected Places API (New) to return at least one place; got ${resultCount} result(s).`),
  };
}

async function checkGeocode(key) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", "London Central Mosque");
  url.searchParams.set("key", key);
  const { response, data, parseError } = await fetchJson(url, key);
  return summarizeProviderResponse("geocode", response, data, parseError);
}

async function checkNearbyMosque(key) {
  const { response, data, parseError } = await fetchJson(
    "https://places.googleapis.com/v1/places:searchNearby",
    key,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.types",
      },
      body: JSON.stringify({
        includedTypes: ["mosque"],
        maxResultCount: 5,
        locationRestriction: {
          circle: {
            center: {
              latitude: 51.5292,
              longitude: -0.1674,
            },
            radius: 5000,
          },
        },
      }),
    },
  );
  return summarizePlacesNewResponse(
    "nearby-mosque-new",
    response,
    data,
    parseError,
  );
}

async function main() {
  loadEnvLocal();

  const key = String(process.env.GOOGLE_PLACES_API_KEY || "").trim();
  const keyState = publicValueState(key).state;
  const projectId = publicValueState(process.env.GOOGLE_CLOUD_PROJECT_ID);

  if (keyState !== "present") {
    const report = {
      ok: false,
      key: { ok: false, state: keyState },
      project: projectId,
      checks: [],
    };
    if (wantsJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.error(`Google Places live check failed: key is ${keyState}.`);
    }
    process.exit(1);
  }

  const checks = await Promise.all([checkGeocode(key), checkNearbyMosque(key)]);
  const report = {
    ok: projectId.ok && checks.every((check) => check.ok),
    key: { ok: true, state: "present" },
    project: {
      ...projectId,
      id: projectId.ok ? "present" : "missing",
      note: "GOOGLE_CLOUD_PROJECT_ID is non-secret evidence tying this live key to the intended Google Cloud project; billing/API ownership still needs account-side proof in the release evidence intake.",
    },
    providerApis: ["Geocoding API", "Places API (New) Nearby Search"],
    checks,
  };

  if (wantsJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    console.log(
      "Google Places live check passed: Geocoding and Places API (New) nearby mosque search both returned real provider results.",
    );
  } else {
    console.error("Google Places live check failed:");
    if (!projectId.ok) {
      console.error(
        `- google-cloud-project: GOOGLE_CLOUD_PROJECT_ID is ${projectId.state}.`,
      );
    }
    for (const check of checks.filter((item) => !item.ok)) {
      console.error(
        `- ${check.name}: ${check.providerStatus}; ${check.failureReason}`,
      );
    }
  }

  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (wantsJson) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          key: { ok: true, state: "present" },
          project: publicValueState(process.env.GOOGLE_CLOUD_PROJECT_ID),
          checks: [],
          error: message,
        },
        null,
        2,
      ),
    );
  } else {
    console.error(`Google Places live check failed: ${message}`);
  }
  process.exit(1);
});
