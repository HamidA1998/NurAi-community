#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const wantsJson = process.argv.includes("--json");
const wantsSummaryJson = process.argv.includes("--summary-json");
const wantsWrite = process.argv.includes("--write");
const wantsCheck = process.argv.includes("--check");
const DEFAULT_OUT_PATH = "docs/audit/PRODUCTION_SECRET_CHECKLIST.md";

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const outPath = path.resolve(root, argValue("--out", DEFAULT_OUT_PATH));

const PROCESS_ENV_VALUES = {
  NURAI_DEPLOYMENT_URL: process.env.NURAI_DEPLOYMENT_URL,
  EXPO_PUBLIC_DOMAIN: process.env.EXPO_PUBLIC_DOMAIN,
  AI_INTEGRATIONS_OPENAI_API_KEY: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  NURAI_DEPLOYED_AI_SMOKE_SECRET: process.env.NURAI_DEPLOYED_AI_SMOKE_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  RUNPOD_API_KEY: process.env.RUNPOD_API_KEY,
  RUNPOD_SECRET_nurai: process.env.RUNPOD_SECRET_nurai,
  RUNPOD_TEMPLATE_ID: process.env.RUNPOD_TEMPLATE_ID,
  RUNPOD_VLLM_TEMPLATE_ID: process.env.RUNPOD_VLLM_TEMPLATE_ID,
  NURAI_LOCAL_AI_BASE_URL: process.env.NURAI_LOCAL_AI_BASE_URL,
  NURAI_LOCAL_AI_API_KEY: process.env.NURAI_LOCAL_AI_API_KEY,
  NURAI_LOCAL_TEXT_MODEL: process.env.NURAI_LOCAL_TEXT_MODEL,
  NURAI_LOCAL_AI_MODELS: process.env.NURAI_LOCAL_AI_MODELS,
  NURAI_ALLOW_LOCAL_RELIGIOUS_AI: process.env.NURAI_ALLOW_LOCAL_RELIGIOUS_AI,
  NURAI_ALLOW_LOCAL_SENSITIVE_AI: process.env.NURAI_ALLOW_LOCAL_SENSITIVE_AI,
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
  GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
  REVENUECAT_SECRET_API_KEY: process.env.REVENUECAT_SECRET_API_KEY,
  REVENUECAT_API_KEY: process.env.REVENUECAT_API_KEY,
  EXPO_PUBLIC_REVENUECAT_KEY: process.env.EXPO_PUBLIC_REVENUECAT_KEY,
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  REVENUECAT_WEBHOOK_AUTHORIZATION:
    process.env.REVENUECAT_WEBHOOK_AUTHORIZATION,
  GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH:
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH,
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY:
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  ASC_APP_ID: process.env.ASC_APP_ID,
  ASC_KEY_ID: process.env.ASC_KEY_ID,
  ASC_ISSUER_ID: process.env.ASC_ISSUER_ID,
  ASC_PRIVATE_KEY_PATH: process.env.ASC_PRIVATE_KEY_PATH,
  NURAI_AI_PROVIDER: process.env.NURAI_AI_PROVIDER,
  NURAI_AI_MODE: process.env.NURAI_AI_MODE,
  NURAI_REQUIRE_LOCAL_AI: process.env.NURAI_REQUIRE_LOCAL_AI,
  NURAI_REQUIRE_ANDROID_RELEASE: process.env.NURAI_REQUIRE_ANDROID_RELEASE,
};

