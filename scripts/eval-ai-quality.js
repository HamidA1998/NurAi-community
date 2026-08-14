#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const defaultPackPath = path.join(
  root,
  "docs/audit/evals/ai-routing-citation-prompt-pack.json",
);

const args = new Set(process.argv.slice(2));
const shouldPrintManual = args.has("--manual");
const shouldPrintJson = args.has("--json");
const packArg = process.argv.slice(2).find((arg) => arg.startsWith("--pack="));
const packPath = packArg
  ? path.resolve(root, packArg.slice("--pack=".length))
  : defaultPackPath;

const requiredCategories = new Set([
  "quran_question",
  "hadith_authenticity_question",
  "womens_health_fiqh_question",
  "arabic_learning_question",
  "unsafe_or_uncertain_question",
]);
const minCasesPerCategory = 2;
const allowedSourceTypes = new Set([
  "quran",
  "hadith",
  "scholar",
  "medical",
  "language",
  "app_content",
  "other",
]);
const trustedSourceHosts = new Set(["quran.com", "sunnah.com"]);
const requiredResponseFields = new Set([
  "route",
  "answer",
  "sources",
  "uncertainty",
  "safety_or_escalation",
]);
const requiredRubricKeys = new Set([
  "route",
  "citation",
  "riskHandling",
  "hallucinationResistance",
  "userHelpfulness",
]);
const expectedRouteTermsByCategory = {
  quran_question: ["quran"],
  hadith_authenticity_question: ["hadith", "source"],
  womens_health_fiqh_question: ["womens", "fiqh", "medical"],
  arabic_learning_question: ["arabic"],
  unsafe_or_uncertain_question: ["safety", "refusal", "escalation", "fiqh"],
};

function fail(message, failures) {
  failures.push(message);
}

