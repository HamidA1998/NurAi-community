#!/usr/bin/env node

const { spawnSync } = require("child_process");

const platform = getArg("--platform") || "ios";
const profile = getArg("--profile") || "production";

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function runEas(args) {
  const result = spawnSync("npx", ["eas", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `eas ${args.join(" ")} failed with exit ${result.status}.\n${result.stderr || result.stdout}`,
    );
  }

  return `${result.stdout || ""}\n${result.stderr || ""}`.trim();
}

function parseJsonFromNoisyOutput(output, label) {
  const starts = [];
  for (let index = 0; index < output.length; index += 1) {
    const char = output[index];
    if (char === "{" || char === "[") starts.push(index);
  }

  for (const start of starts) {
    const candidate = extractBalancedJson(output, start);
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // Keep scanning; EAS can print non-JSON warning text before or after JSON.
    }
  }

  throw new Error(`${label} did not contain parseable JSON.`);
}

function extractBalancedJson(text, start) {
  const first = text[start];
  if (first !== "{" && first !== "[") return null;
  const stack = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const open = stack.pop();
      const matches =
        (open === "{" && char === "}") || (open === "[" && char === "]");
      if (!matches) return null;
      if (stack.length === 0) return text.slice(start, index + 1);
    }
  }

  return null;
}

function currentFingerprint() {
  const output = runEas([
    "fingerprint:generate",
    "--platform",
    platform,
    "--build-profile",
    profile,
    "--json",
    "--non-interactive",
  ]);
  const parsed = parseJsonFromNoisyOutput(output, "fingerprint:generate");
  if (!parsed?.hash) {
    throw new Error("Current fingerprint output is missing hash.");
  }
  return parsed.hash;
}

function latestBuild() {
  const output = runEas([
    "build:list",
    "--platform",
    platform,
    "--limit",
    "1",
    "--json",
    "--non-interactive",
  ]);
  const parsed = parseJsonFromNoisyOutput(output, "build:list");
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`No latest ${platform} EAS build was found.`);
  }
  return parsed[0];
}

function summarizeBuild(build) {
  return {
    id: build.id,
    status: build.status,
    appVersion: build.appVersion,
    appBuildVersion: build.appBuildVersion,
    createdAt: build.createdAt,
    completedAt: build.completedAt,
    fingerprint: build.fingerprint?.hash || null,
    message: build.message,
  };
}

function main() {
  const current = currentFingerprint();
  const build = latestBuild();
  const latest = build.fingerprint?.hash;
  const summary = {
    platform,
    profile,
    currentFingerprint: current,
    latestBuild: summarizeBuild(build),
  };

  if (build.status !== "FINISHED") {
    console.error("TestFlight build fingerprint check failed:");
    console.error(`Latest ${platform} build is ${build.status}, not FINISHED.`);
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  if (!latest || latest !== current) {
    console.error("TestFlight build fingerprint check failed:");
    console.error(
      "Latest EAS build does not match the current project fingerprint.",
    );
    console.error(
      "Create and submit a fresh build before relying on TestFlight or App Store review.",
    );
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log(
    `TestFlight build fingerprint check passed: latest ${platform} build ${build.appVersion} (${build.appBuildVersion}) matches ${current}.`,
  );
}

main();
