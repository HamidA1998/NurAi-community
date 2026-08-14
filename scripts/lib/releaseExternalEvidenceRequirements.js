const SCHEMA_VERSION = 2;
const DEFAULT_EVIDENCE_PATH =
  "docs/audit/release-external-evidence.intake.json";

const EXTERNAL_GATE_IDS = ["deployed-runtime-url", "production-database-url"];
const BLOCKER_EVIDENCE_GATE_IDS = [
  ...EXTERNAL_GATE_IDS,
  "owned-runpod-endpoint",
  "google-places-key",
  "eas-android-submit-config",
];

const GATE_REQUIREMENTS = {
  "deployed-runtime-url": {
    title: "Published runtime",
    requiredEvidence: [
      "Live HTTPS NURAI_DEPLOYMENT_URL returns the NurAI server.",
      "Public /api/ai/status is redacted and reports AI_INTEGRATIONS_OPENAI_API_KEY as cloudApiKeySource.",
      "Unauthenticated /api/admin/ai/diagnostics returns 401.",
      "Guarded deployed /api/admin/ai/smoke proves the deployed runtime can generate a tiny OpenAI response.",
    ],
    acceptanceChecklist: [
      "Proof notes name the exact production HTTPS host without exposing secrets.",
      "Command results show public status redaction, protected diagnostics, and passing deployed smoke behavior.",
      "Every command result includes a redacted summaryJson or summarySha256 and a specific non-secret note.",
      "Release blocker output no longer lists deployed-runtime-url after the live smoke passes.",
    ],
    noSecretBoundary:
      "Do not record smoke secrets, OpenAI keys, session secrets, Authorization headers, cookies, or full response payloads containing private account data.",
    evidenceCaptureChecklist: [
      "Run the deployed smoke command from a clean shell with secrets passed only as environment variables.",
      "Paste only redacted summaryJson or summarySha256 evidence from the passing deployed check.",
      "Record the exact HTTPS host and deployment build identifier without request headers, cookies, or response payloads.",
      "Re-run release blockers after the smoke passes and attach the redacted result showing deployed-runtime-url is no longer blocked.",
    ],
    verificationCommands: [
      "NURAI_DEPLOYMENT_URL=https://your-production-domain.example NURAI_DEPLOYED_AI_SMOKE_SECRET=... npm run check:ai-release:deployed",
      "npm run check:release-blockers -- --json",
    ],
  },
  "production-database-url": {
    title: "Production database",
    requiredEvidence: [
      "The non-secret production DB proof plan is current and lists the migration hashes before credentials are used.",
      "Production DATABASE_URL targets the active NurAI Railway Postgres project, or an explicitly approved legacy Supabase project.",
      "Production migration dry run is reviewed before applying SQL.",
      "Standalone conversation ownership check passes before and after production migration work.",
      "Production migrations, conversation ownership, and migration-applied checks pass.",
    ],
    acceptanceChecklist: [
      "Proof notes identify the intended production project without including the DATABASE_URL.",
      "The target check passes before any apply command is accepted as evidence.",
      "Dry-run, apply, release, ownership, migration-applied, and release-blocker command results are all represented.",
      "Every command result includes a redacted summaryJson or summarySha256 and a specific non-secret note.",
    ],
    noSecretBoundary:
      "Do not record the production DATABASE_URL, database password, Railway/Supabase service credentials, SQL containing private user data, or unredacted connection strings.",
    evidenceCaptureChecklist: [
      "Confirm the non-secret migration proof plan before opening any shell that contains DATABASE_URL.",
      "Capture target, dry-run, apply, release, ownership, and migration-applied results as redacted summaryJson or summarySha256 entries.",
      "Record the intended Railway project and database name, or approved legacy Supabase project identifier, without the connection string or password.",
      "Re-run release blockers after the database checks pass and attach the redacted result showing production-database-url is no longer blocked.",
    ],
    verificationCommands: [
      "npm run check:production-db-proof-plan",
      "DATABASE_URL=postgresql://... npm run check:production-db-target -- --json",
      "DATABASE_URL=postgresql://... npm run check:conversation-ownership",
      "DATABASE_URL=postgresql://... npm run apply:production-migrations -- --json",
      "DATABASE_URL=postgresql://... npm run apply:production-migrations -- --yes --json",
      "DATABASE_URL=postgresql://... npm run check:production-db-release -- --json",
      "DATABASE_URL=postgresql://... npm run check:db-migrations-applied -- --json",
      "npm run check:release-blockers -- --json",
    ],
  },
  "owned-runpod-endpoint": {
    title: "Owned RunPod endpoint",
    requiredEvidence: [
      "RunPod account balance and endpoint ownership are verified for the intended account.",
      "The owned endpoint is OpenAI-compatible and recorded in NURAI_LOCAL_AI_BASE_URL when local/hybrid AI is release-required.",
      "Enabled local AI model pool checks pass without using a third-party or placeholder endpoint.",
      "Release blocker checks no longer list owned-runpod-endpoint when local/hybrid AI is required.",
    ],
    acceptanceChecklist: [
      "Proof notes identify the owned account and endpoint purpose without exposing API keys.",
      "Endpoint ownership and model compatibility checks both pass.",
      "Release blocker output no longer lists owned-runpod-endpoint when local/hybrid AI is required.",
      "Every command result includes a redacted summaryJson or summarySha256 and a specific non-secret note.",
    ],
    noSecretBoundary:
      "Do not record RUNPOD_API_KEY, endpoint bearer tokens, private endpoint secrets, or account billing secrets.",
    evidenceCaptureChecklist: [
      "Run account and endpoint ownership checks without printing API keys or bearer tokens.",
      "Capture redacted endpoint identity, compatibility, and model-pool summaries only.",
      "Record non-secret account or endpoint labels that let reviewers distinguish the intended owned endpoint.",
      "Re-run release blockers after local/hybrid AI ownership checks pass when this gate is release-required.",
    ],
    verificationCommands: [
      'npm run create:runpod-ai -- --yes --template-id axws2453nd --model Qwen/Qwen3-8B --gpu "NVIDIA L4" --workers-min 0 --workers-max 1',
      "npm run check:runpod-account",
      "npm run check:local-ai -- --all-enabled",
      "npm run check:release-blockers -- --json",
    ],
  },
  "google-places-key": {
    title: "Google Places key",
    requiredEvidence: [
      "The Google Cloud project owning GOOGLE_PLACES_API_KEY has billing enabled.",
      "Required Google Maps Platform APIs are enabled for Geocoding and Places API (New).",
      "GOOGLE_CLOUD_PROJECT_ID ties live smoke evidence to the intended project.",
      "Places provider and live smoke checks pass before relying on production nearby-place data.",
    ],
    acceptanceChecklist: [
      "Proof notes name the intended Google Cloud project ID without exposing API keys.",
      "Billing/API enablement and live Places smoke checks both pass.",
      "Provider controls prove fallback behavior and key handling.",
      "Every command result includes a redacted summaryJson or summarySha256 and a specific non-secret note.",
    ],
    noSecretBoundary:
      "Do not record GOOGLE_PLACES_API_KEY, service account JSON, private map credentials, or raw user location traces.",
    evidenceCaptureChecklist: [
      "Verify the intended Google Cloud project, billing, and required Places/Geocoding APIs outside committed files.",
      "Capture only redacted live smoke summaries and provider-control results.",
      "Record the non-secret GOOGLE_CLOUD_PROJECT_ID or project label, never the API key.",
      "Re-run release blockers after Places smoke checks pass and attach the redacted result when this gate is blocked.",
    ],
    verificationCommands: [
      "npm run check:google-places-live -- --json",
      "npm run check:places-provider-controls",
      "npm run check:release-blockers -- --json",
    ],
  },
  "eas-android-submit-config": {
    title: "Android Play and RevenueCat",
    requiredEvidence: [
      "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH points to a Google service_account JSON outside the repo.",
      "Google Play Publisher API access is verified against package uk.co.eliteautomations.nurai by creating and cleaning up a temporary edit.",
      "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY is the Google Play public SDK key from RevenueCat.",
      "Android RevenueCat offerings and EAS Android submit credential checks pass.",
    ],
    acceptanceChecklist: [
      "Proof notes confirm the Google Play service account file stays outside the repo.",
      "Android submit credential and RevenueCat offering checks pass for uk.co.eliteautomations.nurai.",
      "Temporary Google Play edits are cleaned up after verification.",
      "Every command result includes a redacted summaryJson or summarySha256 and a specific non-secret note.",
    ],
    noSecretBoundary:
      "Do not record service account private_key material, Play Console JSON contents, RevenueCat secret keys, or local credential file contents.",
    evidenceCaptureChecklist: [
      "Keep the Google Play service account JSON outside the repo and capture only file-location/permission proof notes.",
      "Capture redacted temporary-edit, RevenueCat offering, and subscription-control results.",
      "Record the Android package and track/status without private key material or credential JSON.",
      "Confirm temporary Google Play edits are cleaned up before accepting the evidence packet.",
    ],
    verificationCommands: [
      "npm run check:android-release-credentials -- --json",
      "npm run check:revenuecat-offerings:android -- --json",
      "npm run check:subscription-release-controls",
      "npm run check:release-blockers -- --json",
    ],
  },
};