function assertString(value, label, failures) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string`, failures);
  }
}

function assertArray(value, label, failures, minLength = 1) {
  if (!Array.isArray(value) || value.length < minLength) {
    fail(
      `${label} must be an array with at least ${minLength} item(s)`,
      failures,
    );
  }
}

function stringItems(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}

function assertStringArrayItems(value, label, failures) {
  if (!Array.isArray(value)) return;

  for (const [index, item] of value.entries()) {
    assertString(item, `${label}[${index}]`, failures);
  }
}

function corpusFor(caseItem) {
  return [
    caseItem.title,
    caseItem.prompt,
    caseItem.expectedRisk,
    caseItem.expectedRoute,
    caseItem.expectedSourceBehavior?.notes,
    ...(caseItem.hallucinationGuards || []),
    ...(caseItem.passCriteria || []),
    ...(caseItem.failCriteria || []),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function readPack(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function validateSourceBehavior(caseItem, failures) {
  const label = `${caseItem.id || "unknown"}.expectedSourceBehavior`;
  const sourceBehavior = caseItem.expectedSourceBehavior;
  if (!sourceBehavior || typeof sourceBehavior !== "object") {
    fail(`${label} must be an object`, failures);
    return;
  }

  if (typeof sourceBehavior.mustCite !== "boolean") {
    fail(`${label}.mustCite must be a boolean`, failures);
  }
  assertArray(
    sourceBehavior.requiredSourceTypes,
    `${label}.requiredSourceTypes`,
    failures,
    0,
  );
  assertArray(
    sourceBehavior.requiredReferences,
    `${label}.requiredReferences`,
    failures,
    0,
  );
  assertArray(
    sourceBehavior.acceptableSourceHosts,
    `${label}.acceptableSourceHosts`,
    failures,
    0,
  );
  assertString(sourceBehavior.notes, `${label}.notes`, failures);
  assertStringArrayItems(
    sourceBehavior.requiredSourceTypes,
    `${label}.requiredSourceTypes`,
    failures,
  );
  assertStringArrayItems(
    sourceBehavior.requiredReferences,
    `${label}.requiredReferences`,
    failures,
  );
  assertStringArrayItems(
    sourceBehavior.acceptableSourceHosts,
    `${label}.acceptableSourceHosts`,
    failures,
  );

  for (const sourceType of stringItems(sourceBehavior.requiredSourceTypes)) {
    if (!allowedSourceTypes.has(sourceType)) {
      fail(
        `${label}.requiredSourceTypes contains unsupported type ${sourceType}`,
        failures,
      );
    }
  }

  for (const host of stringItems(sourceBehavior.acceptableSourceHosts)) {
    if (!trustedSourceHosts.has(host)) {
      fail(
        `${label}.acceptableSourceHosts contains untrusted host ${host}`,
        failures,
      );
    }
  }

  if (
    sourceBehavior.mustCite &&
    sourceBehavior.requiredSourceTypes.length === 0
  ) {
    fail(
      `${label} requires citations but declares no requiredSourceTypes`,
      failures,
    );
  }

  if (
    !sourceBehavior.mustCite &&
    sourceBehavior.requiredReferences.length > 0
  ) {
    fail(
      `${label} declares requiredReferences but mustCite is false`,
      failures,
    );
  }
}

function validateCaseSemantics(caseItem, prefix, failures) {
  const corpus = corpusFor(caseItem);
  const sourceBehavior = caseItem.expectedSourceBehavior || {};
  const sourceTypes = new Set(stringItems(sourceBehavior.requiredSourceTypes));
  const requiredReferences = stringItems(sourceBehavior.requiredReferences);
  const expectedRoute = (caseItem.expectedRoute || "").toLowerCase();
  const expectedRouteTerms =
    expectedRouteTermsByCategory[caseItem.category] || [];

  if (
    expectedRouteTerms.length &&
    !includesAny(expectedRoute, expectedRouteTerms)
  ) {
    fail(
      `${prefix}.expectedRoute does not match the category's required route terms`,
      failures,
    );
  }

  if ((caseItem.hallucinationGuards || []).length < 3) {
    fail(
      `${prefix}.hallucinationGuards must include at least 3 concrete guards`,
      failures,
    );
  }
  if ((caseItem.passCriteria || []).length < 3) {
    fail(
      `${prefix}.passCriteria must include at least 3 concrete pass checks`,
      failures,
    );
  }
  if ((caseItem.failCriteria || []).length < 3) {
    fail(
      `${prefix}.failCriteria must include at least 3 concrete fail checks`,
      failures,
    );
  }

  if (caseItem.category === "quran_question") {
    if (sourceBehavior.mustCite !== true || !sourceTypes.has("quran")) {
      fail(`${prefix} Quran evals must require Quran citations`, failures);
    }
    if (
      !requiredReferences.some((reference) =>
        /^Quran \d{1,3}:\d{1,3}/.test(reference),
      )
    ) {
      fail(
        `${prefix} Quran evals must name the expected Quran reference`,
        failures,
      );
    }
    if (
      !includesAny(corpus, [
        "approximate",
        "paraphrase",
        "citation",
        "source",
        "reference",
      ])
    ) {
      fail(
        `${prefix} Quran evals must check citation or paraphrase discipline`,
        failures,
      );
    }
  }

  if (caseItem.category === "hadith_authenticity_question") {
    if (sourceBehavior.mustCite !== true || !sourceTypes.has("hadith")) {
      fail(
        `${prefix} hadith authenticity evals must require hadith source behavior`,
        failures,
      );
    }
    if (
      !includesAny(corpus, [
        "authentic",
        "grade",
        "verified",
        "fabricated",
        "weak",
        "source",
      ])
    ) {
      fail(
        `${prefix} hadith evals must check authenticity/source-grade handling`,
        failures,
      );
    }
    if (
      !includesAny(corpus, [
        "uncertain",
        "insufficient",
        "cannot verify",
        "unsupported",
        "without evidence",
      ])
    ) {
      fail(
        `${prefix} hadith evals must reward uncertainty when verification is insufficient`,
        failures,
      );
    }
  }

  if (caseItem.category === "womens_health_fiqh_question") {
    if (sourceBehavior.mustCite !== true || !sourceTypes.has("scholar")) {
      fail(
        `${prefix} women's health fiqh evals must require scholar-aware source behavior`,
        failures,
      );
    }
    if (
      !includesAny(corpus, [
        "personal ruling",
        "definitive",
        "qualified scholar",
        "local",
        "madhhab",
      ])
    ) {
      fail(
        `${prefix} women's health fiqh evals must prevent casual personal rulings`,
        failures,
      );
    }
    if (
      !includesAny(corpus, [
        "medical",
        "clinician",
        "health",
        "diagnosis",
        "dizziness",
      ])
    ) {
      fail(
        `${prefix} women's health fiqh evals must include health/clinician safety checks`,
        failures,
      );
    }
  }

  if (caseItem.category === "arabic_learning_question") {
    if (
      !includesAny(corpus, [
        "grammar",
        "meaning",
        "translation",
        "morphology",
        "phrase",
      ])
    ) {
      fail(
        `${prefix} Arabic evals must check language-learning correctness`,
        failures,
      );
    }

    const promptMentionsQuran = /\b(quran|surah|sura|ayah|fatiha)\b/i.test(
      caseItem.prompt || "",
    );
    if (promptMentionsQuran) {
      if (sourceBehavior.mustCite !== true || !sourceTypes.has("quran")) {
        fail(
          `${prefix} Quran-linked Arabic evals must require Quran citations`,
          failures,
        );
      }
      if (
        !requiredReferences.some((reference) =>
          /^Quran \d{1,3}:\d{1,3}/.test(reference),
        )
      ) {
        fail(
          `${prefix} Quran-linked Arabic evals must name the expected Quran reference`,
          failures,
        );
      }
    }
  }

  if (caseItem.category === "unsafe_or_uncertain_question") {
    if (
      !includesAny(corpus, [
        "refuse",
        "refuses",
        "refusal",
        "reject",
        "escalation",
        "qualified",
      ])
    ) {
      fail(
        `${prefix} unsafe/uncertain evals must require refusal or escalation behavior`,
        failures,
      );
    }
    if (
      !includesAny(corpus, [
        "harm",
        "retaliation",
        "definitive",
        "yes/no",
        "high-stakes",
      ])
    ) {
      fail(
        `${prefix} unsafe/uncertain evals must name the unsafe behavior being blocked`,
        failures,
      );
    }
  }
}

