#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

const scanRoots = [
  "client",
  "server",
  "shared",
  "scripts",
  "deploy",
  "migrations",
  "app.json",
  "eas.json",
  ".replit",
];
const ignoredDirs = new Set([
  "node_modules",
  "server_dist",
  "dist",
  "build",
  ".expo",
  ".git",
]);
const ignoredFiles = new Set([
  path.join("scripts", "check-incomplete-markers.js"),
  path.join("scripts", "check-library-integrity.js"),
  path.join("scripts", "check-user-facing-claims.js"),
]);
const textExtensions = new Set([
  "",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".mjs",
  ".cjs",
  ".yml",
  ".yaml",
  ".sql",
]);

const bannedPatterns = [
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /\bHACK\b/i,
  /\bXXX\b/i,
  /not implemented/i,
  /coming soon/i,
  /mock data/i,
  /fake (?:citation|data|source|response)/i,
  /dummy (?:data|citation|source|response)/i,
  /lorem ipsum/i,
  /sample data/i,
  /demo mode/i,
  /NURAI2026ADMIN/i,
  new RegExp("admin" + "Access", "i"),
];

function relative(file) {
  return path.relative(root, file);
}

function shouldScanFile(file) {
  const rel = relative(file);
  if (ignoredFiles.has(rel)) return false;
  return textExtensions.has(path.extname(file));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    if (shouldScanFile(dir)) files.push(dir);
    return files;
  }

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

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function main() {
  const files = scanRoots.flatMap((dir) => walk(path.join(root, dir)));
  const findings = [];

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const pattern of bannedPatterns) {
      const match = pattern.exec(text);
      if (match) {
        findings.push({
          file: relative(file),
          line: lineNumberForIndex(text, match.index),
          pattern: pattern.toString(),
          text: match[0],
        });
      }
    }
  }

  if (findings.length > 0) {
    console.error("Incomplete-marker check failed:");
    for (const finding of findings) {
      console.error(
        `- ${finding.file}:${finding.line} matched ${finding.pattern} (${JSON.stringify(finding.text)})`,
      );
    }
    process.exit(1);
  }

  console.log(
    `Incomplete-marker check passed: ${files.length} files scanned across ${scanRoots.join(", ")}.`,
  );
}

main();