function verificationCommandsForGate(gateId) {
  return (
    GATE_REQUIREMENTS[gateId]?.verificationCommands || [
      "npm run check:release-blockers",
    ]
  );
}

const POST_CLEAR_WATCH_PLANS = {
  "deployed-runtime-url": [
    "Watch /api/ai/status, /api/admin/ai/diagnostics 401 behavior, and guarded smoke status after the deployed check first passes.",
    "Confirm AI_INTEGRATIONS_OPENAI_API_KEY remains the deployed OpenAI secret source and public status output stays redacted.",
    "Keep the release smoke secret available only to the runtime and release shell; rotate it if it was exposed during troubleshooting.",
  ],
  "production-database-url": [
    "Watch migration audit rows, conversation ownership checks, and database release checks after the production apply finishes.",
    "Confirm no production connection strings appear in command logs, screenshots, docs, or committed evidence artifacts.",
    "Re-run ownership and migration-applied checks after any fix:conversation-ownership step before accepting the release evidence.",
  ],
  "owned-runpod-endpoint": [
    "Watch enabled local-AI model health, endpoint ownership, and provider error summaries after enabling hybrid/local AI.",
    "Confirm OpenAI remains the production provider if RunPod is intentionally deferred for this release.",
    "Monitor cost/balance errors and disable unhealthy local candidates before user-facing release claims.",
  ],
  "google-places-key": [
    "Watch Places provider smoke, fallback behavior, and location privacy copy after live key verification.",
    "Confirm the intended Google Cloud project is named only by non-secret project ID or label.",
    "Re-run provider controls after any billing, API enablement, or key-restriction change.",
  ],
  "eas-android-submit-config": [
    "Watch Android credential checks, RevenueCat offerings, and subscription release controls after Play access changes.",
    "Confirm temporary Play Console edits are cleaned up and service account JSON remains outside the repo.",
    "Re-run Android offering and submit checks before any Android launch claim.",
  ],
};