function validateCase(caseItem, index, seenIds, foundCategories, failures) {
  const prefix = `cases[${index}]`;
  assertString(caseItem.id, `${prefix}.id`, failures);
  if (caseItem.id) {
    if (seenIds.has(caseItem.id)) {
      fail(`${prefix}.id duplicates ${caseItem.id}`, failures);
    }
    seenIds.add(caseItem.id);
  }

  assertString(caseItem.category, `${prefix}.category`, failures);
  if (caseItem.category) {
    foundCategories.add(caseItem.category);
  }
  assertString(caseItem.title, `${prefix}.title`, failures);
  assertString(caseItem.prompt, `${prefix}.prompt`, failures);
  assertString(caseItem.expectedRisk, `${prefix}.expectedRisk`, failures);
  assertString(caseItem.expectedRoute, `${prefix}.expectedRoute`, failures);
  validateSourceBehavior(caseItem, failures);
  assertArray(
    caseItem.hallucinationGuards,
    `${prefix}.hallucinationGuards`,
    failures,
  );
  assertArray(caseItem.passCriteria, `${prefix}.passCriteria`, failures);
  assertArray(caseItem.failCriteria, `${prefix}.failCriteria`, failures);
  assertStringArrayItems(
    caseItem.hallucinationGuards,
    `${prefix}.hallucinationGuards`,
    failures,
  );
  assertStringArrayItems(
    caseItem.passCriteria,
    `${prefix}.passCriteria`,
    failures,
  );
  assertStringArrayItems(
    caseItem.failCriteria,
    `${prefix}.failCriteria`,
    failures,
  );

  for (const [guardIndex, guard] of (
    caseItem.hallucinationGuards || []
  ).entries()) {
    assertString(
      guard,
      `${prefix}.hallucinationGuards[${guardIndex}]`,
      failures,
    );
  }

  validateCaseSemantics(caseItem, prefix, failures);
}

function validateResponseContract(pack, failures) {
  const contract = pack.expectedResponseContract;
  if (!contract || typeof contract !== "object") {
    fail("expectedResponseContract must be an object", failures);
    return;
  }

  assertArray(
    contract.recommendedFields,
    "expectedResponseContract.recommendedFields",
    failures,
  );

  const fields = new Set(stringItems(contract.recommendedFields));
  for (const field of requiredResponseFields) {
    if (!fields.has(field)) {
      fail(
        `expectedResponseContract.recommendedFields is missing ${field}`,
        failures,
      );
    }
  }

  if (!contract.sourceShape || typeof contract.sourceShape !== "object") {
    fail("expectedResponseContract.sourceShape must be an object", failures);
    return;
  }
  for (const key of ["label", "type", "reference", "url", "confidence"]) {
    assertString(
      contract.sourceShape[key],
      `expectedResponseContract.sourceShape.${key}`,
      failures,
    );
  }
}

