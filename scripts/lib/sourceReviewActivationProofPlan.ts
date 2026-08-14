export type SourcePackReviewDomain = "tafsir" | "hadith" | "fiqh" | "seerah";

export type SourcePackActivationProofPlan = {
  proofBoundary: string;
  currentClaimAllowed: string;
  completedEvidenceFileRule: string;
  activationCommandFlow: {
    step: string;
    command: string;
    expected: string;
  }[];
  acceptanceCriteria: string[];
};

type AddFinding = (
  id: string,
  severity: "blocker" | "warning",
  message: string,
) => void;

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasProofText(value: unknown): boolean {
  const text = cleanText(value);
  if (!text) return false;
  return ![
    /\bto\s*do\b/i,
    /\btbd\b/i,
    /\bn\/a\b/i,
    /\bna\b/i,
    /\bplaceholder\b/i,
    /\bexample\b/i,
    /\bunknown\b/i,
    /\breplace[-_\s]?me\b/i,
  ].some((pattern) => pattern.test(text));
}

export function buildActivationProofPlan(
  domain: SourcePackReviewDomain,
): SourcePackActivationProofPlan {
  return {
    proofBoundary:
      "This file is a blank, hash-bound reviewer workspace for draft NurAI source-pack cards. It is not review evidence, scholar approval, licensing clearance, or source activation.",
    currentClaimAllowed: `${domain} source-pack cards remain draft and inactive until a completed evidence file validates with --require-approved and is applied with explicit activation confirmation. Do not claim these cards are verified, reviewed by qualified scholars, or available in NurAI answers from this intake alone.`,
    completedEvidenceFileRule:
      "A completed evidence file must preserve every sourceCardHash, provide real reviewer identity and qualification, ISO-like review and activation dates, licensing evidence, activation approver details, detailed reviewer notes, detailed activation notes, reviewed explanation text, and all checklist fields set to true.",
    activationCommandFlow: [
      {
        step: "Export current review packets",
        command: `npm run export:${domain}-review-packets -- --check --summary-json`,
        expected:
          "Review packet artifacts are current for the draft source cards.",
      },
      {
        step: "Export current evidence intake",
        command: `npm run export:${domain}-review-evidence-intake -- --check --summary-json`,
        expected:
          "The blank evidence intake is current and hash-bound to the draft cards.",
      },
      {
        step: "Validate completed evidence",
        command: `npm run validate:${domain}-review-evidence -- --file /absolute/path/to/real-${domain}-source-review-evidence.json --require-approved --summary-json`,
        expected:
          "Completed evidence validates with every draft card approved and no blockers.",
      },
      {
        step: "Dry-run activation import",
        command: `npm run apply:${domain}-review-evidence -- --file /absolute/path/to/real-${domain}-source-review-evidence.json --summary-json`,
        expected:
          "Dry run reports the exact source-pack cards that would become verified.",
      },
      {
        step: "Write activation after inspection",
        command: `npm run apply:${domain}-review-evidence -- --file /absolute/path/to/real-${domain}-source-review-evidence.json --write --confirm-source-pack-activation`,
        expected:
          "Verified source cards are written only after the dry-run diff and real evidence are inspected.",
      },
    ],
    acceptanceCriteria: [
      "Every draft card for the domain is present exactly once with the current sourceCardHash.",
      "cardApprovedForActivation is true only when the reviewer and activation approver evidence is real and non-placeholder.",
      "The checklist confirms source URL review, licensing clearance, accurate scope, no copied source text, approved allowed and forbidden use, and activation safety.",
      "Licensing status is licensed, public_domain, or owned, with specific evidence explaining the allowed product use.",
      "Reviewer notes, activation notes, and reviewed explanation are detailed enough for audit review without relying on private conversations.",
      "No source text is copied into the evidence file beyond short identifying references.",
      "The activation write command uses --confirm-source-pack-activation only after a clean --require-approved validation and inspected dry run.",
    ],
  };
}

export function validateActivationProofPlan(
  activationProofPlan: unknown,
  domain: SourcePackReviewDomain,
  addFinding: AddFinding,
) {
  if (
    !activationProofPlan ||
    typeof activationProofPlan !== "object" ||
    Array.isArray(activationProofPlan)
  ) {
    addFinding(
      "activation-proof-plan",
      "blocker",
      "Evidence file must include the activationProofPlan boundary from the current intake.",
    );
    return {
      hasActivationProofPlan: false,
      activationCommandFlowCount: 0,
      acceptanceCriteriaCount: 0,
    };
  }

  const plan = activationProofPlan as Partial<SourcePackActivationProofPlan>;
  for (const field of [
    "proofBoundary",
    "currentClaimAllowed",
    "completedEvidenceFileRule",
  ] satisfies (keyof SourcePackActivationProofPlan)[]) {
    if (!hasProofText(plan[field])) {
      addFinding(
        `activation-proof-plan:${field}`,
        "blocker",
        `activationProofPlan.${field} must be carried into completed evidence files.`,
      );
    }
  }

  const commandFlow = Array.isArray(plan.activationCommandFlow)
    ? plan.activationCommandFlow
    : [];
  if (commandFlow.length < 5) {
    addFinding(
      "activation-proof-plan:activation-command-flow",
      "blocker",
      "activationProofPlan.activationCommandFlow must include the full export, validation, dry-run, and confirmed-write flow.",
    );
  }

  for (const command of [
    `export:${domain}-review-packets`,
    `export:${domain}-review-evidence-intake`,
    `validate:${domain}-review-evidence`,
    `apply:${domain}-review-evidence`,
    "--confirm-source-pack-activation",
  ]) {
    const present = commandFlow.some((step) =>
      cleanText(step.command).includes(command),
    );
    if (!present) {
      addFinding(
        `activation-proof-plan:${command}`,
        "blocker",
        `activationProofPlan.activationCommandFlow must include ${command}.`,
      );
    }
  }

  const acceptanceCriteria = Array.isArray(plan.acceptanceCriteria)
    ? plan.acceptanceCriteria
    : [];
  if (acceptanceCriteria.length < 5) {
    addFinding(
      "activation-proof-plan:acceptance-criteria",
      "blocker",
      "activationProofPlan.acceptanceCriteria must carry the source-pack activation acceptance criteria.",
    );
  }

  return {
    hasActivationProofPlan: true,
    activationCommandFlowCount: commandFlow.length,
    acceptanceCriteriaCount: acceptanceCriteria.length,
  };
}