const GROUPS = [
  {
    id: "deployed-runtime-url",
    title: "Published Runtime",
    requirement: "Production host can boot and pass deployed AI checks.",
    values: [
      {
        name: "NURAI_DEPLOYMENT_URL",
        destinations: ["release machine"],
        required: true,
        note: "HTTPS URL used by npm run check:ai-release:deployed.",
      },
      {
        name: "EXPO_PUBLIC_DOMAIN",
        destinations: ["client build"],
        required: false,
        note: "Public app domain without protocol for static/client runtime.",
      },
      {
        name: "AI_INTEGRATIONS_OPENAI_API_KEY",
        destinations: ["production host"],
        required: true,
        note: "Required production OpenAI secret source for complex, religious, tafsir, fiqh, and sensitive answers. OPENAI_API_KEY is local/tooling-only for release proof.",
      },
      {
        name: "NURAI_DEPLOYED_AI_SMOKE_SECRET",
        destinations: ["production host", "release machine"],
        required: true,
        note: "Long secret used only by the deployed server-side AI smoke verifier.",
      },
      {
        name: "SESSION_SECRET",
        destinations: ["production host"],
        required: true,
        note: "At least 32 random characters.",
      },
    ],
  },
  {
    id: "production-database-url",
    title: "Production Database",
    requirement:
      "Real Supabase/Postgres database can run migrations and ownership checks.",
    values: [
      {
        name: "DATABASE_URL",
        destinations: ["production host", "release machine"],
        required: true,
        note: "Use the real production password. Resetting it requires updating every deployed runtime.",
      },
    ],
  },
  {
    id: "owned-runpod-endpoint",
    title: "Owned RunPod Endpoint",
    requirement:
      "RunPod/local AI uses an owned endpoint instead of a public pool.",
    values: [
      {
        name: "RUNPOD_API_KEY",
        aliases: ["RUNPOD_SECRET_nurai"],
        destinations: ["release machine only"],
        required: true,
        note: "Rotate the pasted token before production, then use it to create/manage the owned endpoint.",
      },
      {
        name: "RUNPOD_TEMPLATE_ID",
        aliases: ["RUNPOD_VLLM_TEMPLATE_ID"],
        destinations: ["release machine only"],
        required: false,
        note: "Expected current private template: axws2453nd.",
      },
      {
        name: "NURAI_LOCAL_AI_BASE_URL",
        destinations: ["production host", "release machine"],
        required: true,
        note: "Must point to the owned /openai/v1 endpoint, not RunPod public pool.",
      },
      {
        name: "NURAI_LOCAL_AI_API_KEY",
        destinations: ["production host", "release machine"],
        required: true,
        note: "Use the rotated RunPod API key or endpoint secret.",
      },
      {
        name: "NURAI_LOCAL_TEXT_MODEL",
        destinations: ["production host", "release machine"],
        required: true,
        note: "First owned endpoint target is Qwen/Qwen3-8B unless deliberately changed.",
      },
      {
        name: "NURAI_LOCAL_AI_MODELS",
        destinations: ["production host", "release machine"],
        required: true,
        note: "Only enabled entries should point at owned endpoints.",
      },
      {
        name: "NURAI_ALLOW_LOCAL_RELIGIOUS_AI",
        destinations: ["production host"],
        required: true,
        note: "Keep false unless a reviewed local religious-answer policy is approved.",
      },
      {
        name: "NURAI_ALLOW_LOCAL_SENSITIVE_AI",
        destinations: ["production host"],
        required: true,
        note: "Keep false unless a reviewed sensitive-answer policy is approved.",
      },
    ],
  },
  {
    id: "google-places-key",
    title: "Google Places",
    requirement:
      "Places and geocoding live provider checks pass against billing-enabled Google Cloud.",
    values: [
      {
        name: "GOOGLE_PLACES_API_KEY",
        destinations: ["production host", "release machine"],
        required: true,
        note: "Billing and required Maps Platform APIs must be enabled on the owning Google Cloud project.",
      },
      {
        name: "GOOGLE_CLOUD_PROJECT_ID",
        destinations: ["production host", "release machine"],
        required: true,
        note: "Non-secret project ID tying live Places checks to the intended Google Cloud project.",
      },
    ],
  },
  {
    id: "subscriptions",
    title: "RevenueCat Subscriptions",
    requirement:
      "Store purchase UI and server entitlement verification are configured.",
    values: [
      {
        name: "REVENUECAT_SECRET_API_KEY",
        aliases: ["REVENUECAT_API_KEY"],
        destinations: ["production host"],
        required: true,
        note: "Server-side RevenueCat secret.",
      },
      {
        name: "EXPO_PUBLIC_REVENUECAT_KEY",
        aliases: ["EXPO_PUBLIC_REVENUECAT_IOS_KEY"],
        destinations: ["client build"],
        required: true,
        note: "iOS/public client SDK key.",
      },
      {
        name: "REVENUECAT_WEBHOOK_AUTHORIZATION",
        destinations: ["production host", "RevenueCat dashboard"],
        required: false,
        note: "Shared webhook Authorization header for entitlement sync.",
      },
    ],
  },
  {
    id: "eas-android-submit-config",
    title: "Android Release",
    requirement:
      "Google Play submit and Android RevenueCat purchase config are complete.",
    values: [
      {
        name: "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH",
        destinations: ["EAS submit machine"],
        required: true,
        note: "Absolute path to a Google Play service-account JSON outside the repo.",
        filePath: true,
      },
      {
        name: "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
        destinations: ["client build", "EAS env"],
        required: true,
        note: "RevenueCat Android public SDK key after Play Store app config is saved.",
      },
    ],
  },
  {
    id: "eas-ios-submit-config",
    title: "iOS Release",
    requirement: "App Store Connect submit profile has non-interactive auth.",
    values: [
      {
        name: "ASC_APP_ID",
        destinations: ["EAS submit machine"],
        required: true,
        note: "App Store Connect app ID.",
      },
      {
        name: "ASC_KEY_ID",
        destinations: ["EAS submit machine"],
        required: true,
        note: "App Store Connect API key ID.",
      },
      {
        name: "ASC_ISSUER_ID",
        destinations: ["EAS submit machine"],
        required: true,
        note: "App Store Connect issuer ID.",
      },
      {
        name: "ASC_PRIVATE_KEY_PATH",
        destinations: ["EAS submit machine"],
        required: true,
        note: "Absolute path to the .p8 key outside the repo.",
        filePath: true,
      },
    ],
  },
];