function validateRubric(pack, failures) {
  const rubric = pack.scoringRubric;
  if (!rubric || typeof rubric !== "object") {
    fail("scoringRubric must be an object", failures);
    return;
  }

  for (const key of requiredRubricKeys) {
    const item = rubric[key];
    if (!item || typeof item !== "object") {
      fail(`scoringRubric.${key} must be an object`, failures);
      continue;
    }
    if (!Number.isFinite(item.maxPoints) || item.maxPoints <= 0) {
      fail(
        `scoringRubric.${key}.maxPoints must be a positive number`,
        failures,
      );
    }
    assertString(
      item.description,
      `scoringRubric.${key}.description`,
      failures,
    );
  }
}

function validatePack(pack) {
  const failures = [];
  const seenIds = new Set();
  const foundCategories = new Set();
  const categoryCounts = new Map();

  assertString(pack.schemaVersion, "schemaVersion", failures);
  assertString(pack.packId, "packId", failures);
  assertString(pack.title, "title", failures);
  assertArray(
    pack.defaultEvaluatorInstructions,
    "defaultEvaluatorInstructions",
    failures,
  );
  assertArray(pack.cases, "cases", failures);
  validateResponseContract(pack, failures);
  validateRubric(pack, failures);

  for (const [index, caseItem] of (pack.cases || []).entries()) {
    validateCase(caseItem, index, seenIds, foundCategories, failures);
    if (caseItem.category) {
      categoryCounts.set(
        caseItem.category,
        (categoryCounts.get(caseItem.category) || 0) + 1,
      );
    }
  }

  for (const category of requiredCategories) {
    if (!foundCategories.has(category)) {
      fail(`Missing required category: ${category}`, failures);
    } else if ((categoryCounts.get(category) || 0) < minCasesPerCategory) {
      fail(
        `Category ${category} must include at least ${minCasesPerCategory} cases`,
        failures,
      );
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    caseCount: Array.isArray(pack.cases) ? pack.cases.length : 0,
    categories: [...foundCategories].sort(),
  };
}

function manualPayload(caseItem) {
  return {
    evalCaseId: caseItem.id,
    message: caseItem.prompt,
    reviewerExpectations: {
      expectedRisk: caseItem.expectedRisk,
      expectedRoute: caseItem.expectedRoute,
      expectedSourceBehavior: caseItem.expectedSourceBehavior,
      hallucinationGuards: caseItem.hallucinationGuards,
      passCriteria: caseItem.passCriteria,
      failCriteria: caseItem.failCriteria,
    },
  };
}

function printManualInstructions(pack) {
  const endpoint =
    process.env.NURAI_AI_EVAL_ENDPOINT ||
    pack.manualRunInstructions?.endpointPlaceholder ||
    "http://127.0.0.1:5000/api/ai";
  const token = process.env.NURAI_AI_EVAL_TOKEN || "<optional-token>";

  console.log("\nManual AI eval instructions");
  console.log("==========================");
  console.log(`Endpoint: ${endpoint}`);
  console.log(
    "These payloads are for manual copy/review. This runner does not call the endpoint.",
  );
  console.log("\nExample curl:");
  console.log(
    `curl -sS -X POST "${endpoint}" -H 'Content-Type: application/json' -H "Authorization: Bearer ${token}" --data '<payload-json>'`,
  );

  for (const caseItem of pack.cases) {
    console.log(`\n--- ${caseItem.id}: ${caseItem.title} ---`);
    console.log(JSON.stringify(manualPayload(caseItem), null, 2));
  }
}

function printSummary(result, pack, filePath) {
  const summary = {
    ok: result.ok,
    pack: pack.packId,
    file: path.relative(root, filePath),
    cases: result.caseCount,
    categories: result.categories,
    failures: result.failures,
  };

  if (shouldPrintJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (result.ok) {
    console.log(
      `AI eval pack valid: ${summary.cases} cases across ${summary.categories.length} categories (${summary.file})`,
    );
    for (const category of summary.categories) {
      console.log(`- ${category}`);
    }
    return;
  }

  console.error(`AI eval pack invalid: ${summary.file}`);
  for (const failure of result.failures) {
    console.error(`- ${failure}`);
  }
}

function main() {
  const pack = readPack(packPath);
  const result = validatePack(pack);
  printSummary(result, pack, packPath);

  if (!result.ok) {
    process.exit(1);
  }

  if (shouldPrintManual) {
    printManualInstructions(pack);
  }
}

main();
