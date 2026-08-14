#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const scanRoot = path.join(root, "client");
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const ignoredDirs = new Set([".expo", "build", "dist", "node_modules"]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function extractCall(text, start) {
  const openIndex = text.indexOf("(", start);
  if (openIndex === -1) return "";

  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    const previous = text[index - 1];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote && previous !== "\\") {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  return text.slice(start);
}

function previousLines(text, index, count = 10) {
  const before = text.slice(0, index).split(/\r?\n/);
  return before.slice(Math.max(0, before.length - count)).join("\n");
}

function looksLikeAppApiFetch(context) {
  return /(?:["'`]\/api\/|new URL\(\s*["'`]\/api\/|\$\{[^}]*baseUrl[^}]*\}\/?api\/|baseUrl\s*\+\s*["'`]\/?api\/)/.test(
    context,
  );
}

function scanFetchCalls(file, text, findings) {
  const relativePath = path.relative(root, file);
  const fetchPattern = /\bfetch\s*\(/g;
  let match;

  while ((match = fetchPattern.exec(text))) {
    const call = extractCall(text, match.index);
    const context = `${previousLines(text, match.index)}\n${call}`;
    if (!looksLikeAppApiFetch(context)) continue;

    const hasCredentials = /credentials\s*:\s*["'`]include["'`]/.test(call);
    if (!hasCredentials) {
      findings.push({
        file: relativePath,
        line: lineNumberForIndex(text, match.index),
        reason: 'direct app API fetch must include credentials: "include"',
      });
    }
  }
}

function main() {
  const findings = [];
  const queryClientText = fs.readFileSync(
    path.join(root, "client/lib/query-client.ts"),
    "utf8",
  );

  for (const required of [
    'credentials: "include"',
    "export async function apiRequest",
    "export const getQueryFn",
  ]) {
    if (!queryClientText.includes(required)) {
      findings.push({
        file: "client/lib/query-client.ts",
        line: 1,
        reason: `shared query client is missing ${required}`,
      });
    }
  }

  for (const file of walk(scanRoot)) {
    const text = fs.readFileSync(file, "utf8");
    scanFetchCalls(file, text, findings);
  }

  if (findings.length) {
    console.error("Client API usage check failed:");
    for (const finding of findings) {
      console.error(`- ${finding.file}:${finding.line}: ${finding.reason}`);
    }
    process.exit(1);
  }

  console.log(
    "Client API usage check passed: app API fetches use credentialed requests or the shared query client.",
  );
}

main();
