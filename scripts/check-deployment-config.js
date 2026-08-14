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

function readOptional(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function requireIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      findings.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}

function rejectIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (text.includes(snippet)) {
      findings.push(
        `${relativePath}: must not include ${JSON.stringify(snippet)}`,
      );
    }
  }
}

function main() {
  const findings = [];
  let replitText = "";
  let renderText = "";
  let railwayJson = {};
  let packageJson = {};
  let buildText = "";
  let serverText = "";
  let envTemplate = "";

  try {
    replitText = readOptional(".replit");
    renderText = read("render.yaml");
    railwayJson = readJson("railway.json");
    packageJson = readJson("package.json");
    buildText = read("scripts/build.js");
    serverText = read("server/index.ts");
    envTemplate = read(".env.production.example");
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
  }

  if (replitText) {
    rejectIncludes(
      replitText,
      ".replit",
      [
        "DATABASE_URL",
        "SESSION_SECRET",
        "OPENAI_API_KEY",
        "AI_INTEGRATIONS_OPENAI_API_KEY",
        "NURAI_LOCAL_AI_API_KEY",
        "REVENUECAT_SECRET_API_KEY",
        "GOOGLE_PLACES_API_KEY",
        "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH",
      ],
      findings,
    );
  }

  const scripts = packageJson.scripts || {};
  const expectedScripts = {
    "expo:static:build": "node scripts/build.js",
    "server:build":
      "esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outdir=server_dist",
    "server:prod": "NODE_ENV=production node server_dist/index.js",
  };
  for (const [name, expected] of Object.entries(expectedScripts)) {
    if (scripts[name] !== expected) {
      findings.push(
        `package.json: script ${name} must be ${JSON.stringify(expected)}`,
      );
    }
  }

  requireIncludes(
    renderText,
    "render.yaml",
    [
      "type: web",
      "name: nurai-muslim",
      "runtime: node",
      "plan: free",
      "buildCommand: npm ci && npm run expo:static:build && npm run server:build",
      "startCommand: npm run server:prod",
      "healthCheckPath: /",
      "NURAI_DEPLOYMENT_URL",
      "DATABASE_URL",
      "SESSION_SECRET",
      "AI_INTEGRATIONS_OPENAI_API_KEY",
      "NURAI_DEPLOYED_AI_SMOKE_SECRET",
      "NURAI_LOCAL_AI_BASE_URL",
      "NURAI_LOCAL_AI_API_KEY",
      "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
      "GOOGLE_PLACES_API_KEY",
      "GOOGLE_CLOUD_PROJECT_ID",
      "sync: false",
    ],
    findings,
  );

  if (railwayJson?.build?.builder !== "NIXPACKS") {
    findings.push('railway.json: build.builder must be "NIXPACKS"');
  }
  if (railwayJson?.build?.buildCommand !== "npm run server:build") {
    findings.push(
      'railway.json: build.buildCommand must be "npm run server:build"',
    );
  }
  if (railwayJson?.deploy?.startCommand !== "npm run server:prod") {
    findings.push(
      'railway.json: deploy.startCommand must be "npm run server:prod"',
    );
  }
  if (railwayJson?.deploy?.healthcheckPath !== "/") {
    findings.push('railway.json: deploy.healthcheckPath must be "/"');
  }

  requireIncludes(
    buildText,
    "scripts/build.js",
    [
      "process.env.NURAI_DEPLOYMENT_URL",
      "RENDER_EXTERNAL_URL",
      "RENDER_EXTERNAL_HOSTNAME",
      "EXPO_PUBLIC_DOMAIN",
      "NURAI_DEPLOYMENT_URL",
    ],
    findings,
  );

  requireIncludes(
    serverText,
    "server/index.ts",
    [
      "process.env.NURAI_DEPLOYMENT_URL",
      "process.env.RENDER_EXTERNAL_URL",
      "process.env.RENDER_EXTERNAL_HOSTNAME",
      "configureExpoAndLanding(app)",
      'app.use(express.static(path.resolve(process.cwd(), "static-build")))',
    ],
    findings,
  );

  requireIncludes(
    envTemplate,
    ".env.production.example",
    ["NURAI_DEPLOYMENT_URL=", "NODE_ENV=production", "PORT=5000"],
    findings,
  );

  if (findings.length) {
    console.error("Deployment config check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Deployment config check passed: production host build/run paths, Railway runtime config, static export domain fallback, server static routes, and optional legacy .replit secret placement are release-shaped.",
  );
}

main();
