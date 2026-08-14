import AsyncStorage from "@react-native-async-storage/async-storage";

export const SCHOLAR_REVIEW_PACKETS_KEY = "nurai_scholar_review_packets_v1";

export type ScholarReviewPacketStatus =
  | "draft"
  | "ready_for_scholar"
  | "reviewed";

export type ScholarReviewDecision =
  | "approved_educational"
  | "needs_more_context"
  | "refer_local_scholar";

export type SavedScholarReviewPacket = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ScholarReviewPacketStatus;
  title: string;
  featureLabel: string;
  question: string;
  answerSummary: string;
  reasons: string[];
  contextNeeded: string[];
  sourceStatus: string;
  sourceRefs: string[];
  sourceCoverage?: string;
  warning?: string;
  needsScholar: boolean;
  reviewPrompt: string;
  reviewerName?: string;
  reviewerQualification?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
  reviewScope?: string;
  reviewDecision?: ScholarReviewDecision;
};

export type ScholarReviewPacketInput = Omit<
  SavedScholarReviewPacket,
  "id" | "createdAt" | "updatedAt" | "status"
> & {
  status?: ScholarReviewPacketStatus;
};

export type ScholarReviewPacketSummary = {
  total: number;
  draft: number;
  readyForScholar: number;
  reviewed: number;
  needsIntake: number;
  highCare: number;
  oldestReadyAgeDays: number;
  nextHandoffLabel: string;
};

export type ScholarReviewPacketHandoffItem = {
  id:
    | "exact_question"
    | "source_status"
    | "context_needed"
    | "reviewer_prompt"
    | "non_fatwa_boundary";
  label: string;
  detail: string;
  complete: boolean;
  tone: "primary" | "scholar" | "danger";
};

export type ScholarReviewPacketPriority = {
  label: string;
  tone: "primary" | "scholar" | "danger";
  nextAction: string;
  reason: string;
};

export type ScholarReviewPacketSourceTriageItem = {
  id:
    | "missing_sources"
    | "cautious_warning"
    | "limited_coverage"
    | "ready_source_handoff";
  label: string;
  count: number;
  detail: string;
  nextAction: string;
  tone: "primary" | "scholar" | "danger";
  packetIds: string[];
};

export type ScholarReviewNextPacketHandoff = {
  packetId: string | null;
  title: string;
  statusLabel: string;
  priorityLabel: string;
  nextAction: string;
  reason: string;
  sourceLabel: string;
  boundary: string;
  shareLabel: string;
  tone: "primary" | "scholar" | "danger";
};

export type ScholarReviewOperationalLane = {
  id: "intake" | "high_care" | "ready_queue" | "evidence";
  label: string;
  count: number;
  detail: string;
  nextAction: string;
  tone: "primary" | "scholar" | "danger";
};

export type ScholarReviewOperationalPlan = {
  title: string;
  statusLabel: string;
  escalationLabel: string;
  oldestReadyLabel: string;
  nextActionLabel: string;
  reviewerCadenceLabel: string;
  boundary: string;
  intakeGapCount: number;
  highCareReadyCount: number;
  staleReadyCount: number;
  reviewedEvidenceCount: number;
  lanes: ScholarReviewOperationalLane[];
};

export type ScholarReviewOpsPassportLane = {
  id:
    | "packet_triage"
    | "reviewer_evidence"
    | "source_pack_activation"
    | "final_release_gate";
  label: string;
  statusLabel: string;
  ownerLabel: string;
  actionLabel: string;
  proofCommandLabel: string;
  boundaryLabel: string;
  tone: "primary" | "scholar" | "danger";
};

export type ScholarReviewOpsPassport = {
  title: string;
  statusLabel: string;
  summary: string;
  queueProgressLabel: string;
  sourcePackProgressLabel: string;
  nextOwnerLabel: string;
  nextProofCommandLabel: string;
  noFatwaBoundaryLabel: string;
  noSecretBoundaryLabel: string;
  shareLabel: string;
  lanes: ScholarReviewOpsPassportLane[];
};

export type ScholarReviewEvidenceAcceptanceItem = {
  id:
    | "reviewer_identity"
    | "reviewer_qualification"
    | "review_decision"
    | "review_scope"
    | "review_notes"
    | "source_boundary"
    | "non_fatwa_boundary";
  label: string;
  detail: string;
  complete: boolean;
  tone: "primary" | "scholar" | "danger";
};

export type ScholarReviewPacketPrivacyReceiptItem = {
  id:
    | "question_shared"
    | "summary_shared"
    | "sources_shared"
    | "private_notes_excluded"
    | "non_fatwa_boundary";
  label: string;
  detail: string;
  complete: boolean;
  tone: "primary" | "scholar" | "danger";
};

export type ScholarReviewPacketLifecycleReceiptItem = {
  id: "created" | "intake" | "handoff" | "review_evidence";
  label: string;
  detail: string;
  evidenceLabel: string;
  complete: boolean;
  tone: "primary" | "scholar" | "danger";
};

export type ScholarReviewPacketAssuranceItem = {
  id:
    | "priority"
    | "readiness"
    | "source_boundary"
    | "share_boundary"
    | "evidence";
  label: string;
  evidenceLabel: string;
  boundaryLabel: string;
  complete: boolean;
  tone: "primary" | "scholar" | "danger";
};

export type ScholarReviewPacketAssuranceContract = {
  title: string;
  statusLabel: string;
  nextActionLabel: string;
  boundaryLabel: string;
  items: ScholarReviewPacketAssuranceItem[];
};

export type SensitiveScholarReviewDomain = {
  id:
    | "family"
    | "worship"
    | "finance"
    | "health_safety"
    | "halal_haram"
    | "source_limited";
  label: string;
  contextPrompt: string;
};

export type SensitiveScholarReviewRoute = {
  needsReview: boolean;
  riskLabel: string;
  routeLabel: string;
  boundaryLabel: string;
  sourceAction: string;
  matchedDomains: SensitiveScholarReviewDomain[];
  reasons: string[];
  contextNeeded: string[];
};

const MISSING_QUESTION_SIGNALS = [
  "question not captured",
  "original question not captured",
  "add the exact wording",
];

const SOURCE_PACK_FINAL_READINESS_COMMAND =
  "npm run check:source-pack-final-readiness -- --summary-json --tafsir-file /absolute/path/to/real-tafsir-source-review-evidence.json --hadith-file /absolute/path/to/real-hadith-source-review-evidence.json --fiqh-file /absolute/path/to/real-fiqh-source-review-evidence.json --seerah-file /absolute/path/to/real-seerah-source-review-evidence.json";