function loadEnvLocal() {
  const values = {};
  if (!fs.existsSync(envPath)) return values;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    values[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return values;
}

function present(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return (
    Boolean(trimmed) && !/replace-me|your-|example\.invalid/i.test(trimmed)
  );
}

function truthyFlag(value) {
  return ["1", "true", "yes", "on"].includes(
    String(value || "")
      .trim()
      .toLowerCase(),
  );
}

function resolvedEnvValue(name, fileEnv) {
  return present(PROCESS_ENV_VALUES[name])
    ? PROCESS_ENV_VALUES[name]
    : fileEnv[name];
}

function releaseAIMode(fileEnv) {
  const value = String(
    resolvedEnvValue("NURAI_AI_PROVIDER", fileEnv) ||
      resolvedEnvValue("NURAI_AI_MODE", fileEnv) ||
      "openai",
  )
    .trim()
    .toLowerCase();
  return ["openai", "hybrid", "local"].includes(value) ? value : "openai";
}

function localAIRequired(fileEnv) {
  return (
    releaseAIMode(fileEnv) !== "openai" ||
    truthyFlag(resolvedEnvValue("NURAI_REQUIRE_LOCAL_AI", fileEnv))
  );
}

function androidReleaseRequired(fileEnv) {
  return truthyFlag(resolvedEnvValue("NURAI_REQUIRE_ANDROID_RELEASE", fileEnv));
}

function requiredForScope(group, item, fileEnv) {
  if (group.id === "owned-runpod-endpoint") {
    return localAIRequired(fileEnv) && item.required;
  }
  if (group.id === "eas-android-submit-config") {
    return androidReleaseRequired(fileEnv) && item.required;
  }
  if (
    group.id === "google-places-key" &&
    item.name === "GOOGLE_CLOUD_PROJECT_ID"
  ) {
    return false;
  }
  return item.required;
}

function valueState(group, item, fileEnv) {
  const names = [item.name, ...(item.aliases || [])];
  const matches = names
    .map((name) => {
      const processValue = PROCESS_ENV_VALUES[name];
      const fileValue = fileEnv[name];
      const preferFileEnv = name === "EXPO_PUBLIC_DOMAIN" && present(fileValue);
      const value = preferFileEnv
        ? fileValue
        : present(processValue)
          ? processValue
          : fileValue;
      const source = preferFileEnv
        ? ".env.local"
        : present(processValue)
          ? "process"
          : present(fileValue)
            ? ".env.local"
            : "missing";
      return {
        name,
        ok: present(value),
        source,
        value,
      };
    })
    .filter((entry) => entry.ok);

  const selected = matches[0] || {
    name: item.name,
    ok: false,
    source: "missing",
    value: "",
  };

  const fileDetails =
    item.filePath && selected.ok
      ? {
          filePresent: fs.existsSync(path.resolve(root, selected.value)),
          fileOutsideRepo: !path
            .resolve(root, selected.value)
            .startsWith(`${root}${path.sep}`),
        }
      : undefined;

  const fileOk =
    !item.filePath || !selected.ok
      ? true
      : Boolean(fileDetails.filePresent && fileDetails.fileOutsideRepo);

  return {
    name: item.name,
    aliases: item.aliases || [],
    ok: selected.ok && fileOk,
    configured: selected.ok,
    source: selected.source,
    satisfiedBy: selected.ok ? selected.name : null,
    destinations: item.destinations,
    required: requiredForScope(group, item, fileEnv),
    note: item.note,
    ...(fileDetails ? { file: fileDetails } : {}),
  };
}

function buildReport() {
  const fileEnv = loadEnvLocal();
  const groups = GROUPS.map((group) => {
    const values = group.values.map((item) => valueState(group, item, fileEnv));
    const missing = values.filter((value) => value.required && !value.ok);
    return {
      ...group,
      values,
      ok: missing.length === 0,
      missing: missing.map((value) => value.name),
    };
  });
  const totalRequired = groups.reduce(
    (count, group) =>
      count + group.values.filter((value) => value.required).length,
    0,
  );
  const missingRequired = groups.flatMap((group) =>
    group.values
      .filter((value) => value.required && !value.ok)
      .map((value) => ({ group: group.id, name: value.name })),
  );

  return {
    ok: missingRequired.length === 0,
    scope: "secret-values-only",
    groupCount: groups.length,
    totalRequired,
    configuredRequired: totalRequired - missingRequired.length,
    missingRequiredCount: missingRequired.length,
    missingRequired,
    groups,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# NurAI Production Secret Checklist",
    "",
    `Secret value status: ${
      report.ok ? "required values complete" : "required values incomplete"
    }`,
    `Required values configured: ${report.configuredRequired}/${report.totalRequired}`,
    `Missing required values: ${report.missingRequiredCount}`,
    "",
    "No secret values are printed here. This checklist only reports presence, source, destination, and file-path safety. A complete group means the required values are present; live account/provider checks still run through `npm run check:release-blockers`.",
    "",
  ];

  for (const group of report.groups) {
    lines.push(`## ${group.title}`, "");
    lines.push(`Release area: ${group.id}`);
    lines.push(`Required values: ${group.ok ? "complete" : "incomplete"}`);
    lines.push(`Release check supported: ${group.requirement}`, "");
    lines.push("| Value | State | Source | Destinations | Note |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const value of group.values) {
      const fileNote = value.file
        ? ` File present: ${value.file.filePresent ? "yes" : "no"}; outside repo: ${
            value.file.fileOutsideRepo ? "yes" : "no"
          }.`
        : "";
      const aliasNote = value.aliases.length
        ? ` Aliases: ${value.aliases.join(", ")}.`
        : "";
      lines.push(
        `| \`${value.name}\` | ${value.ok ? "ok" : "missing"} | ${
          value.source
        } | ${value.destinations.join(", ")} | ${value.note}${aliasNote}${fileNote} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Verification", "");
  lines.push("After filling the account-side values, run:");
  lines.push("");
  lines.push("```bash");
  lines.push("npm run export:production-secret-checklist");
  lines.push("npm run check:release-blockers");
  lines.push("npm run check:goal-completion");
  lines.push("```");
  return lines.join("\n");
}

function main() {
  const report = buildReport();
  const markdown = `${renderMarkdown(report)}\n`;
  const summary = {
    ok: report.ok,
    scope: report.scope,
    outPath,
    written: wantsWrite,
    groupCount: report.groupCount,
    totalRequired: report.totalRequired,
    configuredRequired: report.configuredRequired,
    missingRequiredCount: report.missingRequiredCount,
    missingRequired: report.missingRequired,
  };

  if (wantsCheck) {
    const findings = [];
    if (!fs.existsSync(outPath)) {
      findings.push(
        `${path.relative(root, outPath)} is missing; regenerate with npm run export:production-secret-checklist -- --write.`,
      );
    } else {
      const current = fs.readFileSync(outPath, "utf8");
      if (current !== markdown) {
        findings.push(
          `${path.relative(root, outPath)} is stale; regenerate with npm run export:production-secret-checklist -- --write.`,
        );
      }
    }
    const checkSummary = {
      ...summary,
      ok: findings.length === 0,
      checklistComplete: report.ok,
      findings,
    };
    if (wantsSummaryJson || wantsJson) {
      console.log(JSON.stringify(checkSummary, null, 2));
    } else if (findings.length) {
      console.error("Production secret checklist check failed:");
      for (const finding of findings) console.error(`- ${finding}`);
    } else {
      console.log(
        `Production secret checklist check passed: ${path.relative(root, outPath)} is current.`,
      );
    }
    if (findings.length) process.exit(1);
    return;
  }

  if (wantsWrite) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, markdown);
  }

  if (wantsSummaryJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (wantsJson) {
    console.log(
      JSON.stringify({ ...report, outPath, written: wantsWrite }, null, 2),
    );
    return;
  }

  if (wantsWrite) {
    console.log(
      `Production secret checklist written to ${path.relative(root, outPath)}.`,
    );
    return;
  }

  console.log(markdown.trimEnd());
}

main();
