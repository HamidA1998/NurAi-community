#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

const scanRoots = ["client", path.join("server", "templates")];
const ignoredDirs = new Set([
  ".expo",
  ".git",
  "build",
  "dist",
  "node_modules",
  "server_dist",
  "static-build",
  "web-build",
]);
const textExtensions = new Set([
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".ts",
  ".tsx",
]);

const blockedCopyPatterns = [
  {
    id: "internal-qa-identity-copy",
    pattern: /\bNurAI (?:QA|Preview)\b|qa@nurai\.local|\bqa-local\b/gi,
    reason: "Preview identities must use neutral customer-safe wording.",
  },
  {
    id: "internal-ranker-copy",
    pattern: /\bV3 private ranker\b|\bprivate ranker\b/gi,
    reason: "Do not expose internal model or ranking implementation details.",
  },
  {
    id: "raw-pro-badge-copy",
    pattern: /(["'`])PRO\1|>\s*PRO\s*</g,
    reason: "Use Premium, Scholar, Unlock, or the NurAI mark instead.",
  },
  {
    id: "quran-pro-copy",
    pattern: /\bQuran\s+Pro\b/gi,
    reason: "Use NurAI Quran Guide or plan-specific customer wording.",
  },
  {
    id: "internal-pro-badge-name",
    pattern: /\bproBadge\b/g,
    reason: "Avoid stale Pro-badge UI branches.",
  },
  {
    id: "raw-json-error-copy",
    pattern: /\b[45]\d{2}\s*:\s*\{[^}\n]*"error"\s*:/g,
    reason: "Show a friendly message instead of raw server JSON.",
  },
  {
    id: "raw-narration-error-copy",
    pattern: /\bFailed to generate narration\b/gi,
    reason: "Use the polished narration fallback copy.",
  },
  {
    id: "internal-media-policy-heading",
    pattern: /\bSafe media policy\b/gi,
    reason: "This is internal/legal copy, not customer-facing product copy.",
  },
  {
    id: "internal-rehosting-copy",
    pattern: /\brehosting\b/gi,
    reason: "Explain the customer benefit instead of internal hosting policy.",
  },
  {
    id: "internal-rights-clear-copy",
    pattern: /\brights are clear\b/gi,
    reason: "Use simple customer language about trusted official sources.",
  },
  {
    id: "internal-official-channel-route-copy",
    pattern: /\bofficial\s+(?:YouTube\s+)?channel route\b/gi,
    reason: "Use customer-facing source labels instead of routing language.",
  },
  {
    id: "internal-rights-holder-copy",
    pattern: /\bContent stays with the rights holder\b/gi,
    reason: "Use concise customer-facing copy about official sources.",
  },
  {
    id: "internal-copy-reupload-copy",
    pattern: /\bdownload,\s*copy,\s*or\s*reupload\b/gi,
    reason: "Avoid policy/legal mechanics in customer cards.",
  },
  {
    id: "internal-release-index-copy",
    pattern: /\bSource-only release index\b/gi,
    reason:
      "Use a customer-facing source label instead of release-process copy.",
  },
  {
    id: "internal-local-paraphrase-copy",
    pattern: /\bLocal paraphrased hadith text was removed\b/gi,
    reason: "Do not describe implementation history in the app UI.",
  },
  {
    id: "internal-this-release-copy",
    pattern: /\bthis release only shows\b/gi,
    reason: "Use evergreen product language instead of release-process copy.",
  },
  {
    id: "internal-source-only-hadith-copy",
    pattern: /\bSource-only hadith reference\b/gi,
    reason:
      "Use customer-facing saved-reference copy, not implementation copy.",
  },
  {
    id: "internal-bundling-copy",
    pattern: /\binstead of bundling a local translation\b/gi,
    reason:
      "Explain the trusted-source benefit instead of app packaging detail.",
  },
  {
    id: "placeholder-media-coming-next-copy",
    pattern: /\bGuided lessons are coming next\b/gi,
    reason: "Avoid visible placeholder roadmap copy in customer screens.",
  },
  {
    id: "placeholder-media-preparing-copy",
    pattern: /\bWe are preparing short NurAI lessons\b/gi,
    reason: "Avoid visible placeholder roadmap copy in customer screens.",
  },
  {
    id: "stale-app-version-copy",
    pattern: /\b(?:NurAI v|Version )1\.0\.0\b/gi,
    reason: "Use the Expo app version so customer screens match the build.",
  },
  {
    id: "internal-release-connected-copy",
    pattern: /\bnot connected in this release\b/gi,
    reason: "Use evergreen product copy instead of release-process wording.",
  },
  {
    id: "internal-before-release-copy",
    pattern: /\bbefore release\b/gi,
    reason:
      "Use publication or review wording instead of release-process copy.",
  },
  {
    id: "internal-places-key-copy",
    pattern:
      /\bproduction Google Places key\b|\bGoogle Places provider is not configured for production\b/gi,
    reason:
      "Places errors should use customer-safe availability wording, not provider/key configuration language.",
  },
  {
    id: "internal-expo-go-copy",
    pattern: /\bExpo Go\b/gi,
    reason:
      "Authentication errors should not mention developer tooling to customers.",
  },
  {
    id: "internal-source-review-copy",
    pattern: /\bSOURCE QA\b|\bReview Engine\b|\bserver audit trail\b/gi,
    reason:
      "Source review screens should use customer-safe trust wording instead of internal QA or audit wording.",
  },
  {
    id: "settings-raw-json-export-copy",
    pattern: /\bShare a JSON export of your chat history and bookmarks\b/gi,
    reason: "Use customer-friendly private-backup wording in settings.",
  },
  {
    id: "kids-raw-json-export-copy",
    pattern: /\bView progress data as JSON\b/gi,
    reason: "Use parent-friendly private-backup wording in Kids Mode.",
  },
  {
    id: "womens-health-raw-json-export-label",
    pattern: /\bExport as JSON\b/gi,
    reason:
      "Use customer-facing private-backup wording instead of raw file-format labels.",
  },
  {
    id: "womens-health-raw-csv-export-label",
    pattern: /\bExport as CSV\b/gi,
    reason:
      "Use customer-facing spreadsheet wording instead of raw file-format labels.",
  },
  {
    id: "raw-json-csv-marketing-copy",
    pattern: /\bJSON\/CSV export\b|\bData export \(CSV and JSON\)\b/gi,
    reason:
      "Subscription and settings copy should describe the customer benefit, not implementation file formats.",
  },
  {
    id: "fake-community-unread-copy",
    pattern: /\b3 unread messages\b/gi,
    reason:
      "Do not show hard-coded unread/community state as customer-facing data.",
  },
  {
    id: "internal-library-review-navigation-copy",
    pattern: /\bSource and scholar-review tools remain available\b/gi,
    reason:
      "Library customers should see source trust language, not internal reviewer navigation instructions.",
  },
];

function relative(file) {
  return path.relative(root, file);
}

function shouldScanFile(file) {
  return textExtensions.has(path.extname(file));
}

function walk(entryPath, files = []) {
  if (!fs.existsSync(entryPath)) return files;

  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    if (shouldScanFile(entryPath)) files.push(entryPath);
    return files;
  }

  for (const entry of fs.readdirSync(entryPath, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(entryPath, entry.name);
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

function scanAlertShape(text, file, findings) {
  const invalidAlertPattern =
    /Alert\.alert\(\s*["'`][^"'`]*["'`]\s*,\s*["'`][^"'`]*["'`]\s*,\s*["'`][^"'`]*["'`]/g;
  let match = invalidAlertPattern.exec(text);
  while (match) {
    findings.push({
      file: relative(file),
      line: lineNumberForIndex(text, match.index),
      id: "invalid-alert-third-string",
      text: match[0],
      reason:
        "React Native Alert.alert third argument must be button config, not another raw string.",
    });
    match = invalidAlertPattern.exec(text);
  }
}

function scanFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const findings = [];

  for (const check of blockedCopyPatterns) {
    check.pattern.lastIndex = 0;
    let match = check.pattern.exec(text);
    while (match) {
      findings.push({
        file: relative(file),
        line: lineNumberForIndex(text, match.index),
        id: check.id,
        text: match[0],
        reason: check.reason,
      });
      match = check.pattern.exec(text);
    }
  }

  scanAlertShape(text, file, findings);

  return findings;
}

function main() {
  const files = scanRoots.flatMap((entry) => walk(path.join(root, entry)));
  const findings = files.flatMap(scanFile);
  const bookReaderPath = path.join(root, "client/screens/BookReaderScreen.tsx");
  if (fs.existsSync(bookReaderPath)) {
    const bookReaderText = fs.readFileSync(bookReaderPath, "utf8");
    if (
      !bookReaderText.includes("customerNarrationErrorMessage") ||
      bookReaderText.includes(
        'error?.message || "Could not download this narration."',
      )
    ) {
      findings.push({
        file: "client/screens/BookReaderScreen.tsx",
        line: lineNumberForIndex(
          bookReaderText,
          bookReaderText.indexOf("downloadNarration"),
        ),
        id: "raw-narration-runtime-error",
        text: "downloadNarration",
        reason:
          "Narration download failures must use customer-safe fallback copy, not raw runtime error messages.",
      });
    }
  }
  const chatScreenPath = path.join(root, "client/screens/ChatScreen.tsx");
  if (fs.existsSync(chatScreenPath)) {
    const chatScreenText = fs.readFileSync(chatScreenPath, "utf8");
    for (const snippet of [
      "customerSafeChatErrorMessage",
      "chatAccessNoticeForError",
      "apiRequest",
      "Unlock more NurAI guidance",
    ]) {
      if (!chatScreenText.includes(snippet)) {
        findings.push({
          file: "client/screens/ChatScreen.tsx",
          line: 1,
          id: "chat-ai-customer-safe-error-missing",
          text: snippet,
          reason:
            "AI chat failures need customer-safe copy and an upgrade/allowance CTA path.",
        });
      }
    }
    for (const rawErrorSnippet of [
      "throw new Error(errorData.error",
      "throw new Error(errorData.message",
    ]) {
      if (chatScreenText.includes(rawErrorSnippet)) {
        findings.push({
          file: "client/screens/ChatScreen.tsx",
          line: lineNumberForIndex(
            chatScreenText,
            chatScreenText.indexOf(rawErrorSnippet),
          ),
          id: "chat-raw-server-error-throw",
          text: rawErrorSnippet,
          reason:
            "AI chat should route server failures through apiRequest and customerSafeChatErrorMessage.",
        });
      }
    }
  }
  const aiResponseModalPath = path.join(
    root,
    "client/components/AIResponseModal.tsx",
  );
  if (fs.existsSync(aiResponseModalPath)) {
    const aiResponseModalText = fs.readFileSync(aiResponseModalPath, "utf8");
    for (const snippet of [
      "customerSafeAIErrorMessage",
      "We could not complete that request. Please try again.",
      "return null;",
    ]) {
      if (!aiResponseModalText.includes(snippet)) {
        findings.push({
          file: "client/components/AIResponseModal.tsx",
          line: 1,
          id: "raw-ai-runtime-error-guard",
          text: snippet,
          reason:
            "Shared AI error states must sanitize backend/runtime messages before showing them to customers.",
        });
      }
    }
    for (const rawErrorSnippet of ["error.message", "String(error)"]) {
      if (aiResponseModalText.includes(rawErrorSnippet)) {
        findings.push({
          file: "client/components/AIResponseModal.tsx",
          line: lineNumberForIndex(
            aiResponseModalText,
            aiResponseModalText.indexOf(rawErrorSnippet),
          ),
          id: "raw-ai-runtime-error-guard",
          text: rawErrorSnippet,
          reason:
            "The retired AI modal helper must not expose raw backend/runtime messages.",
        });
      }
    }
  }
  const errorFallbackPath = path.join(
    root,
    "client/components/ErrorFallback.tsx",
  );
  if (fs.existsSync(errorFallbackPath)) {
    const errorFallbackText = fs.readFileSync(errorFallbackPath, "utf8");
    for (const snippet of [
      "NurAI needs a quick refresh",
      "Reload NurAI",
      "Return to app",
      "NurAILogoMark",
      "__DEV__",
      "Show developer details",
    ]) {
      if (!errorFallbackText.includes(snippet)) {
        findings.push({
          file: "client/components/ErrorFallback.tsx",
          line: 1,
          id: "branded-error-boundary-copy-missing",
          text: snippet,
          reason:
            "The app crash fallback should stay customer-safe, branded, and keep technical details dev-only.",
        });
      }
    }
  }
  for (const screenPath of [
    "client/screens/ArabicLearningScreen.tsx",
    "client/screens/BookReaderScreen.tsx",
    "client/screens/DuasScreen.tsx",
    "client/screens/NamesOfAllahScreen.tsx",
    "client/screens/NewMuslimScreen.tsx",
    "client/screens/PrayerTimesScreen.tsx",
    "client/screens/QuranReaderScreen.tsx",
    "client/screens/WomensHealthScreen.tsx",
  ]) {
    const fullPath = path.join(root, screenPath);
    if (!fs.existsSync(fullPath)) continue;
    const screenText = fs.readFileSync(fullPath, "utf8");
    if (!screenText.includes("customerSafeAIErrorMessage")) {
      findings.push({
        file: screenPath,
        line: 1,
        id: "screen-ai-error-sanitizer-missing",
        text: "customerSafeAIErrorMessage",
        reason:
          "AI screens should sanitize provider/runtime error text before it enters customer-facing state.",
      });
    }
    const rawAiErrorMatch = screenText.match(
      /set(?:AI?|Ai)?(?:Modal)?Error(?:Message)?\(\s*(?:err|error)\??\.message\s*\)/,
    );
    if (rawAiErrorMatch) {
      findings.push({
        file: screenPath,
        line: lineNumberForIndex(screenText, rawAiErrorMatch.index || 0),
        id: "screen-raw-ai-error-message",
        text: rawAiErrorMatch[0],
        reason:
          "AI screens must not place raw provider/runtime messages directly into visible error state.",
      });
    }
  }
  const womensHealthContextPath = path.join(
    root,
    "client/context/WomensHealthContext.tsx",
  );
  if (fs.existsSync(womensHealthContextPath)) {
    const womensHealthContextText = fs.readFileSync(
      womensHealthContextPath,
      "utf8",
    );
    if (
      womensHealthContextText.includes(
        'error: e?.message || "Failed to parse the imported file"',
      )
    ) {
      findings.push({
        file: "client/context/WomensHealthContext.tsx",
        line: lineNumberForIndex(
          womensHealthContextText,
          womensHealthContextText.indexOf("Failed to parse the imported file"),
        ),
        id: "raw-import-runtime-error",
        text: "Failed to parse the imported file",
        reason:
          "Import failures must use customer-safe copy instead of raw parser/runtime error messages.",
      });
    }
  }
  const womensHealthScreenPath = path.join(
    root,
    "client/screens/WomensHealthScreen.tsx",
  );
  if (fs.existsSync(womensHealthScreenPath)) {
    const womensHealthScreenText = fs.readFileSync(
      womensHealthScreenPath,
      "utf8",
    );
    if (womensHealthScreenText.includes("Import failed${detail}")) {
      findings.push({
        file: "client/screens/WomensHealthScreen.tsx",
        line: lineNumberForIndex(
          womensHealthScreenText,
          womensHealthScreenText.indexOf("Import failed${detail}"),
        ),
        id: "raw-import-toast-error",
        text: "Import failed${detail}",
        reason:
          "Import toasts must not append raw parser/runtime details for customers.",
      });
    }
  }
  const settingsScreenPath = path.join(
    root,
    "client/screens/SettingsScreen.tsx",
  );
  if (fs.existsSync(settingsScreenPath)) {
    const settingsScreenText = fs.readFileSync(settingsScreenPath, "utf8");
    if (/message:\s*JSON\.stringify\(payload/.test(settingsScreenText)) {
      findings.push({
        file: "client/screens/SettingsScreen.tsx",
        line: lineNumberForIndex(
          settingsScreenText,
          settingsScreenText.search(/message:\s*JSON\.stringify\(payload/),
        ),
        id: "raw-settings-export-share-message",
        text: "message: JSON.stringify(payload",
        reason:
          "Settings backup shares should not show raw JSON as the primary customer-facing message.",
      });
    }
  }
  const kidsParentScreenPath = path.join(
    root,
    "client/screens/KidsParentScreen.tsx",
  );
  if (fs.existsSync(kidsParentScreenPath)) {
    const kidsParentScreenText = fs.readFileSync(kidsParentScreenPath, "utf8");
    if (/JSON\.stringify\(exportData/.test(kidsParentScreenText)) {
      findings.push({
        file: "client/screens/KidsParentScreen.tsx",
        line: lineNumberForIndex(
          kidsParentScreenText,
          kidsParentScreenText.search(/JSON\.stringify\(exportData/),
        ),
        id: "raw-kids-export-json-preview",
        text: "JSON.stringify(exportData",
        reason:
          "Kids Mode should show parent-friendly progress summaries instead of raw backup data.",
      });
    }
  }
  const librarySourceReviewPath = path.join(
    root,
    "client/screens/LibrarySourceReviewScreen.tsx",
  );
  if (fs.existsSync(librarySourceReviewPath)) {
    const librarySourceReviewText = fs.readFileSync(
      librarySourceReviewPath,
      "utf8",
    );
    if (
      librarySourceReviewText.includes("error.message") ||
      librarySourceReviewText.includes("error instanceof Error")
    ) {
      findings.push({
        file: "client/screens/LibrarySourceReviewScreen.tsx",
        line: 1,
        id: "raw-source-review-save-error",
        text: "error.message",
        reason:
          "Source review save failures must use customer-safe copy instead of raw server errors.",
      });
    }
  }
  const libraryHomePath = path.join(
    root,
    "client/screens/LibraryHomeScreen.tsx",
  );
  const rootNavigatorPath = path.join(
    root,
    "client/navigation/RootStackNavigator.tsx",
  );
  if (fs.existsSync(libraryHomePath) && fs.existsSync(rootNavigatorPath)) {
    const libraryHomeText = fs.readFileSync(libraryHomePath, "utf8");
    const rootNavigatorText = fs.readFileSync(rootNavigatorPath, "utf8");
    const sourceReviewRouteRefs = (
      libraryHomeText.match(/navigation\.navigate\("LibrarySourceReview"\)/g) ||
      []
    ).length;
    const sourceReviewButtonIsDevelopmentGated =
      /SHOW_INTERNAL_LIBRARY_REVIEW\s*\?\s*\([\s\S]{0,1200}?navigation\.navigate\("LibrarySourceReview"\)/.test(
        libraryHomeText,
      );
    if (
      !libraryHomeText.includes("SHOW_INTERNAL_LIBRARY_REVIEW") ||
      sourceReviewRouteRefs !== 1 ||
      !sourceReviewButtonIsDevelopmentGated ||
      !rootNavigatorText.includes("ENABLE_INTERNAL_LIBRARY_REVIEW ?") ||
      !rootNavigatorText.includes("ENABLE_INTERNAL_APP_STORE_SHOWCASE ?") ||
      libraryHomeText.includes("chapters are ready for source review")
    ) {
      findings.push({
        file: "client/screens/LibraryHomeScreen.tsx",
        line: 1,
        id: "customer-reachable-library-operations-ui",
        text: "LibrarySourceReview",
        reason:
          "Source QA, proof receipts, review contracts, release gates, and evidence controls must stay behind the explicit development-only route flag.",
      });
    }
  }
  for (const [screenPath, retiredHeadings] of [
    [
      "client/screens/QuranReaderScreen.tsx",
      [
        "QURAN PLAN PROOF RECEIPTS",
        "QURAN READING CONTRACT",
        "SCHOLAR REVIEW ESCALATION",
        "Continue contract",
        "Create review packet",
      ],
    ],
    [
      "client/screens/ArabicLearningScreen.tsx",
      [
        "DAILY SESSION CONTRACT",
        "DAILY PROOF RECEIPT",
        "PRACTICE EVIDENCE RECEIPTS",
        "WEEKLY REVIEW CONTRACT",
        "ARABIC PROOF BOUNDARY",
        "LEVEL GOVERNANCE",
        "TEACHER REVIEW PACKET",
      ],
    ],
  ]) {
    const fullPath = path.join(root, screenPath);
    if (!fs.existsSync(fullPath)) continue;
    const screenText = fs.readFileSync(fullPath, "utf8");
    for (const heading of retiredHeadings) {
      if (!screenText.includes(heading)) continue;
      findings.push({
        file: screenPath,
        line: lineNumberForIndex(screenText, screenText.indexOf(heading)),
        id: "internal-learning-operations-copy",
        text: heading,
        reason:
          "Quran and Arabic learning screens should use calm customer language instead of internal contract, proof, evidence, or governance labels.",
      });
    }
  }
  const communityScreenPath = path.join(
    root,
    "client/screens/CommunityScreen.tsx",
  );
  if (fs.existsSync(communityScreenPath)) {
    const communityScreenText = fs.readFileSync(communityScreenPath, "utf8");
    for (const snippet of [
      "showCommunityError",
      "We could not create your community profile. Please try again.",
      "We could not publish this post. Please try again.",
      "We could not send this reply. Please try again.",
      "We could not delete this post. Please try again.",
    ]) {
      if (!communityScreenText.includes(snippet)) {
        findings.push({
          file: "client/screens/CommunityScreen.tsx",
          line: 1,
          id: "silent-community-action-error",
          text: snippet,
          reason:
            "Community write actions should show customer-safe feedback when saving fails.",
        });
      }
    }
  }
  const communitySettingsPath = path.join(
    root,
    "client/screens/CommunitySettingsScreen.tsx",
  );
  if (fs.existsSync(communitySettingsPath)) {
    const communitySettingsText = fs.readFileSync(
      communitySettingsPath,
      "utf8",
    );
    const settingsError =
      "Your privacy settings were not saved. Please try again.";
    if (!communitySettingsText.includes(settingsError)) {
      findings.push({
        file: "client/screens/CommunitySettingsScreen.tsx",
        line: 1,
        id: "silent-community-settings-error",
        text: settingsError,
        reason:
          "Community privacy changes should show customer-safe feedback when saving fails.",
      });
    }
  }
  const revertJourneyScreenPath = path.join(
    root,
    "client/screens/RevertJourneyScreen.tsx",
  );
  if (fs.existsSync(revertJourneyScreenPath)) {
    const revertJourneyScreenText = fs.readFileSync(
      revertJourneyScreenPath,
      "utf8",
    );
    if (
      revertJourneyScreenText.includes("setAiErrorMessage(error.message)") ||
      revertJourneyScreenText.includes("error?.message ||")
    ) {
      findings.push({
        file: "client/screens/RevertJourneyScreen.tsx",
        line: 1,
        id: "raw-revert-ai-runtime-error",
        text: "error.message",
        reason:
          "Revert Journey AI errors should use customer-safe guidance copy instead of raw server/provider messages.",
      });
    }
    if (
      !revertJourneyScreenText.includes(
        "NurAI could not prepare this guidance. Please try again.",
      )
    ) {
      findings.push({
        file: "client/screens/RevertJourneyScreen.tsx",
        line: 1,
        id: "missing-revert-ai-safe-error-copy",
        text: "NurAI could not prepare this guidance. Please try again.",
        reason:
          "Revert Journey needs a stable customer-safe AI fallback message.",
      });
    }
  }
  const structuredResponsePath = path.join(
    root,
    "server/replit_integrations/nurai-context/structuredResponse.ts",
  );
  if (fs.existsSync(structuredResponsePath)) {
    const structuredResponseText = fs.readFileSync(
      structuredResponsePath,
      "utf8",
    );
    for (const snippet of [
      "source-safety review marked",
      "extra source-safety review",
      "source-safety review for this answer",
    ]) {
      if (structuredResponseText.includes(snippet)) {
        findings.push({
          file: "server/replit_integrations/nurai-context/structuredResponse.ts",
          line: lineNumberForIndex(
            structuredResponseText,
            structuredResponseText.indexOf(snippet),
          ),
          id: "internal-ai-review-warning-copy",
          text: snippet,
          reason:
            "Structured AI warnings are rendered to customers and must use trust-focused wording, not internal review mechanics.",
        });
      }
    }
  }

  if (findings.length > 0) {
    console.error("Customer-facing copy check failed:");
    for (const finding of findings) {
      console.error(
        `- ${finding.file}:${finding.line} matched ${finding.id} (${JSON.stringify(
          finding.text,
        )})`,
      );
      console.error(`  ${finding.reason}`);
    }
    process.exit(1);
  }

  console.log(
    `Customer-facing copy check passed: ${files.length} files scanned for raw technical or internal policy copy.`,
  );
}

main();