const SENSITIVE_REVIEW_DOMAINS: (SensitiveScholarReviewDomain & {
  pattern: RegExp;
})[] = [
  {
    id: "family",
    label: "Family ruling",
    contextPrompt:
      "Exact relationship facts, dates, prior statements, local context, and whether a trusted local scholar is already involved",
    pattern:
      /\b(divorce|talaq|khula|marriage|nikah|custody|inheritance|will|mahr|iddah|family)\b/i,
  },
  {
    id: "worship",
    label: "Worship details",
    contextPrompt:
      "Madhhab or scholar preference, timing, travel details, missed acts, and exact worship scenario",
    pattern:
      /\b(zakat|salah|prayer|wudu|ghusl|fasting|ramadan|travel prayer|qasr|jam'?|menstruation|haidh|hayd|nifas|istihadha|purification)\b/i,
  },
  {
    id: "finance",
    label: "Finance decision",
    contextPrompt:
      "Contract terms, amounts, parties, jurisdiction, product details, and any existing scholar review",
    pattern:
      /\b(riba|interest|mortgage|loan|crypto|cryptocurrency|staking|insurance|halal income|haram income|investment|finance)\b/i,
  },
  {
    id: "health_safety",
    label: "Health or safety",
    contextPrompt:
      "Whether there is urgent harm, medical advice, safeguarding risk, and local emergency support",
    pattern:
      /\b(medical|mental health|depression|suicide|self[-\s]?harm|abuse|domestic violence|emergency|addiction|bleeding|safety)\b/i,
  },
  {
    id: "halal_haram",
    label: "Halal/haram claim",
    contextPrompt:
      "Exact item or action, ingredients or contract terms, school followed, and source evidence requested",
    pattern:
      /\b(fatwa|ruling|halal|haram|permissible|impermissible|allowed|forbidden)\b/i,
  },
];

function clampText(value: unknown, fallback: string, maxLength: number) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  const resolved = text || fallback;
  return resolved.length > maxLength
    ? `${resolved.slice(0, maxLength - 3).trim()}...`
    : resolved;
}

function normalizeList(values: unknown[], fallback: string[]) {
  const cleaned = values
    .map((value) => clampText(value, "", 180))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned.slice(0, 8) : fallback;
}

function uniqueList(values: string[], fallback: string[]) {
  const cleaned = values
    .map((value) => clampText(value, "", 220))
    .filter(Boolean);
  const unique = Array.from(new Set(cleaned));
  return unique.length > 0 ? unique.slice(0, 8) : fallback;
}