const ROLLBACK_MITIGATION_PLANS = {
  "deployed-runtime-url": [
    "If deployed smoke fails after a pass, hold launch copy, roll the server back to the last known-good deployment, and rerun deployed smoke.",
    "If the smoke secret mismatch recurs, resync the secret, redeploy/restart the runtime, and invalidate any exposed proof artifact.",
    "If public status exposes private details, block release immediately and restore the redacted status route before new screenshots or claims.",
  ],
  "production-database-url": [
    "If target verification is wrong, stop before apply and replace DATABASE_URL in the release shell only.",
    "If migration dry-run or apply fails, hold launch, keep the migration audit output, and use the reviewed SQL rollback/forward-fix path.",
    "If ownership checks fail after apply, run the scoped ownership fixer only after reviewing the non-secret summary, then re-run all DB gates.",
  ],
  "owned-runpod-endpoint": [
    "If local-AI health fails, keep OpenAI as the active production provider and remove local/hybrid claims from release copy.",
    "If account ownership cannot be proven, disable the candidate endpoint and keep the blocker visible in release evidence.",
    "If cost or balance errors recur, pause local model rollout and re-run ai-cost-controls before re-enabling the candidate.",
  ],
  "google-places-key": [
    "If live Places smoke fails, keep provider fallback behavior active and remove production nearby-place claims.",
    "If API key restrictions are wrong, rotate or restrict the key outside committed files, then rerun live and provider checks.",
    "If location privacy copy is unclear, hold screenshots that expose place/location flows until trust copy is corrected.",
  ],
  "eas-android-submit-config": [
    "If Google Play access fails, defer Android launch and keep iOS/review copy separate from Android availability claims.",
    "If RevenueCat Android offerings fail, remove Android purchase claims and rerun subscription release controls.",
    "If credential material enters the repo or logs, rotate the credential and regenerate non-secret evidence before continuing.",
  ],
};

function postClearWatchPlanForGate(gateId) {
  return (
    POST_CLEAR_WATCH_PLANS[gateId] || [
      "Watch the canonical verification command and release-blocker output after this gate clears.",
      "Keep non-secret proof attached to the current build, deployment target, and content state.",
    ]
  );
}

function rollbackMitigationPlanForGate(gateId) {
  return (
    ROLLBACK_MITIGATION_PLANS[gateId] || [
      "If the gate regresses, hold release claims and rerun the canonical verification commands before proceeding.",
      "Keep rollback or forward-fix notes non-secret and tied to the current release blocker output.",
    ]
  );
}

module.exports = {
  BLOCKER_EVIDENCE_GATE_IDS,
  DEFAULT_EVIDENCE_PATH,
  EXTERNAL_GATE_IDS,
  GATE_REQUIREMENTS,
  SCHEMA_VERSION,
  postClearWatchPlanForGate,
  rollbackMitigationPlanForGate,
  verificationCommandsForGate,
};
