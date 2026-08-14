import * as fs from "node:fs";
import type { AddressInfo } from "node:net";
import * as path from "node:path";

async function main() {
  process.env.DATABASE_URL ||=
    "postgres://nurai:nurai@127.0.0.1:5432/nurai_route_check";

  const express = (await import("express")).default;
  const { registerPersonalAIRoutes } = await import(
    "../server/ai/personalAIRoute"
  );

  const root = process.cwd();
  const routeFile = fs.readFileSync(
    path.join(root, "server/ai/personalAIRoute.ts"),
    "utf8",
  );
  const routesFile = fs.readFileSync(
    path.join(root, "server/routes.ts"),
    "utf8",
  );
  const findings: string[] = [];

  for (const required of [
    '"/api/personal-ai/respond"',
    "requireAuthenticatedUser",
    "resolvePlanTierForUser",
    "canUseAIMode",
    "enforceDailyAIQuota",
    "enforceAITextRateLimit",
    "buildPersonalAIOrchestrator",
    "generateAITextWithUsageLogging",
    "structuredResponse",
  ]) {
    if (!routeFile.includes(required)) {
      findings.push(`Personal AI route is missing ${required}.`);
    }
  }

  if (routeFile.includes("chatStorage")) {
    findings.push("Personal AI route must not depend on legacy chat storage.");
  }

  const accessIndex = routeFile.indexOf("canUseAIMode");
  const quotaIndex = routeFile.indexOf("enforceDailyAIQuota(res");
  if (accessIndex < 0 || quotaIndex < 0 || accessIndex > quotaIndex) {
    findings.push(
      "Mode access should be checked before daily quota is consumed.",
    );
  }

  if (!routesFile.includes("registerPersonalAIRoutes(app)")) {
    findings.push("server/routes.ts must register the Personal AI route.");
  }
  for (const oldRegistration of [
    "registerChatRoutes(app)",
    "registerNuraiContextRoutes(app)",
    "registerTafsirRoutes(app)",
    "registerImageRoutes(app)",
    "registerAudioRoutes(app)",
    "registerScholarAgentRoutes(app)",
  ]) {
    if (routesFile.includes(oldRegistration)) {
      findings.push(
        `server/routes.ts must not re-register ${oldRegistration}.`,
      );
    }
  }

  const app = express();
  app.use(express.json());
  registerPersonalAIRoutes(app);
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/personal-ai/respond`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "What should I do next today?" }),
      },
    );
    if (response.status !== 401) {
      findings.push(
        `Unauthenticated Personal AI request should return 401, got ${response.status}.`,
      );
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (findings.length) {
    console.error("Personal AI route check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Personal AI route check passed: auth, clean registration, mode access, quota, rate limit, orchestrator, and structured response controls verified.",
  );
}

main().catch((error) => {
  console.error(
    `Personal AI route check failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
});