function packetId() {
  return `scholar_packet_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function buildSensitiveScholarReviewRoute(params: {
  question?: string;
  answer?: string;
  featureLabel?: string;
  warning?: string;
  warnings?: string[];
  sourceCoverage?: string;
  hasSourceCard?: boolean;
  needsScholar?: boolean;
}): SensitiveScholarReviewRoute {
  const contextText = [
    params.question,
    params.featureLabel,
    params.answer,
    params.warning,
    ...(params.warnings || []),
  ]
    .filter(Boolean)
    .join("\n");
  const matchedDomains = SENSITIVE_REVIEW_DOMAINS.filter((domain) =>
    domain.pattern.test(contextText),
  ).map(({ pattern: _pattern, ...domain }) => domain);
  const hasSourceGap =
    params.sourceCoverage === "needs_source_review" || !params.hasSourceCard;
  const needsReview =
    Boolean(params.needsScholar) ||
    params.sourceCoverage === "needs_source_review" ||
    matchedDomains.length > 0;
  const domains = hasSourceGap
    ? [
        ...matchedDomains,
        {
          id: "source_limited" as const,
          label: "Source boundary",
          contextPrompt:
            "Which source cards are attached, which claims are only general explanation, and which evidence is still missing",
        },
      ]
    : matchedDomains;
  const reasons = uniqueList(
    [
      params.needsScholar ? "NurAI flagged this for qualified review." : "",
      params.sourceCoverage === "needs_source_review"
        ? "Source coverage needs review before stronger claims are reused."
        : "",
      !params.hasSourceCard
        ? "No verified source card is attached to the answer."
        : "",
      ...matchedDomains.map(
        (domain) =>
          `${domain.label} language may affect a personal ruling or life decision.`,
      ),
    ],
    ["This answer needs careful review before being treated as guidance."],
  );
  const contextNeeded = uniqueList(
    [
      "Exact user question in the user's own words",
      ...domains.map((domain) => domain.contextPrompt),
      "Madhhab, scholar preference, and local context where relevant",
      "What should remain educational and not be treated as a final fatwa",
    ],
    [
      "Exact circumstances and relevant dates",
      "Madhhab or scholar preference",
      "Source cards or evidence still missing",
    ],
  );

  return {
    needsReview,
    riskLabel: needsReview
      ? matchedDomains.length > 0
        ? "Sensitive review route"
        : "Source review route"
      : "General learning route",
    routeLabel: needsReview
      ? "Route to scholar review packet"
      : "No scholar packet needed",
    boundaryLabel:
      "This route prepares a review packet only. It is not a final fatwa, personal ruling, or scholar approval.",
    sourceAction: params.hasSourceCard
      ? "Keep attached source cards visible and ask the reviewer to check any inference beyond them."
      : "Attach source cards or mark source gaps before relying on this answer.",
    matchedDomains: domains,
    reasons,
    contextNeeded,
  };
}

function normalizePacket(raw: any): SavedScholarReviewPacket | null {
  if (!raw || typeof raw !== "object") return null;
  const id = clampText(raw.id, "", 120);
  const createdAt = clampText(raw.createdAt, "", 40);
  if (!id || !createdAt) return null;

  const status: ScholarReviewPacketStatus =
    raw.status === "ready_for_scholar" || raw.status === "reviewed"
      ? raw.status
      : "draft";

  return {
    id,
    createdAt,
    updatedAt: clampText(raw.updatedAt, createdAt, 40),
    status,
    title: clampText(raw.title, "Scholar review packet", 120),
    featureLabel: clampText(raw.featureLabel, "NurAI answer", 80),
    question: clampText(
      raw.question,
      "Question not captured. Add the exact wording before sharing.",
      600,
    ),
    answerSummary: clampText(
      raw.answerSummary,
      "Answer summary not captured.",
      900,
    ),
    reasons: normalizeList(raw.reasons || [], [
      "This answer needs careful review before being treated as guidance.",
    ]),
    contextNeeded: normalizeList(raw.contextNeeded || [], [
      "Exact circumstances and relevant dates",
      "Madhhab or scholar preference",
      "Source cards or evidence still missing",
    ]),
    sourceStatus: clampText(
      raw.sourceStatus,
      "Source coverage needs review.",
      240,
    ),
    sourceRefs: normalizeList(raw.sourceRefs || [], []),
    sourceCoverage: raw.sourceCoverage
      ? clampText(raw.sourceCoverage, "", 80)
      : undefined,
    warning: raw.warning ? clampText(raw.warning, "", 260) : undefined,
    needsScholar: Boolean(raw.needsScholar),
    reviewPrompt: clampText(
      raw.reviewPrompt,
      "Review this answer, source coverage, missing context, and whether it can be shared as educational guidance.",
      900,
    ),
    reviewerName: raw.reviewerName
      ? clampText(raw.reviewerName, "", 120)
      : undefined,
    reviewerQualification: raw.reviewerQualification
      ? clampText(raw.reviewerQualification, "", 180)
      : undefined,
    reviewedAt: raw.reviewedAt ? clampText(raw.reviewedAt, "", 40) : undefined,
    reviewerNotes: raw.reviewerNotes
      ? clampText(raw.reviewerNotes, "", 700)
      : undefined,
    reviewScope: raw.reviewScope
      ? clampText(raw.reviewScope, "", 260)
      : undefined,
    reviewDecision:
      raw.reviewDecision === "approved_educational" ||
      raw.reviewDecision === "needs_more_context" ||
      raw.reviewDecision === "refer_local_scholar"
        ? raw.reviewDecision
        : undefined,
  };
}

async function writePackets(packets: SavedScholarReviewPacket[]) {
  await AsyncStorage.setItem(
    SCHOLAR_REVIEW_PACKETS_KEY,
    JSON.stringify(packets),
  );
}

export async function listScholarReviewPackets(): Promise<
  SavedScholarReviewPacket[]
> {
  const raw = await AsyncStorage.getItem(SCHOLAR_REVIEW_PACKETS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizePacket)
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = new Date(a!.createdAt).getTime();
        const bTime = new Date(b!.createdAt).getTime();
        return bTime - aTime;
      }) as SavedScholarReviewPacket[];
  } catch {
    return [];
  }
}

export async function saveScholarReviewPacket(
  input: ScholarReviewPacketInput,
): Promise<SavedScholarReviewPacket> {
  const now = new Date().toISOString();
  const packet: SavedScholarReviewPacket = {
    id: packetId(),
    createdAt: now,
    updatedAt: now,
    status: input.status || "draft",
    title: clampText(input.title, "Scholar review packet", 120),
    featureLabel: clampText(input.featureLabel, "NurAI answer", 80),
    question: clampText(
      input.question,
      "Question not captured. Add the exact wording before sharing.",
      600,
    ),
    answerSummary: clampText(input.answerSummary, "Answer summary", 900),
    reasons: normalizeList(input.reasons || [], [
      "This answer needs careful review before being treated as guidance.",
    ]),
    contextNeeded: normalizeList(input.contextNeeded || [], [
      "Exact circumstances and relevant dates",
      "Madhhab or scholar preference",
      "Source cards or evidence still missing",
    ]),
    sourceStatus: clampText(
      input.sourceStatus,
      "Source coverage needs review.",
      240,
    ),
    sourceRefs: normalizeList(input.sourceRefs || [], []),
    sourceCoverage: input.sourceCoverage
      ? clampText(input.sourceCoverage, "", 80)
      : undefined,
    warning: input.warning ? clampText(input.warning, "", 260) : undefined,
    needsScholar: Boolean(input.needsScholar),
    reviewPrompt: clampText(
      input.reviewPrompt,
      "Review this answer, source coverage, missing context, and whether it can be shared as educational guidance.",
      900,
    ),
  };
  const existing = await listScholarReviewPackets();
  await writePackets([packet, ...existing].slice(0, 50));
  return packet;
}

export async function updateScholarReviewPacketStatus(
  id: string,
  status: ScholarReviewPacketStatus,
): Promise<SavedScholarReviewPacket[]> {
  const packets = await listScholarReviewPackets();
  const updated = packets.map((packet) =>
    packet.id === id
      ? { ...packet, status, updatedAt: new Date().toISOString() }
      : packet,
  );
  await writePackets(updated);
  return updated;
}

export async function recordScholarReviewPacketEvidence(
  id: string,
  evidence: {
    reviewerName: string;
    reviewerQualification?: string;
    reviewerNotes: string;
    reviewScope?: string;
    reviewDecision?: ScholarReviewDecision;
    reviewedAt?: string;
  },
): Promise<SavedScholarReviewPacket[]> {
  const packets = await listScholarReviewPackets();
  const now = new Date().toISOString();
  const targetPacket = packets.find((packet) => packet.id === id);
  if (!targetPacket) {
    throw new Error("Scholar review packet was not found.");
  }
  const completionIssues = scholarReviewPacketReviewCompletionIssues(
    targetPacket,
    {
      reviewerName: evidence.reviewerName,
      reviewerQualification: evidence.reviewerQualification || "",
      reviewerNotes: evidence.reviewerNotes,
      reviewScope: evidence.reviewScope || "",
      reviewDecision: evidence.reviewDecision,
    },
  );
  if (completionIssues.length > 0) {
    throw new Error(
      `Scholar review evidence is incomplete: ${completionIssues[0]}`,
    );
  }
  const updated = packets.map((packet) =>
    packet.id === id
      ? {
          ...packet,
          status: "reviewed" as const,
          updatedAt: now,
          reviewerName: clampText(evidence.reviewerName, "", 120),
          reviewerQualification: clampText(
            evidence.reviewerQualification,
            "",
            180,
          ),
          reviewerNotes: clampText(evidence.reviewerNotes, "", 700),
          reviewScope: clampText(
            evidence.reviewScope,
            "Question, source coverage, missing context, and educational boundary reviewed.",
            260,
          ),
          reviewDecision: evidence.reviewDecision || "needs_more_context",
          reviewedAt: clampText(evidence.reviewedAt, now, 40),
        }
      : packet,
  );
  await writePackets(updated);
  return updated;
}

export async function deleteScholarReviewPacket(
  id: string,
): Promise<SavedScholarReviewPacket[]> {
  const packets = await listScholarReviewPackets();
  const updated = packets.filter((packet) => packet.id !== id);
  await writePackets(updated);
  return updated;
}

export function summarizeScholarReviewPackets(
  packets: SavedScholarReviewPacket[],
): ScholarReviewPacketSummary {
  const summary = packets.reduce(
    (summary, packet) => {
      summary.total += 1;
      if (packet.status === "ready_for_scholar") summary.readyForScholar += 1;
      else if (packet.status === "reviewed") summary.reviewed += 1;
      else summary.draft += 1;
      if (scholarReviewPacketReadinessIssues(packet).length > 0) {
        summary.needsIntake += 1;
      }
      if (isHighCareScholarReviewPacket(packet)) {
        summary.highCare += 1;
      }
      if (packet.status === "ready_for_scholar") {
        const ageDays = Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(packet.updatedAt).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        if (Number.isFinite(ageDays)) {
          summary.oldestReadyAgeDays = Math.max(
            summary.oldestReadyAgeDays,
            ageDays,
          );
        }
      }
      return summary;
    },
    {
      total: 0,
      draft: 0,
      readyForScholar: 0,
      reviewed: 0,
      needsIntake: 0,
      highCare: 0,
      oldestReadyAgeDays: 0,
      nextHandoffLabel: "No packets waiting",
    },
  );
  summary.nextHandoffLabel =
    summary.needsIntake > 0
      ? "Finish packet intake"
      : summary.readyForScholar > 0
        ? "Send to qualified reviewer"
        : summary.reviewed > 0
          ? "Review evidence recorded"
          : "No packets waiting";
  return summary;
}

export async function getScholarReviewPacketSummary() {
  return summarizeScholarReviewPackets(await listScholarReviewPackets());
}

function daysSince(value: string, now: Date) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(
    0,
    Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60 * 24)),
  );
}

export function buildScholarReviewOperationalPlan(
  packets: SavedScholarReviewPacket[],
  now = new Date(),
): ScholarReviewOperationalPlan {
  const readyPackets = packets.filter(
    (packet) => packet.status === "ready_for_scholar",
  );
  const intakeGapPackets = packets.filter(
    (packet) => scholarReviewPacketReadinessIssues(packet).length > 0,
  );
  const highCareReadyPackets = readyPackets.filter(
    isHighCareScholarReviewPacket,
  );
  const staleReadyPackets = readyPackets.filter(
    (packet) => daysSince(packet.updatedAt, now) >= 3,
  );
  const reviewedEvidencePackets = packets.filter(
    (packet) => packet.status === "reviewed",
  );
  const oldestReadyAge = readyPackets.reduce(
    (oldest, packet) => Math.max(oldest, daysSince(packet.updatedAt, now)),
    0,
  );
  const statusLabel =
    staleReadyPackets.length > 0
      ? "Escalate overdue review packets"
      : intakeGapPackets.length > 0
        ? "Close intake gaps before handoff"
        : highCareReadyPackets.length > 0
          ? "High-care packets ready"
          : readyPackets.length > 0
            ? "Ready for qualified review"
            : reviewedEvidencePackets.length > 0
              ? "Review evidence recorded"
              : "No active review packets";
  const nextActionLabel =
    staleReadyPackets.length > 0
      ? "Contact the reviewer or owner today and keep the non-fatwa boundary visible."
      : intakeGapPackets.length > 0
        ? "Complete exact question, source status, missing context, and reviewer prompt."
        : highCareReadyPackets.length > 0
          ? "Send high-care packets to a qualified reviewer first."
          : readyPackets.length > 0
            ? "Share ready packets with source status and context gaps."
            : "Create a packet when a sensitive or source-limited answer appears.";

  return {
    title: "Scholar review operations",
    statusLabel,
    escalationLabel:
      staleReadyPackets.length > 0
        ? `${staleReadyPackets.length} packet(s) need 72-hour escalation.`
        : "No packets are past the 72-hour ready handoff window.",
    oldestReadyLabel:
      readyPackets.length > 0
        ? `Oldest ready packet: ${oldestReadyAge} day(s).`
        : "No ready packets waiting.",
    nextActionLabel,
    reviewerCadenceLabel:
      "Check high-care packets daily; review ordinary educational packets weekly.",
    boundary:
      "Operational status is not scholar approval. Packets remain educational until real reviewer evidence is recorded.",
    intakeGapCount: intakeGapPackets.length,
    highCareReadyCount: highCareReadyPackets.length,
    staleReadyCount: staleReadyPackets.length,
    reviewedEvidenceCount: reviewedEvidencePackets.length,
    lanes: [
      {
        id: "intake",
        label: "Intake gaps",
        count: intakeGapPackets.length,
        detail:
          "Packets missing exact question, context, source status, or prompt.",
        nextAction: "Complete packet intake before sharing.",
        tone: intakeGapPackets.length > 0 ? "danger" : "primary",
      },
      {
        id: "high_care",
        label: "High-care ready",
        count: highCareReadyPackets.length,
        detail: "Sensitive packets already marked ready for qualified review.",
        nextAction: "Send these before ordinary educational packets.",
        tone: highCareReadyPackets.length > 0 ? "scholar" : "primary",
      },
      {
        id: "ready_queue",
        label: "72-hour handoff",
        count: staleReadyPackets.length,
        detail: "Ready packets waiting three or more days.",
        nextAction: "Escalate or record why review is delayed.",
        tone: staleReadyPackets.length > 0 ? "danger" : "primary",
      },
      {
        id: "evidence",
        label: "Evidence saved",
        count: reviewedEvidencePackets.length,
        detail: "Packets with reviewer name, scope, and notes recorded.",
        nextAction: "Keep evidence attached for user trust.",
        tone: "primary",
      },
    ],
  };
}

export function buildScholarReviewOpsPassport(params: {
  packets: SavedScholarReviewPacket[];
  operationalPlan?: ScholarReviewOperationalPlan;
  sourceTriage?: ScholarReviewPacketSourceTriageItem[];
}): ScholarReviewOpsPassport {
  const summary = summarizeScholarReviewPackets(params.packets);
  const operationalPlan =
    params.operationalPlan || buildScholarReviewOperationalPlan(params.packets);
  const sourceTriage =
    params.sourceTriage || buildScholarReviewPacketSourceTriage(params.packets);
  const missingSourceCount =
    sourceTriage.find((item) => item.id === "missing_sources")?.count || 0;
  const limitedSourceCount =
    sourceTriage.find((item) => item.id === "limited_coverage")?.count || 0;
  const allPacketsReviewed =
    summary.total > 0 && summary.reviewed === summary.total;

  return {
    title: "Scholar review ops passport",
    statusLabel: allPacketsReviewed
      ? "Queue evidence recorded; source packs still need activation proof"
      : "Review proof still blocks stronger AI trust claims",
    summary:
      "One owner-facing checkpoint for sensitive-answer packets, reviewer evidence, source review, and final release checks.",
    queueProgressLabel: `${summary.reviewed}/${summary.total} packets have reviewer evidence; ${summary.readyForScholar} ready, ${summary.needsIntake} intake gap(s), ${summary.highCare} high-care packet(s).`,
    sourcePackProgressLabel:
      "AI source packs: 4 domains, 32 draft cards, 0 verified cards, 0 activation-ready domains.",
    nextOwnerLabel:
      operationalPlan.intakeGapCount > 0
        ? "Packet intake owner"
        : summary.readyForScholar > 0
          ? "Qualified reviewer"
          : "Source-pack reviewers",
    nextProofCommandLabel: SOURCE_PACK_FINAL_READINESS_COMMAND,
    noFatwaBoundaryLabel:
      "This passport coordinates review work only. It is not scholar approval, not a final fatwa, not a personal ruling, and not permission to remove source or context limits.",
    noSecretBoundaryLabel:
      "Share without API keys, auth headers, cookies, database URLs, reviewer private contact details, private notes, chat transcripts, licensed private text, or private keys.",
    shareLabel: "Share review passport",
    lanes: [
      {
        id: "packet_triage",
        label: "Packet triage",
        statusLabel: `${summary.needsIntake} intake gap(s), ${summary.highCare} high-care packet(s)`,
        ownerLabel: "NurAI review operator",
        actionLabel: operationalPlan.nextActionLabel,
        proofCommandLabel: "npm run check:scholar-review-workflow",
        boundaryLabel:
          "Queue status is operational metadata; it does not prove a reviewer approved any answer.",
        tone: summary.needsIntake > 0 ? "danger" : "primary",
      },
      {
        id: "reviewer_evidence",
        label: "Reviewer evidence",
        statusLabel: `${summary.reviewed}/${summary.total} packet(s) reviewed`,
        ownerLabel: "Qualified reviewer",
        actionLabel:
          summary.readyForScholar > 0
            ? "Record reviewer name, qualification, decision, scope, notes, source boundary, and non-fatwa boundary."
            : "Create or mark packets ready before recording reviewer evidence.",
        proofCommandLabel:
          "Open Scholar Review and save evidence only after the acceptance checklist passes.",
        boundaryLabel:
          "Reviewer evidence applies only to the exact packet and recorded scope.",
        tone:
          summary.total > 0 && summary.reviewed === summary.total
            ? "primary"
            : "scholar",
      },
      {
        id: "source_pack_activation",
        label: "AI source packs",
        statusLabel: `32 draft cards blocked; ${missingSourceCount} packet(s) missing source cards, ${limitedSourceCount} limited-source packet(s)`,
        ownerLabel: "Tafsir, Hadith, Fiqh, and Seerah source reviewers",
        actionLabel:
          "Attach completed real evidence files for every draft source card, validate with --require-approved, inspect dry-runs, then run final readiness.",
        proofCommandLabel: SOURCE_PACK_FINAL_READINESS_COMMAND,
        boundaryLabel:
          "Draft source packs are inactive handoff material until final readiness passes on real evidence.",
        tone: "scholar",
      },
      {
        id: "final_release_gate",
        label: "Final release check",
        statusLabel:
          "Runtime, database, source-pack, and human-review proof stay separate",
        ownerLabel: "Release owner",
        actionLabel:
          "After reviewer/source-pack evidence passes, rerun AI trust and goal-completion checks without treating this passport as proof.",
        proofCommandLabel:
          "npm run check:logical-slice -- ai-trust --summary-json --continue-on-failure",
        boundaryLabel:
          "Passing local AI trust checks is not deployed runtime proof, production database proof, source-pack activation proof, or App Store release approval.",
        tone: "danger",
      },
    ],
  };
}

export function buildScholarReviewOpsPassportShareText(
  passport: ScholarReviewOpsPassport,
): string {
  return [
    "NurAI Scholar review ops passport",
    "",
    `Status: ${passport.statusLabel}`,
    passport.summary,
    `Queue: ${passport.queueProgressLabel}`,
    `Source packs: ${passport.sourcePackProgressLabel}`,
    `Next owner: ${passport.nextOwnerLabel}`,
    `Next proof command: ${passport.nextProofCommandLabel}`,
    "",
    "Owner lanes:",
    ...passport.lanes.flatMap((lane) => [
      `- ${lane.label}: ${lane.statusLabel}`,
      `  Owner: ${lane.ownerLabel}`,
      `  Action: ${lane.actionLabel}`,
      `  Proof: ${lane.proofCommandLabel}`,
      `  Boundary: ${lane.boundaryLabel}`,
    ]),
    "",
    `No-fatwa boundary: ${passport.noFatwaBoundaryLabel}`,
    `No-secret boundary: ${passport.noSecretBoundaryLabel}`,
    "",
    "Guardrail: this review passport coordinates work only; it is not approval evidence, source-pack activation evidence, production deployment proof, or database proof.",
  ].join("\n");
}

export function scholarReviewPacketReadinessIssues(
  packet: SavedScholarReviewPacket,
): string[] {
  const issues: string[] = [];
  const question = packet.question.trim().toLowerCase();

  if (
    !packet.question.trim() ||
    MISSING_QUESTION_SIGNALS.some((signal) => question.includes(signal))
  ) {
    issues.push("Add the exact user question before sharing.");
  }
  if (!packet.answerSummary.trim()) {
    issues.push("Add a concise answer summary.");
  }
  if (packet.reasons.length === 0) {
    issues.push("Add why this needs qualified review.");
  }
  if (packet.contextNeeded.length < 2) {
    issues.push("List the missing context a reviewer needs.");
  }
  if (!packet.sourceStatus.trim()) {
    issues.push("Explain whether sources are attached or missing.");
  }
  if (!packet.reviewPrompt.trim()) {
    issues.push("Add a reviewer prompt.");
  }

  return issues;
}

export function isHighCareScholarReviewPacket(
  packet: SavedScholarReviewPacket,
) {
  const text = [
    packet.title,
    packet.featureLabel,
    packet.question,
    packet.warning,
    packet.reasons.join(" "),
    packet.contextNeeded.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    packet.needsScholar ||
    /\b(fatwa|ruling|divorce|marriage|inheritance|finance|zakat|worship|family|halal|haram|medical|safety)\b/.test(
      text,
    )
  );
}

export function scholarReviewPacketEvidenceIssues(evidence: {
  reviewerName: string;
  reviewerQualification?: string;
  reviewerNotes: string;
  reviewScope: string;
  reviewDecision?: ScholarReviewDecision;
}): string[] {
  const issues: string[] = [];
  if (evidence.reviewerName.trim().length < 2) {
    issues.push("Add the reviewer or scholar name.");
  }
  if (String(evidence.reviewerQualification || "").trim().length < 8) {
    issues.push("Add the reviewer qualification or role.");
  }
  if (evidence.reviewScope.trim().length < 20) {
    issues.push("Describe what was reviewed.");
  }
  if (evidence.reviewerNotes.trim().length < 24) {
    issues.push("Add review notes before marking this packet reviewed.");
  }
  if (!evidence.reviewDecision) {
    issues.push("Choose a review decision before saving evidence.");
  }
  return issues;
}

export function scholarReviewPacketReviewCompletionIssues(
  packet: SavedScholarReviewPacket,
  evidence: {
    reviewerName: string;
    reviewerQualification?: string;
    reviewerNotes: string;
    reviewScope: string;
    reviewDecision?: ScholarReviewDecision;
  },
): string[] {
  const fieldIssues = scholarReviewPacketEvidenceIssues(evidence);
  const acceptanceIssues = buildScholarReviewEvidenceAcceptanceChecklist(
    packet,
    evidence,
  )
    .filter((item) => !item.complete)
    .map((item) => item.detail);
  return Array.from(new Set([...fieldIssues, ...acceptanceIssues]));
}

export function buildScholarReviewEvidenceAcceptanceChecklist(
  packet: SavedScholarReviewPacket,
  evidence: {
    reviewerName: string;
    reviewerQualification?: string;
    reviewerNotes: string;
    reviewScope: string;
    reviewDecision?: ScholarReviewDecision;
  },
): ScholarReviewEvidenceAcceptanceItem[] {
  const scopeText = evidence.reviewScope.trim();
  const notesText = evidence.reviewerNotes.trim();
  const sourceText = [
    packet.sourceStatus,
    packet.sourceCoverage,
    packet.sourceRefs.join(" "),
    scopeText,
    notesText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const boundaryText = [
    packet.warning,
    packet.reviewPrompt,
    scopeText,
    notesText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const reviewerReady = evidence.reviewerName.trim().length >= 2;
  const qualificationText = String(evidence.reviewerQualification || "").trim();
  const qualificationReady =
    qualificationText.length >= 8 &&
    /\b(scholar|imam|mufti|teacher|ustadh|ustadha|shaykh|sheikh|student|reviewer|qualified|graduate|instructor|chaplain)\b/i.test(
      qualificationText,
    );
  const decisionReady = Boolean(evidence.reviewDecision);
  const scopeReady =
    scopeText.length >= 20 &&
    /\b(question|source|context|boundary|review|scope)\b/i.test(scopeText);
  const notesReady = notesText.length >= 24;
  const sourceBoundaryReady =
    Boolean(packet.sourceStatus.trim()) &&
    (packet.sourceRefs.length > 0 ||
      /\b(source gap|missing source|needs review|limited|coverage needs|none attached|not enough source|source coverage)\b/.test(
        sourceText,
      ));
  const nonFatwaReady =
    /\b(educational|not a final fatwa|not final|qualified|personal ruling|review only|not a ruling)\b/.test(
      boundaryText,
    ) || isHighCareScholarReviewPacket(packet);

  return [
    {
      id: "reviewer_identity",
      label: "Reviewer identity",
      detail: reviewerReady
        ? "Reviewer or scholar name is recorded."
        : "Name the reviewer or scholar before saving evidence.",
      complete: reviewerReady,
      tone: reviewerReady ? "primary" : "danger",
    },
    {
      id: "reviewer_qualification",
      label: "Reviewer qualification",
      detail: qualificationReady
        ? "Reviewer role or qualification is recorded."
        : "State the reviewer qualification, role, or scholarly review capacity.",
      complete: qualificationReady,
      tone: qualificationReady ? "primary" : "danger",
    },
    {
      id: "review_decision",
      label: "Review decision",
      detail: decisionReady
        ? "Packet has a clear review decision."
        : "Choose whether this is educationally approved, needs more context, or should be referred locally.",
      complete: decisionReady,
      tone: decisionReady ? "primary" : "danger",
    },
    {
      id: "review_scope",
      label: "Review scope",
      detail: scopeReady
        ? "Scope names what was checked."
        : "Scope should mention the question, sources, context, or boundary reviewed.",
      complete: scopeReady,
      tone: scopeReady ? "primary" : "scholar",
    },
    {
      id: "review_notes",
      label: "Review notes",
      detail: notesReady
        ? "Notes are specific enough for user trust."
        : "Add concrete notes, caveats, or next steps.",
      complete: notesReady,
      tone: notesReady ? "primary" : "danger",
    },
    {
      id: "source_boundary",
      label: "Source boundary",
      detail: sourceBoundaryReady
        ? "Attached sources or source gaps are preserved."
        : "State whether sources are attached, limited, missing, or need review.",
      complete: sourceBoundaryReady,
      tone: sourceBoundaryReady ? "primary" : "scholar",
    },
    {
      id: "non_fatwa_boundary",
      label: "Non-fatwa boundary",
      detail: nonFatwaReady
        ? "Evidence keeps the educational, non-final-ruling boundary visible."
        : "State that this is educational review, not a final fatwa or personal ruling.",
      complete: nonFatwaReady,
      tone: nonFatwaReady ? "primary" : "danger",
    },
  ];
}

export function buildScholarReviewPacketHandoffChecklist(
  packet: SavedScholarReviewPacket,
): ScholarReviewPacketHandoffItem[] {
  const readinessIssues = scholarReviewPacketReadinessIssues(packet);
  const questionReady = !readinessIssues.includes(
    "Add the exact user question before sharing.",
  );
  const sourceReady = Boolean(packet.sourceStatus.trim());
  const contextReady = packet.contextNeeded.length >= 2;
  const promptReady = Boolean(packet.reviewPrompt.trim());
  const boundaryText = [
    packet.warning,
    packet.reviewPrompt,
    packet.sourceStatus,
  ]
    .filter(Boolean)
    .join(" ");
  const boundaryReady =
    /\b(educational|not a final fatwa|qualified|review)\b/i.test(
      boundaryText,
    ) || isHighCareScholarReviewPacket(packet);

  return [
    {
      id: "exact_question",
      label: "Exact question",
      detail: questionReady
        ? "Original wording is captured for the reviewer."
        : "Add the user's exact wording before sharing.",
      complete: questionReady,
      tone: questionReady ? "primary" : "danger",
    },
    {
      id: "source_status",
      label: "Source status",
      detail: sourceReady
        ? packet.sourceRefs.length > 0
          ? "Attached source cards are listed."
          : "Source gap is stated clearly."
        : "Explain which sources are attached or missing.",
      complete: sourceReady,
      tone: sourceReady ? "primary" : "scholar",
    },
    {
      id: "context_needed",
      label: "Context needed",
      detail: contextReady
        ? "Missing facts are listed for review."
        : "List at least two missing facts or circumstances.",
      complete: contextReady,
      tone: contextReady ? "primary" : "scholar",
    },
    {
      id: "reviewer_prompt",
      label: "Reviewer prompt",
      detail: promptReady
        ? "The reviewer has a clear review task."
        : "Add what the qualified reviewer should check.",
      complete: promptReady,
      tone: promptReady ? "primary" : "scholar",
    },
    {
      id: "non_fatwa_boundary",
      label: "Non-fatwa boundary",
      detail: boundaryReady
        ? "Educational boundary is visible before handoff."
        : "State that this is educational review, not a final fatwa.",
      complete: boundaryReady,
      tone: boundaryReady ? "primary" : "danger",
    },
  ];
}

export function buildScholarReviewPacketPrivacyReceipt(
  packet: SavedScholarReviewPacket,
): ScholarReviewPacketPrivacyReceiptItem[] {
  const readinessIssues = scholarReviewPacketReadinessIssues(packet);
  const questionReady = !readinessIssues.includes(
    "Add the exact user question before sharing.",
  );
  const summaryReady = packet.answerSummary.trim().length > 0;
  const sourceReady = Boolean(packet.sourceStatus.trim());
  const boundaryText = [
    packet.warning,
    packet.reviewPrompt,
    packet.sourceStatus,
    packet.answerSummary,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const boundaryReady =
    /\b(educational|not a final fatwa|not final|personal ruling|qualified review|review only)\b/.test(
      boundaryText,
    ) || isHighCareScholarReviewPacket(packet);

  return [
    {
      id: "question_shared",
      label: "Exact question shared",
      detail: questionReady
        ? "The reviewer receives the saved question wording."
        : "Add the exact question before any handoff.",
      complete: questionReady,
      tone: questionReady ? "primary" : "danger",
    },
    {
      id: "summary_shared",
      label: "Answer summary shared",
      detail: summaryReady
        ? "Only a concise NurAI answer summary is included."
        : "Add a summary so the reviewer does not infer the answer.",
      complete: summaryReady,
      tone: summaryReady ? "primary" : "danger",
    },
    {
      id: "sources_shared",
      label: "Source status shared",
      detail: sourceReady
        ? packet.sourceRefs.length > 0
          ? "Attached source references travel with the packet."
          : "The packet states that source references are missing or limited."
        : "State whether sources are attached, limited, or missing.",
      complete: sourceReady,
      tone: sourceReady ? "primary" : "scholar",
    },
    {
      id: "private_notes_excluded",
      label: "Private notes excluded",
      detail:
        "Journal text, Quran reflections, saved private notes, and account secrets are not included in the share text.",
      complete: true,
      tone: "primary",
    },
    {
      id: "non_fatwa_boundary",
      label: "Non-fatwa boundary visible",
      detail: boundaryReady
        ? "The packet keeps qualified review and educational-only language visible."
        : "Add explicit educational-only language before sharing.",
      complete: boundaryReady,
      tone: boundaryReady ? "primary" : "danger",
    },
  ];
}

export function buildScholarReviewPacketLifecycleReceipt(
  packet: SavedScholarReviewPacket,
): ScholarReviewPacketLifecycleReceiptItem[] {
  const readinessIssues = scholarReviewPacketReadinessIssues(packet);
  const evidenceIssues =
    packet.status === "reviewed"
      ? scholarReviewPacketEvidenceIssues({
          reviewerName: packet.reviewerName || "",
          reviewerQualification: packet.reviewerQualification || "",
          reviewerNotes: packet.reviewerNotes || "",
          reviewScope: packet.reviewScope || "",
          reviewDecision: packet.reviewDecision,
        })
      : ["Review evidence has not been recorded yet."];
  const createdReady = Boolean(packet.createdAt && packet.id);
  const intakeReady = readinessIssues.length === 0;
  const handoffReady =
    packet.status === "ready_for_scholar" || packet.status === "reviewed";
  const evidenceReady =
    packet.status === "reviewed" && evidenceIssues.length === 0;

  return [
    {
      id: "created",
      label: "Packet created",
      detail:
        "Question, summary, source status, and missing context are stored as a local review packet.",
      evidenceLabel: createdReady
        ? `Created ${packet.createdAt.slice(0, 10)}`
        : "Created date missing",
      complete: createdReady,
      tone: createdReady ? "primary" : "danger",
    },
    {
      id: "intake",
      label: "Intake complete",
      detail: intakeReady
        ? "Exact question, source status, missing context, and reviewer prompt are ready."
        : readinessIssues[0],
      evidenceLabel: intakeReady
        ? "Ready for handoff"
        : `${readinessIssues.length} intake gap(s)`,
      complete: intakeReady,
      tone: intakeReady ? "primary" : "danger",
    },
    {
      id: "handoff",
      label: "Qualified handoff",
      detail: handoffReady
        ? "Packet is marked ready or reviewed with educational boundaries still visible, without calling the packet approved early."
        : "Mark ready only after the intake checklist is complete.",
      evidenceLabel: STATUS_LABELS[packet.status],
      complete: handoffReady,
      tone: handoffReady ? "scholar" : "danger",
    },
    {
      id: "review_evidence",
      label: "Review evidence",
      detail: evidenceReady
        ? "Reviewer name, qualification, decision, scope, notes, source boundary, and non-fatwa boundary are recorded."
        : evidenceIssues[0],
      evidenceLabel: evidenceReady
        ? reviewDecisionSummary(packet.reviewDecision)
        : "Evidence pending",
      complete: evidenceReady,
      tone: evidenceReady ? "primary" : "scholar",
    },
  ];
}

export function buildScholarReviewPacketAssuranceContract(
  packet: SavedScholarReviewPacket,
): ScholarReviewPacketAssuranceContract {
  const readinessIssues = scholarReviewPacketReadinessIssues(packet);
  const priority = buildScholarReviewPacketPriority(packet);
  const handoffChecklist = buildScholarReviewPacketHandoffChecklist(packet);
  const privacyReceipt = buildScholarReviewPacketPrivacyReceipt(packet);
  const lifecycleReceipt = buildScholarReviewPacketLifecycleReceipt(packet);
  const intakeReady = readinessIssues.length === 0;
  const sourceReady = handoffChecklist.some(
    (item) => item.id === "source_status" && item.complete,
  );
  const shareBoundaryReady = privacyReceipt.every((item) => item.complete);
  const evidenceReady = lifecycleReceipt.some(
    (item) => item.id === "review_evidence" && item.complete,
  );
  const completeCount = [
    intakeReady,
    sourceReady,
    shareBoundaryReady,
    evidenceReady,
  ].filter(Boolean).length;

  return {
    title: "Packet assurance contract",
    statusLabel:
      packet.status === "reviewed"
        ? "Review evidence attached"
        : intakeReady
          ? `${completeCount}/4 assurance checks ready`
          : `${readinessIssues.length} intake gap(s) before handoff`,
    nextActionLabel:
      packet.status === "reviewed"
        ? "Keep reviewer evidence attached"
        : priority.nextAction,
    boundaryLabel:
      "Assurance confirms packet handling only; it is not scholar approval, a final fatwa, or permission to remove source and context limits.",
    items: [
      {
        id: "priority",
        label: "Priority",
        evidenceLabel: priority.label,
        boundaryLabel: priority.reason,
        complete: priority.tone !== "danger",
        tone: priority.tone,
      },
      {
        id: "readiness",
        label: "Intake readiness",
        evidenceLabel: intakeReady
          ? "Exact question, context, source status, and prompt ready"
          : readinessIssues[0],
        boundaryLabel:
          "Do not share until the exact question, missing context, and reviewer prompt are visible.",
        complete: intakeReady,
        tone: intakeReady ? "primary" : "danger",
      },
      {
        id: "source_boundary",
        label: "Source boundary",
        evidenceLabel: sourceReady
          ? packet.sourceRefs.length > 0
            ? `${packet.sourceRefs.length} source reference(s) listed`
            : "Source gap stated"
          : "Source status still unclear",
        boundaryLabel:
          "Reviewer must see whether sources are attached, limited, missing, or need review.",
        complete: sourceReady,
        tone: sourceReady ? "primary" : "scholar",
      },
      {
        id: "share_boundary",
        label: "Share boundary",
        evidenceLabel: shareBoundaryReady
          ? "Privacy receipt complete"
          : "Share receipt has gaps",
        boundaryLabel:
          "Private notes, Quran reflections, saved answers, account data, and secrets stay out of the handoff.",
        complete: shareBoundaryReady,
        tone: shareBoundaryReady ? "primary" : "danger",
      },
      {
        id: "evidence",
        label: "Review evidence",
        evidenceLabel: evidenceReady
          ? reviewDecisionSummary(packet.reviewDecision)
          : "Reviewer evidence pending",
        boundaryLabel:
          "Reviewer name, qualification, decision, scope, and notes are required before calling this reviewed.",
        complete: evidenceReady,
        tone: evidenceReady ? "primary" : "scholar",
      },
    ],
  };
}

export function buildScholarReviewPacketPriority(
  packet: SavedScholarReviewPacket,
): ScholarReviewPacketPriority {
  const readinessIssues = scholarReviewPacketReadinessIssues(packet);
  if (packet.status === "reviewed") {
    return {
      label: "Evidence recorded",
      tone: "primary",
      nextAction: "Keep reviewer notes attached to the packet.",
      reason: "A reviewer name, scope, and notes are saved.",
    };
  }
  if (readinessIssues.length > 0) {
    return {
      label: "Intake needed",
      tone: "danger",
      nextAction: readinessIssues[0],
      reason: "The packet is not ready to share until intake gaps are closed.",
    };
  }
  if (isHighCareScholarReviewPacket(packet)) {
    return {
      label: "High-care handoff",
      tone: "scholar",
      nextAction:
        "Share with a qualified reviewer before treating as guidance.",
      reason: "Sensitive religious or personal risk terms are present.",
    };
  }
  if (packet.status === "ready_for_scholar") {
    return {
      label: "Ready for scholar",
      tone: "scholar",
      nextAction: "Share the packet with source status and context gaps.",
      reason: "Core intake fields are complete.",
    };
  }
  return {
    label: "Ready to mark",
    tone: "primary",
    nextAction: "Mark ready when you want to send it for review.",
    reason: "The handoff checklist is complete.",
  };
}

function nextPacketSortWeight(packet: SavedScholarReviewPacket) {
  const readinessIssues = scholarReviewPacketReadinessIssues(packet);
  if (readinessIssues.length > 0) return 0;
  if (
    packet.status === "ready_for_scholar" &&
    isHighCareScholarReviewPacket(packet)
  ) {
    return 1;
  }
  if (packet.status === "ready_for_scholar") return 2;
  if (isHighCareScholarReviewPacket(packet)) return 3;
  if (packet.status === "draft") return 4;
  return 5;
}

export function buildScholarReviewNextPacketHandoff(
  packets: SavedScholarReviewPacket[],
): ScholarReviewNextPacketHandoff {
  const nextPacket = [...packets].sort((a, b) => {
    const weightDelta = nextPacketSortWeight(a) - nextPacketSortWeight(b);
    if (weightDelta !== 0) return weightDelta;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  })[0];

  if (!nextPacket) {
    return {
      packetId: null,
      title: "No review packets waiting",
      statusLabel: "Queue clear",
      priorityLabel: "No handoff",
      nextAction:
        "When a sensitive or source-limited answer appears, save it as a review packet before relying on it.",
      reason: "There are no saved packets on this device.",
      sourceLabel: "No source handoff pending",
      boundary:
        "NurAI still treats sensitive answers as educational; this is not a final fatwa or personal ruling.",
      shareLabel: "Share queue status",
      tone: "primary",
    };
  }

  const priority = buildScholarReviewPacketPriority(nextPacket);
  const sourceLabel =
    nextPacket.sourceRefs.length > 0
      ? `${nextPacket.sourceRefs.length} source reference(s) attached`
      : "No source references attached yet";

  return {
    packetId: nextPacket.id,
    title: nextPacket.title,
    statusLabel: STATUS_LABELS[nextPacket.status],
    priorityLabel: priority.label,
    nextAction: priority.nextAction,
    reason: priority.reason,
    sourceLabel,
    boundary:
      "Handle this packet as educational review only; it is not a final fatwa or personal ruling.",
    shareLabel: "Share next packet",
    tone: priority.tone,
  };
}

const STATUS_LABELS: Record<ScholarReviewPacketStatus, string> = {
  draft: "Draft packet",
  ready_for_scholar: "Ready for scholar",
  reviewed: "Reviewed",
};

function reviewDecisionSummary(decision?: ScholarReviewDecision) {
  switch (decision) {
    case "approved_educational":
      return "Educational approval recorded";
    case "refer_local_scholar":
      return "Local scholar referral recorded";
    case "needs_more_context":
      return "More context requested";
    default:
      return "Decision recorded";
  }
}

export function buildScholarReviewNextPacketShareText(
  handoff: ScholarReviewNextPacketHandoff,
): string {
  return [
    "NurAI Scholar Review next packet",
    "",
    `Packet: ${handoff.title}`,
    `Status: ${handoff.statusLabel}`,
    `Priority: ${handoff.priorityLabel}`,
    `Next action: ${handoff.nextAction}`,
    `Why: ${handoff.reason}`,
    `Sources: ${handoff.sourceLabel}`,
    "",
    `Boundary: ${handoff.boundary}`,
  ].join("\n");
}

export function buildScholarReviewPacketSourceTriage(
  packets: SavedScholarReviewPacket[],
): ScholarReviewPacketSourceTriageItem[] {
  const triage: Record<
    ScholarReviewPacketSourceTriageItem["id"],
    ScholarReviewPacketSourceTriageItem
  > = {
    missing_sources: {
      id: "missing_sources",
      label: "Missing source cards",
      count: 0,
      detail:
        "Packets where the source gap is explicit or no references exist.",
      nextAction:
        "Attach source cards or state the exact source gap before handoff.",
      tone: "danger",
      packetIds: [],
    },
    cautious_warning: {
      id: "cautious_warning",
      label: "Cautious AI warning",
      count: 0,
      detail: "Packets carrying caution, uncertainty, or high-care warnings.",
      nextAction:
        "Keep the caution visible and ask the reviewer to confirm limits.",
      tone: "scholar",
      packetIds: [],
    },
    limited_coverage: {
      id: "limited_coverage",
      label: "Limited source coverage",
      count: 0,
      detail:
        "Packets with partial, limited, or source-review-needed coverage.",
      nextAction: "Ask the reviewer whether the available sources are enough.",
      tone: "scholar",
      packetIds: [],
    },
    ready_source_handoff: {
      id: "ready_source_handoff",
      label: "Ready source handoff",
      count: 0,
      detail: "Packets with attached source references and no source warning.",
      nextAction:
        "Share with the reviewer while preserving the educational boundary.",
      tone: "primary",
      packetIds: [],
    },
  };

  for (const packet of packets) {
    const sourceText = [
      packet.sourceStatus,
      packet.sourceCoverage,
      packet.warning,
      packet.reasons.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const hasSourceRefs = packet.sourceRefs.length > 0;
    const hasMissingSourceSignal =
      !hasSourceRefs ||
      /\b(no source|none attached|missing source|source gap|needs review|not enough source)\b/.test(
        sourceText,
      );
    const hasCautionSignal =
      Boolean(packet.warning) ||
      /\b(caution|uncertain|sensitive|high-care|not a final fatwa|qualified review)\b/.test(
        sourceText,
      );
    const hasLimitedCoverageSignal =
      /\b(partial|limited|thin|review needed|source-review|coverage needs)\b/.test(
        sourceText,
      );

    if (hasMissingSourceSignal) {
      triage.missing_sources.count += 1;
      triage.missing_sources.packetIds.push(packet.id);
    }
    if (hasCautionSignal) {
      triage.cautious_warning.count += 1;
      triage.cautious_warning.packetIds.push(packet.id);
    }
    if (hasLimitedCoverageSignal) {
      triage.limited_coverage.count += 1;
      triage.limited_coverage.packetIds.push(packet.id);
    }
    if (hasSourceRefs && !hasCautionSignal && !hasLimitedCoverageSignal) {
      triage.ready_source_handoff.count += 1;
      triage.ready_source_handoff.packetIds.push(packet.id);
    }
  }

  return [
    triage.missing_sources,
    triage.cautious_warning,
    triage.limited_coverage,
    triage.ready_source_handoff,
  ];
}

export function buildScholarReviewPacketShareText(
  packet: SavedScholarReviewPacket,
) {
  const readinessIssues = scholarReviewPacketReadinessIssues(packet);
  const priority = buildScholarReviewPacketPriority(packet);
  const handoffChecklist = buildScholarReviewPacketHandoffChecklist(packet);
  const privacyReceipt = buildScholarReviewPacketPrivacyReceipt(packet);
  const evidenceAcceptanceChecklist =
    buildScholarReviewEvidenceAcceptanceChecklist(packet, {
      reviewerName: packet.reviewerName || "",
      reviewerNotes: packet.reviewerNotes || "",
      reviewScope: packet.reviewScope || "",
    });
  return [
    packet.title,
    "",
    `Status: ${packet.status}`,
    `Area: ${packet.featureLabel}`,
    `Created: ${packet.createdAt}`,
    `Handoff priority: ${priority.label}`,
    `Next action: ${priority.nextAction}`,
    "",
    "Question",
    packet.question,
    "",
    "Answer summary",
    packet.answerSummary,
    "",
    "Why this needs review",
    ...packet.reasons.map((reason) => `- ${reason}`),
    "",
    "Context still needed",
    ...packet.contextNeeded.map((item) => `- ${item}`),
    "",
    "Source status",
    packet.sourceStatus,
    packet.sourceRefs.length > 0
      ? `Source references: ${packet.sourceRefs.join(", ")}`
      : "Source references: none attached yet",
    packet.sourceCoverage ? `Source coverage: ${packet.sourceCoverage}` : null,
    packet.warning ? `NurAI warning: ${packet.warning}` : null,
    "",
    "Reviewer prompt",
    packet.reviewPrompt,
    "",
    "Reviewer handoff checklist",
    ...handoffChecklist.map(
      (item) =>
        `- ${item.complete ? "[x]" : "[ ]"} ${item.label}: ${item.detail}`,
    ),
    "",
    "Share boundary receipt",
    ...privacyReceipt.map(
      (item) =>
        `- ${item.complete ? "[x]" : "[ ]"} ${item.label}: ${item.detail}`,
    ),
    packet.status === "reviewed" ? "" : null,
    packet.status === "reviewed" ? "Review evidence" : null,
    packet.reviewerName ? `Reviewer: ${packet.reviewerName}` : null,
    packet.reviewerQualification
      ? `Reviewer qualification: ${packet.reviewerQualification}`
      : null,
    packet.reviewDecision ? `Review decision: ${packet.reviewDecision}` : null,
    packet.reviewedAt ? `Reviewed at: ${packet.reviewedAt}` : null,
    packet.reviewScope ? `Review scope: ${packet.reviewScope}` : null,
    packet.reviewerNotes ? `Review notes: ${packet.reviewerNotes}` : null,
    packet.status === "reviewed"
      ? "Review evidence acceptance checklist"
      : null,
    ...(packet.status === "reviewed"
      ? evidenceAcceptanceChecklist.map(
          (item) =>
            `- ${item.complete ? "[x]" : "[ ]"} ${item.label}: ${item.detail}`,
        )
      : []),
    "",
    readinessIssues.length > 0 ? "Packet readiness gaps" : null,
    ...readinessIssues.map((issue) => `- ${issue}`),
    "",
    "NurAI boundary: This packet is for educational review. It is not a final fatwa, and it does not replace qualified review of the exact case.",
  ]
    .filter(Boolean)
    .join("\n");
}
