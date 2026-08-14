#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      findings.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}

function requireRegex(text, relativePath, checks, findings) {
  for (const [label, pattern] of checks) {
    if (!pattern.test(text)) {
      findings.push(`${relativePath}: missing ${label}`);
    }
  }
}

function assertInOrder(text, labels, findings) {
  let cursor = -1;
  for (const label of labels) {
    const index = text.indexOf(label, cursor + 1);
    if (index === -1) {
      findings.push(`server/index.ts startup order is missing ${label}.`);
      return;
    }
    if (index < cursor) {
      findings.push(`server/index.ts startup order is invalid near ${label}.`);
      return;
    }
    cursor = index;
  }
}

function main() {
  const findings = [];
  let indexText = "";
  let audioRoutesText = "";

  try {
    indexText = read("server/index.ts");
    audioRoutesText = read("server/replit_integrations/audio/routes.ts");
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
  }

  requireIncludes(
    indexText,
    "server/index.ts",
    [
      "function setupSecurityHeaders",
      "setupSecurityHeaders(app)",
      'res.setHeader("X-Content-Type-Options", "nosniff")',
      'res.setHeader("X-Frame-Options", "DENY")',
      'res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")',
      'res.setHeader("X-Permitted-Cross-Domain-Policies", "none")',
      'res.setHeader("Cache-Control", "no-store")',
      'req.path.startsWith("/api")',
      "configuredExternalHosts()",
      'res.header("Vary", "Origin")',
      '"Content-Type, Authorization, X-Requested-With"',
      'res.header("Access-Control-Allow-Credentials", "true")',
      "return res.sendStatus(204)",
      "express.json({",
      'limit: "1mb"',
      'express.urlencoded({ extended: false, limit: "1mb" })',
    ],
    findings,
  );

  requireRegex(
    indexText,
    "server/index.ts",
    [
      [
        "localhost CORS only outside production",
        /const isLocalhost\s*=\s*!isProduction\s*&&[\s\S]{0,180}origin\?\.startsWith\("http:\/\/127\.0\.0\.1:"\)/,
      ],
      [
        "CORS allowlist is origin-gated",
        /if\s*\(\s*origin\s*&&\s*\(origins\.has\(origin\)\s*\|\|\s*isLocalhost\)\s*\)/,
      ],
    ],
    findings,
  );

  assertInOrder(
    indexText,
    [
      "setupCors(app)",
      "setupSecurityHeaders(app)",
      "setupBodyParsing(app)",
      "session({",
      "registerRoutes(app)",
      "setupErrorHandler(app)",
    ],
    findings,
  );

  requireIncludes(
    audioRoutesText,
    "server/replit_integrations/audio/routes.ts",
    ['express.json({ limit: "50mb" })'],
    findings,
  );

  if (findings.length) {
    console.error("HTTP security-control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "HTTP security-control check passed: production CORS, security headers, API cache controls, and request body limits verified.",
  );
}

main();
