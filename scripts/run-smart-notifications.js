#!/usr/bin/env node

const DEFAULT_KIND = "daily_deen";

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function boolArg(name) {
  return process.argv.includes(name);
}

async function main() {
  const baseUrl = (
    process.env.NURAI_DEPLOYMENT_URL ||
    process.env.EXPO_PUBLIC_DOMAIN ||
    ""
  )
    .replace(/^$/, "")
    .replace(/\/+$/, "");
  const secret = process.env.NURAI_SMART_NOTIFICATION_SECRET;

  if (!baseUrl) {
    throw new Error("NURAI_DEPLOYMENT_URL is required.");
  }
  if (!secret) {
    throw new Error("NURAI_SMART_NOTIFICATION_SECRET is required.");
  }

  const url = baseUrl.startsWith("http")
    ? `${baseUrl}/api/notifications/smart/run-daily`
    : `https://${baseUrl}/api/notifications/smart/run-daily`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      kind: argValue("--kind", DEFAULT_KIND),
      limit: Number(argValue("--limit", "50")),
      dryRun: boolArg("--dry-run"),
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Smart notification run failed (${response.status}): ${JSON.stringify(
        body,
      )}`,
    );
  }
  console.log(JSON.stringify(body));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
