#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

const scanRoots = [
  "attached_assets",
  "client",
  "server",
  "shared",
  "scripts",
  "deploy",
  "docs",
];
const ignoredDirs = new Set([
  ".expo",
  ".git",
  ".next",
  ".turbo",
  "android",
  "build",
  "coverage",
  "dist",
  "ios",
  "node_modules",
  "server_dist",
  "static-build",
  "web-build",
]);
const ignoredFiles = new Set([
  "package-lock.json",
  path.join("scripts", "check-secret-leaks.js"),
]);
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".env",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const extensionlessTextFiles = new Set([".gitignore", ".replit"]);

const secretPatterns = [
  {
    id: "openai-api-key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/g,
  },
  {
    id: "runpod-api-key",
    pattern: /\brpa_[A-Za-z0-9]{32,}\b/g,
  },
  {
    id: "google-api-key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    id: "github-token",
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g,
  },
  {
    id: "stripe-secret-key",
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{24,}\b/g,
  },
  {
    id: "private-key",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    id: "jwt",
    pattern:
      /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g,
  },
];

const sensitiveAssignmentNames = new Set([
  "AI_INTEGRATIONS_OPENAI_API_KEY",
  "OPENAI_API_KEY",
  "RUNPOD_API_KEY",
  "RUNPOD_SECRET_nurai",
  "NURAI_LOCAL_AI_API_KEY",
  "REVENUECAT_SECRET_API_KEY",
  "REVENUECAT_API_KEY",
  "REVENUECAT_WEBHOOK_AUTHORIZATION",
  "GOOGLE_PLACES_API_KEY",
  "EXPO_APPLE_APP_SPECIFIC_PASSWORD",
  "DATABASE_URL",
  "SESSION_SECRET",
]);

function looksLikeSafeExampleValue(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return true;
  return [
    "...",
    "example",
    "placeholder",
    "replace-me",
    "replace_with",
    "replace-with",
    "your-",
    "your_",
    "changeme",
    "change-me",
    "localhost",
    "user:password@host",
    "endpoint_id",
    "sk-...",
    "{{",
  ].some((marker) => normalized.includes(marker));
}

function sensitiveAssignmentFindings(text, file) {
  const findings = [];
  const assignmentPattern =
    /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*['"]?([^'"\n#]{12,})['"]?\s*(?:#.*)?$/gm;
  let match = assignmentPattern.exec(text);
  while (match) {
    const [, name, rawValue] = match;
    const value = rawValue.trim();
    if (
      sensitiveAssignmentNames.has(name) &&
      !looksLikeSafeExampleValue(value)
    ) {
      findings.push({
        file: relative(file),
        line: lineNumberForIndex(text, match.index),
        pattern: "sensitive-env-assignment",
      });
    }
    match = assignmentPattern.exec(text);
  }
  return findings;
}

function relative(file) {
  return path.relative(root, file);
}

function isIgnoredEnvLocal(file) {
  const name = path.basename(file);
  return /^\.env(?:\..*)?\.local$/.test(name);
}

function shouldScanFile(file) {
  const rel = relative(file);
  const base = path.basename(file);
  if (ignoredFiles.has(rel)) return false;
  if (isIgnoredEnvLocal(file)) return false;
  if (extensionlessTextFiles.has(base)) return true;
  return textExtensions.has(path.extname(file));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function topLevelFiles() {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(root, entry.name))
    .filter(shouldScanFile);
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function main() {
  const files = [
    ...topLevelFiles(),
    ...scanRoots.flatMap((dir) => walk(path.join(root, dir))),
  ].filter((file, index, all) => all.indexOf(file) === index);
  const findings = [];

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    findings.push(...sensitiveAssignmentFindings(text, file));
    for (const secretPattern of secretPatterns) {
      secretPattern.pattern.lastIndex = 0;
      let match = secretPattern.pattern.exec(text);
      while (match) {
        findings.push({
          file: relative(file),
          line: lineNumberForIndex(text, match.index),
          pattern: secretPattern.id,
        });
        match = secretPattern.pattern.exec(text);
      }
    }
  }

  if (findings.length > 0) {
    console.error("Secret leak check failed:");
    for (const finding of findings) {
      console.error(
        `- ${finding.file}:${finding.line} matched ${finding.pattern} (value redacted)`,
      );
    }
    process.exit(1);
  }

  console.log(
    `Secret leak check passed: ${files.length} files scanned; no high-confidence secrets found.`,
  );
}

main();
