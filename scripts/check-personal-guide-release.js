#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const screen = read("client/screens/PersonalGuideScreen.tsx");
const home = read("client/screens/HomeScreen.tsx");
const health = read("client/screens/MuslimHealthScreen.tsx");
const service = read("client/services/personalGuideConversationService.ts");
const contextBuilder = read("server/ai/contextBuilder.ts");
const router = read("server/ai/router.ts");
const structuredResponse = read(
  "server/replit_integrations/nurai-context/structuredResponse.ts",
);
const refreshConversationBlock = screen.match(
  /const refreshConversation = useCallback\([\s\S]*?\n  \);\n\n  const submit/,
)?.[0];

const checks = [
  {
    ok: screen.includes('useState(route.params?.visiblePrompt || "")'),
    message:
      "Personal Guide must only prefill customer-safe visiblePrompt copy.",
  },
  {
    ok: !screen.includes("useState(route.params?.prompt"),
    message:
      "Personal Guide must not expose raw route prompts in the composer.",
  },
  {
    ok:
      screen.includes("privateContextLines") &&
      screen.includes("privateContextLines,") &&
      service.includes("privateContextLines?: string[]"),
    message:
      "Private Home context must travel separately from visible message copy.",
  },
  {
    ok:
      home.includes("visiblePrompt,") &&
      home.includes("privateContextLines:") &&
      health.includes("visiblePrompt:"),
    message:
      "Home and Health launchers must use the safe Personal Guide contract.",
  },
  {
    ok:
      service.includes("personalAI:") &&
      service.includes("needsToKnow:") &&
      service.includes("behaviorSignals:"),
    message: "Private context must be sent as bounded structured app context.",
  },
  {
    ok: screen.includes("removeClippedSubviews={false}"),
    message:
      "Personal Guide must keep long responses fully mounted instead of clipping offscreen text.",
  },
  {
    ok: !screen.includes("onContentSizeChange"),
    message:
      "Personal Guide must not force long responses to their final line while the user is reading.",
  },
  {
    ok:
      Boolean(refreshConversationBlock) &&
      !refreshConversationBlock.includes("scrollToEnd"),
    message:
      "A completed Personal Guide response must remain positioned at its beginning for long-form reading.",
  },
  {
    ok:
      screen.includes("customerActionPrompt") &&
      service.includes("customerVisibleAction") &&
      home.includes("internalPrompt"),
    message:
      "Personal Guide must not show internal context lines as user prompts or action labels.",
  },
  {
    ok:
      contextBuilder.includes("firstCustomerFacingAction") &&
      router.includes("I can share the general principle") &&
      structuredResponse.includes("General guidance only."),
    message:
      "Sensitive AI fallbacks must use customer-facing guidance instead of reviewer diagnostics.",
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length) {
  for (const failure of failures) console.error(`- ${failure.message}`);
  process.exit(1);
}

console.log(
  "Personal Guide customer-copy and private-context contract passed.",
);
