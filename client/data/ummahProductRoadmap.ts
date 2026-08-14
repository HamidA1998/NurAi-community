export type UmmahRoadmapCategory =
  | "trust"
  | "quran"
  | "hifz"
  | "privacy"
  | "daily-os"
  | "umrah"
  | "local-community"
  | "duas"
  | "learning"
  | "finance"
  | "accessibility"
  | "release-readiness";

export type UmmahRoadmapStatus =
  | "implemented"
  | "partially-built"
  | "planned"
  | "blocked-external";

export type UmmahRoadmapSource = {
  title: string;
  authority: string;
  url: string;
  insight: string;
};

export type UmmahProductRoadmapItem = {
  id: string;
  category: UmmahRoadmapCategory;
  title: string;
  priority: 1 | 2 | 3;
  status: UmmahRoadmapStatus;
  lastChecked: string;
  sourceSignals: UmmahRoadmapSource[];
  nuraiOpportunity: string;
  safetyBoundary: string;
  nextBuild: string[];
  implementedEvidence?: string[];
};

export const UMMAH_PRODUCT_ROADMAP_LAST_REVIEWED = "2026-06-01";

export const UMMAH_PRODUCT_ROADMAP: UmmahProductRoadmapItem[] = [
  {
    id: "source-backed-islamic-ai",
    category: "trust",
    title: "Source-backed Islamic AI trust layer",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "Muslim Pro AiDeen",
        authority: "Muslim Pro",
        url: "https://support.muslimpro.com/hc/en-us/articles/29132231316633-Ask-AiDeen-FAQ",
        insight:
          "Large Muslim lifestyle apps now market AI answers grounded in Quran and verified Hadith, with feedback controls, privacy language, and human oversight claims, so NurAI must compete through visible source grounding, humility, and stricter review boundaries.",
      },
      {
        title: "SeekersGuidance Answers",
        authority: "SeekersGuidance",
        url: "https://seekersguidance.org/answers/",
        insight:
          "Large Islamic-answer archives show the trust value of named scholars, clear categories, madhhab context, recent updates, and searchable source-backed guidance.",
      },
    ],
    nuraiOpportunity:
      "Make every religious AI answer visibly source-backed, with citations, uncertainty, review mode, and scholar-routing for sensitive questions.",
    safetyBoundary:
      "NurAI must not present AI output as a fatwa, scholar replacement, hadith grader, or source of invented Quran/hadith references.",
    nextBuild: [
      "Expand retrieval beyond current Quran/hadith anchors into reviewed tafsir and book packets.",
      "Add reviewer-facing dashboards for failed or cautious AI source reviews.",
      "Keep OpenAI deep mode for complex, tafsir, fiqh, and sensitive answers.",
    ],
    implementedEvidence: [
      "server/ai/sourceGrounding.ts",
      "scripts/eval-ai-source-grounding.ts",
      "client/components/AIResponseModal.tsx",
      "npm run eval:ai-grounding",
    ],
  },
  {
    id: "owned-open-model-routing-layer",
    category: "trust",
    title: "Owned open-model routing layer",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "RunPod vLLM OpenAI Compatibility",
        authority: "RunPod",
        url: "https://docs.runpod.io/serverless/vllm/openai-compatibility",
        insight:
          "RunPod vLLM workers expose OpenAI-compatible chat, completion, and model endpoints through a dedicated serverless endpoint, which fits NurAI's provider-agnostic local/open model lane.",
      },
      {
        title: "vLLM OpenAI-Compatible Server",
        authority: "vLLM",
        url: "https://docs.vllm.ai/en/latest/serving/openai_compatible_server/",
        insight:
          "vLLM can serve models behind an OpenAI-compatible HTTP API, allowing NurAI to keep one internal provider contract while changing hosted open models.",
      },
      {
        title: "Gemma 4",
        authority: "Google DeepMind",
        url: "https://deepmind.google/models/gemma/gemma-4/",
        insight:
          "Gemma 4 positions small open models for offline edge use and larger models for local-first servers, making it a realistic candidate for future owned inference lanes after licensing and safety review.",
      },
      {
        title: "Qwen3-8B",
        authority: "Qwen on Hugging Face",
        url: "https://huggingface.co/Qwen/Qwen3-8B",
        insight:
          "Qwen3-8B documents vLLM deployment, OpenAI-compatible calls, thinking and non-thinking modes, and a 32k native context window, matching NurAI's first owned RunPod endpoint plan.",
      },
    ],
    nuraiOpportunity:
      "Run a NurAI-owned open-model lane on a dedicated RunPod/vLLM endpoint for low-risk utility, summaries, nudges, and classification while OpenAI plus source retrieval handles complex Islamic work.",
    safetyBoundary:
      "Open/local models must not answer sensitive religious, fiqh, tafsir, medical, or highly personal questions on their own; those paths need verified sources, OpenAI deep/review mode, and scholar escalation when required.",
    nextBuild: [
      "Clear RunPod billing and create the owned vLLM endpoint with the reviewed model, worker limits, endpoint ID, and OpenAI-compatible base URL recorded in release evidence.",
      "Add model cards, license notes, context-window limits, role tags, and latency/cost targets for each enabled open model before routing traffic to it.",
      "Keep simple utility and nudge tasks eligible for the owned open model, but force sensitive Islamic, tafsir, fiqh, health, and uncertain answers through source grounding and OpenAI review.",
      "Extend AI evals with Qwen/Gemma/open-model routing prompts, fallback tracking, citation coverage, and review-mode pass/fail evidence before enabling the lane in production.",
    ],
    implementedEvidence: [
      "server/ai/modelSelector.ts",
      "server/ai/router.ts",
      "scripts/create-runpod-vllm-endpoint.js",
      "scripts/check-local-ai-config.js",
      "scripts/eval-ai-router-contract.ts",
    ],
  },
  {
    id: "scholar-escalation-workflow",
    category: "trust",
    title: "Scholar escalation workflow for sensitive questions",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-06-01",
    sourceSignals: [
      {
        title: "SeekersGuidance Ask a Question",
        authority: "SeekersGuidance",
        url: "https://seekersguidance.org/submit-a-question/",
        insight:
          "The answer workflow asks users to search a large archive first, then submit unique questions to expert scholars, while redirecting very context-dependent personal cases to trained local support.",
      },
      {
        title: "How Can We Know Which Scholars Are Reliable to Follow?",
        authority: "SeekersGuidance",
        url: "https://seekersguidance.org/answers/general-answers-feeds/how-can-we-know-which-scholars-are-reliable-to-follow/",
        insight:
          "Reliable religious guidance depends on studied teachers, recognized scholarly training, upright practice, and clear criteria for who users should take religion from.",
      },
    ],
    nuraiOpportunity:
      "Turn sensitive AI requests into a reviewer-ready packet: archive matches, source citations, madhhab/context fields, uncertainty flags, and a qualified-human review queue before final guidance is shown.",
    safetyBoundary:
      "NurAI must never make AI-only religious rulings feel final; marriage, divorce, finance, medical, abuse, inheritance, and highly personal cases need qualified review or local support pathways.",
    nextBuild: [
      "Expand sensitive-question classifier coverage so more high-care topics create source packets instead of casual answers.",
      "Move the local review queue toward a server-backed scholar/admin workflow with reviewer ownership, publish/decline states, and audit history.",
      "Keep improving waiting, evidence, and escalation states without implying the AI has settled the ruling.",
    ],
    implementedEvidence: [
      "client/components/AIResponseModal.tsx",
      "client/services/scholarReviewPacketService.ts",
      "scripts/check-scholar-review-workflow.ts",
      "npm run check:scholar-review-workflow",
    ],
  },
  {
    id: "flagship-quran-habit-loop",
    category: "quran",
    title: "Flagship Quran habit loop",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "Quranly",
        authority: "Quranly",
        url: "https://www.quranly.app/",
        insight:
          "Daily Quran goals, time/verse/hasanat progress, streaks, reading levels, reminders, and family/friend encouragement make Quran consistency easy to understand.",
      },
      {
        title: "Quran.com Apps",
        authority: "Quran.com",
        url: "https://quran.com/apps",
        insight:
          "Serious Quran tools need reading continuity, bookmarks, sharing, search, night mode, repeat audio, translations, tafsir, word-by-word data, recitations, and offline audio.",
      },
    ],
    nuraiOpportunity:
      "Make today's Quran action a primary home-screen anchor with reading goals, streak repair, notes, bookmarks, tafsir/source cards, audio, and family goals.",
    safetyBoundary:
      "Habit design should encourage consistency without shame loops, coercive worship pressure, or unsupported reward claims.",
    nextBuild: [
      "Make Quran progress, reflections, bookmarks, and audio state feel like one flagship loop.",
      "Add gentle streak recovery and Ramadan/Khatmah plans.",
      "Show source and tafsir boundaries whenever AI explains verses.",
    ],
    implementedEvidence: [
      "client/screens/QuranReaderScreen.tsx",
      "client/lib/quran-progress.ts",
      "client/services/dailyDeenJourneyService.ts",
    ],
  },
  {
    id: "quran-reflection-circles",
    category: "quran",
    title: "Quran reflection circles",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-06-01",
    sourceSignals: [
      {
        title: "QuranReflect: A New Social Experience",
        authority: "Quran.com",
        url: "https://quran.com/product-updates/quranreflect-a-new-social-experience-for-quran-reflections",
        insight:
          "QuranReflect's 2025 rebuild centers social behavior around Quran reflection with ayah attachments, hashtags, following, trending/latest feeds, search, and contribution for logged-in users.",
      },
      {
        title: "QuranReflect Android App",
        authority: "QuranReflect",
        url: "https://play.google.com/store/apps/details?id=com.quranreflect.quranreflect&hl=en-US",
        insight:
          "The mobile app positions Quran reflection as public, private, or group-based writing with verse references, author following, chapter/verse search, hashtags, and saved private notes.",
      },
    ],
    nuraiOpportunity:
      "Create private and moderated reflection circles where users can attach ayahs, save personal reflections, invite family or teachers, and receive source-grounded NurAI prompts after reading.",
    safetyBoundary:
      "Reflection circles must not turn popularity into religious authority, expose private worship notes by default, or allow unreviewed advice to look like scholarship.",
    nextBuild: [
      "Connect private notes and circle drafts into Quran Reader and Family screens with clear privacy controls.",
      "Add parent/teacher moderation and reporting before any wider circle sharing.",
      "Build NurAI reflection prompts that stay ayah-attached and do not overclaim tafsir authority.",
    ],
    implementedEvidence: [
      "client/services/quranLearningService.ts",
      "client/services/quranReflectionCircleService.ts",
      "scripts/check-quran-reflection-circles-release.ts",
      "npm run check:quran-reflection-circles-release",
    ],
  },
  {
    id: "safe-hifz-coach",
    category: "hifz",
    title: "Safe Hifz coach before recitation AI",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "Tarteel Features",
        authority: "Tarteel",
        url: "https://support.tarteel.ai/en/collections/15105266-tarteel-features",
        insight:
          "Voice search, recitation follow-along, streaks, memorization mistake detection, journey planning, mistake history, and analytics set the bar for AI-assisted hifz.",
      },
      {
        title: "HifzAI",
        authority: "HifzAI",
        url: "https://hifzai.org/",
        insight:
          "Word-by-word feedback, color-coded scoring, recording replay, and Quranic Arabic transcription show where recitation tooling is heading.",
      },
    ],
    nuraiOpportunity:
      "Start with hifz planning, spaced repetition, weak-ayah tracking, and teacher-friendly logs, then add recitation capture only after Quranic Arabic accuracy is validated.",
    safetyBoundary:
      "Do not ship a half-accurate Quran recitation checker; tajweed/recitation feedback must include accuracy limits and should not replace a teacher.",
    nextBuild: [
      "Strengthen manual hifz review plans and weak-ayah history.",
      "Add consent and privacy controls before storing voice recordings.",
      "Design recitation AI as a later validated feature, not a release claim.",
    ],
    implementedEvidence: [
      "client/screens/HifzScreen.tsx",
      "client/services/hifzSpacedRepetition.ts",
    ],
  },
  {
    id: "privacy-first-worship",
    category: "privacy",
    title: "Privacy-first worship promise",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "Pillars",
        authority: "Pillars",
        url: "https://www.thepillarsapp.com/",
        insight:
          "Prayer apps can win trust by being Muslim-built, privacy-first, ad-free, beautiful, and focused.",
      },
      {
        title: "Usul",
        authority: "Usul",
        url: "https://www.theusul.app/",
        insight:
          "A worship app can position privacy and an ad-free experience as part of the product value, not just a legal page.",
      },
    ],
    nuraiOpportunity:
      "Make privacy a visible product surface for AI logs, location, women’s health, family, notifications, export, and delete controls.",
    safetyBoundary:
      "Do not claim offline-only, anonymous, encrypted, or no-data behavior unless the implementation and release checks prove it.",
    nextBuild: [
      "Add a plain-English privacy dashboard.",
      "Keep ads out of worship moments.",
      "Continue aligning user-facing privacy copy with real storage and logging behavior.",
    ],
    implementedEvidence: [
      "scripts/check-ai-privacy-controls.js",
      "scripts/check-user-facing-claims.js",
      "client/screens/PrivacyPolicyScreen.tsx",
    ],
  },
  {
    id: "today-in-deen-os",
    category: "daily-os",
    title: "Today in Deen operating system",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "Athan App",
        authority: "IslamicFinder",
        url: "https://apps.apple.com/us/app/athan-prayer-times-al-quran/id505858403",
        insight:
          "Users expect an all-in-one daily surface with prayer goals, streaks, Quran audio, dua/adhkar, Qibla, menstrual mode, calendar, tasbih, and Hajj/Umrah guides.",
      },
      {
        title: "Yaqeen Connect",
        authority: "Yaqeen Connect",
        url: "https://yaqeenconnect.com/",
        insight:
          "Daily Muslim companion apps are converging Quran, prayer, dhikr, duas, memorization, recitation coaching, offline audio, widgets, and ad-free positioning into one routine surface.",
      },
    ],
    nuraiOpportunity:
      "Make the home screen a calm daily deen command center: next prayer, Quran action, dua/adhkar, learning step, family/community nudge, and grounded AI suggestion.",
    safetyBoundary:
      "Avoid cluttered super-app design, fake progress claims, and unsupported devotional outcome promises.",
    nextBuild: [
      "Unify prayer, Quran, duas, learning, and family nudges into one daily journey model.",
      "Use contextual AI cards inside workflows, not only a generic chatbot.",
      "Keep the first screen useful within seconds.",
    ],
    implementedEvidence: [
      "client/screens/HomeScreen.tsx",
      "client/services/dailyDeenJourneyService.ts",
      "client/hooks/useNurAIV3.ts",
    ],
  },
  {
    id: "spiritual-growth-companion",
    category: "daily-os",
    title: "Spiritual growth companion",
    priority: 2,
    status: "partially-built",
    lastChecked: "2026-06-01",
    sourceSignals: [
      {
        title: "Yaqeen App",
        authority: "Yaqeen Institute",
        url: "https://app.yaqeen.io/",
        insight:
          "Serious learning users value scholar and researcher trust, curriculum, saved content, videos, papers, and spiritual-growth tracking that connects knowledge with practice.",
      },
      {
        title: "Yaqeen Compass",
        authority: "Yaqeen Institute",
        url: "https://yaqeeninstitute.org/discovercompass",
        insight:
          "Spiritual-growth products can use assessments, tailored content plans, weekly resource commitments, dashboards, and periodic reassessment to help users connect knowledge with practice.",
      },
    ],
    nuraiOpportunity:
      "Create a calm weekly growth view that joins Quran consistency, prayers, dhikr, learning, intentions, reflection notes, family goals, and one responsible next action from NurAI.",
    safetyBoundary:
      "Growth design should motivate without guilt, pressure-based reward loops, or unsupported spiritual-score claims; private worship data must stay user-controlled.",
    nextBuild: [
      "Persist weekly reflection notes with export/delete controls in the privacy dashboard.",
      "Connect more Quran, prayer, Library, dhikr, and family activity signals once their evidence is normalized.",
      "Keep AI weekly summaries limited to user-owned visible progress and source-linked next steps.",
    ],
    implementedEvidence: [
      "client/services/spiritualGrowthCompanionService.ts",
      "client/components/home/GeneratedHomeExperience.tsx",
      "scripts/check-spiritual-growth-companion-release.ts",
      "npm run check:spiritual-growth-companion-release",
    ],
  },
  {
    id: "ethical-engagement-guardrails",
    category: "trust",
    title: "Ethical engagement guardrails",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "FTC Dark Patterns Report",
        authority: "Federal Trade Commission",
        url: "https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf?date=2025-01-20",
        insight:
          "The FTC warns that deceptive interface patterns can trick consumers around subscriptions, hidden terms, privacy choices, ads, children’s apps, and recurring charges.",
      },
      {
        title: "Humane Product Design",
        authority: "Center for Humane Technology",
        url: "https://www.humanetech.com/humane-product-design",
        insight:
          "Humane product design treats attention, intention, well-being, and trust as design constraints rather than optimizing only for raw engagement.",
      },
      {
        title: "Google Play Families Policies",
        authority: "Google Play",
        url: "https://support.google.com/googleplay/android-developer/answer/9893335?hl=en",
        insight:
          "Family-facing Android apps need careful treatment of ads, monetization, age-appropriate content, and experiences that children could mistake for normal app content.",
      },
      {
        title: "App Store Review Guidelines",
        authority: "Apple Developer",
        url: "https://developer.apple.com/app-store/review/guidelines/",
        insight:
          "Apple requires subscription value, clear subscription information, no scam or bait-and-switch practices, and proper moderation for user-generated content, so NurAI's growth loops must be transparent and review-safe.",
      },
    ],
    nuraiOpportunity:
      "Create return loops around meaningful worship progress, personal intention, family accountability, and source-backed learning while giving users clear reminder, pause, privacy, export, and cancellation controls.",
    safetyBoundary:
      "Do not use shame loops, hard-to-cancel subscriptions, hidden costs, fake scarcity, privacy misdirection, child-directed monetization pressure, or worship-pressure mechanics.",
    nextBuild: [
      "Expand engagement-ethics release QA as reminders, streak repair, paywalls, family mode, kids mode, and AI nudges evolve.",
      "Give every recurring nudge a clear pause, frequency, and purpose control.",
      "Require subscription and trial copy to show price, renewal, cancellation route, and included benefits before purchase.",
      "Keep children’s surfaces ad-free, parent-controlled, and separated from open-ended AI chat until child-safety review exists.",
    ],
    implementedEvidence: [
      "client/data/engagementEthics.ts",
      "scripts/check-engagement-ethics-release.ts",
      "npm run check:engagement-ethics-release",
    ],
  },
  {
    id: "official-umrah-companion",
    category: "umrah",
    title: "Official-route Umrah companion",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "Nusuk Umrah",
        authority: "Nusuk",
        url: "https://umrah.nusuk.sa/",
        insight:
          "Official Umrah service routing covers visa, accommodation, transport, Rawdah, visits, and package planning through approved providers.",
      },
      {
        title: "Pilgrim Experience Program Nusuk Update",
        authority: "Saudi Pilgrim Experience Program",
        url: "https://pep.gov.sa/en/news/704",
        insight:
          "Nusuk is the official service ecosystem; NurAI should complement it with preparation, safety, learning, and offline support rather than replacing official actions.",
      },
    ],
    nuraiOpportunity:
      "Build around official channels with preparation, checklists, duas, rites guides, packing, family coordination, maps, reminders, safety, and post-Umrah reflection.",
    safetyBoundary:
      "NurAI must not claim to issue permits, visas, Rawdah bookings, official credentials, packages, live prices, or transport availability.",
    nextBuild: [
      "Add offline pilgrim card and lost/separated flow.",
      "Expand official-route cards into pre-travel and in-journey workflows.",
      "Keep every service card source-labelled and timestamped.",
    ],
    implementedEvidence: [
      "client/data/officialServiceLinks.ts",
      "client/screens/HajjUmrahScreen.tsx",
      "scripts/check-official-service-links.ts",
      "server/ai/sourceGrounding.ts",
    ],
  },
  {
    id: "nusuk-card-aware-pilgrim-wallet",
    category: "umrah",
    title: "Nusuk-card-aware pilgrim wallet",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-06-01",
    sourceSignals: [
      {
        title: "Nusuk Card",
        authority: "Saudi Ministry of Hajj and Umrah",
        url: "https://haj.gov.sa/en/About-the-ministry/Ministry-initiatives/Nusuk-Card?NuskCardType=Nusuk+Card+for+Pilgrims",
        insight:
          "The official Nusuk Card page describes pilgrim identity, holy-site access, health capability, accommodation, service-provider, bus boarding, lost-pilgrim, gathering-point, complaint, and digital-card workflows.",
      },
      {
        title: "Hajj 1447 AH Registration Through Nusuk",
        authority: "Saudi Pilgrim Experience Program",
        url: "https://pep.gov.sa/en/news/874",
        insight:
          "The 2026 official update routes eligible domestic Hajj registration, package selection, payment, and permit flow through the Nusuk app or official website, with contracting only through licensed companies on the Nusuk platform.",
      },
    ],
    nuraiOpportunity:
      "Create an offline pilgrim wallet that stores non-secret trip notes, hotel cards, group meeting points, emergency contacts, packing status, rite checklists, official Nusuk links, and family-safe share cards around the real official flow.",
    safetyBoundary:
      "NurAI must not issue, duplicate, alter, verify, or replace a Nusuk Card, Hajj permit, Umrah permit, Rawdah booking, payment route, official complaint, or licensed-provider contract.",
    nextBuild: [
      "Add a dedicated wallet detail screen with edit/share/export/delete controls for each safe offline card.",
      "Add one-tap family/group share cards for hotel, meeting point, emergency contact, and group contact.",
      "Expand official support links to service provider, Nusuk Care Center, and 1966 guidance with source timestamps where official source coverage is available.",
    ],
    implementedEvidence: [
      "client/services/nusukPilgrimWalletService.ts",
      "client/services/pilgrimCardService.ts",
      "client/screens/TravelCompanionScreen.tsx",
      "scripts/check-nusuk-pilgrim-wallet-release.ts",
      "npm run check:nusuk-pilgrim-wallet-release",
    ],
  },
  {
    id: "pilgrim-health-safety-mode",
    category: "umrah",
    title: "Pilgrim health and safety mode",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "Nusuk Hajj Health Guidelines",
        authority: "Nusuk",
        url: "https://hajj.nusuk.sa/nusuk/health/guidelines",
        insight:
          "Official Hajj guidance highlights emergency contacts, vaccination checks, chronic-condition preparation, medication documents, heat stress, dehydration, falls, respiratory illness, first aid, and health facility routing.",
      },
      {
        title: "Nusuk Umrah Health Guidelines",
        authority: "Nusuk",
        url: "https://umrah.nusuk.sa/nusuk/health/guidelines",
        insight:
          "Official Umrah guidance includes health-facility routing, emergency contact numbers, dehydration and illness prevention, and the Sehhaty platform as the Saudi health-service route.",
      },
      {
        title: "WHO EMRO Umrah and Hajj health messages",
        authority:
          "World Health Organization Regional Office for the Eastern Mediterranean",
        url: "https://www.emro.who.int/cpi/programmes/umrah-hajj-safety.html",
        insight:
          "WHO frames Umrah and Hajj as mass gatherings with infectious-disease, heat, medication, vaccination, and pre-travel documentation risks, while directing travellers to Saudi Ministry of Health requirements for the most current rules.",
      },
      {
        title: "Saudi MOH Pilgrims Health Requirements",
        authority: "Saudi Ministry of Health",
        url: "https://www.moh.gov.sa/en/HealthAwareness/Pilgrims-Health/pages/default.aspx",
        insight:
          "The Ministry of Health is the authority for changing Hajj and Umrah health requirements, so NurAI should source-link instead of freezing vaccine or entry rules in app copy.",
      },
    ],
    nuraiOpportunity:
      "Create a pilgrim safety mode with official-contact cards, personal medication notes, hydration and heat reminders, accessibility prompts, source-linked health checklists, and one-tap official health routes.",
    safetyBoundary:
      "NurAI must not diagnose symptoms, change medication advice, decide fitness to travel, or present emergency guidance as a substitute for official health services and clinicians.",
    nextBuild: [
      "Add timed heat, hydration, rest, footwear, crowd, and medication-document nudges without personal medical judgement.",
      "Add optional QR or lock-screen export for the offline pilgrim card after privacy review.",
      "Add a privacy-reviewed companion check-in flow for families and group leaders.",
    ],
    implementedEvidence: [
      "client/data/pilgrimHealthSafety.ts",
      "client/services/pilgrimCardService.ts",
      "client/screens/HajjUmrahScreen.tsx",
      "scripts/check-pilgrim-health-safety.ts",
      "npm run check:pilgrim-health-safety",
    ],
  },
  {
    id: "verified-local-mosque-layer",
    category: "local-community",
    title: "Verified local mosque layer",
    priority: 2,
    status: "blocked-external",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "Mawaqit Prayer Times",
        authority: "Mawaqit",
        url: "https://mawaqit.net/en/pray-times",
        insight:
          "Mosque-set prayer and iqamah times, announcements, and mosque-management tooling show that local accuracy is a trust feature.",
      },
      {
        title: "Google Maps Platform",
        authority: "Google",
        url: "https://developers.google.com/maps/documentation/places/web-service",
        insight:
          "Production nearby mosque discovery depends on live Places access, billing, API enablement, and clear provider-error handling.",
      },
    ],
    nuraiOpportunity:
      "Let users find, follow, and eventually verify local mosques for iqamah changes, Jummah times, Ramadan calendars, announcements, and correction flows.",
    safetyBoundary:
      "Do not label mosque times as verified unless a mosque owner/moderator source, timestamp, and correction process exist.",
    nextBuild: [
      "Clear Google Places billing/API blocker first.",
      "Add mosque claim/moderation workflow before verified local times.",
      "Track corrections and source labels for local data.",
    ],
  },
  {
    id: "authentic-dua-dhikr-loop",
    category: "duas",
    title: "Authentic dua and dhikr habit loop",
    priority: 2,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "Dhikr & Dua",
        authority: "Dhikr & Dua",
        url: "https://www.dhikranddua.com/",
        insight:
          "Focused dua/dhikr products emphasize authentic collections, streaks, tasbih, favorites, and custom collections.",
      },
      {
        title: "Sajda Support",
        authority: "Sajda",
        url: "https://faq.sajda.app/question/112",
        insight:
          "Users expect Quran, tajweed, dhikr favorites, and collective remembrance to feel polished and easy to return to.",
      },
    ],
    nuraiOpportunity:
      "Make duas and adhkar easy to save, repeat, understand, schedule, and connect to real life while keeping source labels precise.",
    safetyBoundary:
      "Do not invent dua wording, virtues, timings, or rewards; exact source labels are required for transmitted texts.",
    nextBuild: [
      "Add collection-level source review and user custom collections.",
      "Connect adhkar to daily reminders and context-aware NurAI nudges.",
      "Keep tasbih and streaks gentle rather than performative.",
    ],
    implementedEvidence: [
      "client/screens/DuasScreen.tsx",
      "client/screens/AdhkarScreen.tsx",
      "scripts/check-user-facing-claims.js",
    ],
  },
  {
    id: "structured-islamic-learning-audio",
    category: "learning",
    title: "Structured Islamic learning and audio paths",
    priority: 2,
    status: "partially-built",
    lastChecked: "2026-06-01",
    sourceSignals: [
      {
        title: "What is Bayyinah TV?",
        authority: "Bayyinah TV",
        url: "https://bayyinahtv.zendesk.com/hc/en-us/articles/35040314675095-What-is-Bayyinah-TV",
        insight:
          "Structured Quran and Arabic journeys, tafsir themes, lectures, and community Q&A show that users want guided paths rather than a loose content library.",
      },
      {
        title: "The Qalam Podcast App",
        authority: "Qalam Institute",
        url: "https://www.qalam.institute/app",
        insight:
          "Long-form Islamic learning apps organize lectures across Sirah, Hadith, Tafsir, and more, giving users an audio-first way to keep learning beyond reading screens.",
      },
      {
        title: "Muslim Central Android App",
        authority: "Muslim Central",
        url: "https://play.google.com/store/apps/details?id=com.muslimcentralaudio&hl=en-US",
        insight:
          "Large lecture catalogs compete on offline downloads, playlists, playback controls, favorites, history, search, speed controls, and speaker breadth.",
      },
    ],
    nuraiOpportunity:
      "Build NurAI's own reviewed lesson and audio layer from approved books, owned recordings, licensed transcripts, chapter narration, notes, quizzes, and source-grounded AI summaries.",
    safetyBoundary:
      "Do not copy, mirror, or summarize third-party paid lectures without permission; competitor links are research signals, while NurAI content must be owned, licensed, or public-domain with clear rights.",
    nextBuild: [
      "Surface audio path readiness inside Library so users can move through listen, read, reflect, quiz, and offline preparation from one path.",
      "Expand offline audio queues, playback speed, bookmarks, and resume state for in-house chapter narration.",
      "Keep transcript/source review gates visible before AI creates summaries, flashcards, or lesson answers.",
    ],
    implementedEvidence: [
      "client/services/libraryLearningPathService.ts",
      "client/services/libraryAudioPathService.ts",
      "client/services/libraryNarrationService.ts",
      "client/screens/BookReaderScreen.tsx",
      "scripts/check-library-audio-paths-release.ts",
      "npm run check:library-audio-paths-release",
    ],
  },
  {
    id: "family-safe-kids-learning",
    category: "learning",
    title: "Family-safe kids learning mode",
    priority: 2,
    status: "partially-built",
    lastChecked: "2026-06-01",
    sourceSignals: [
      {
        title: "Kahf Kids Parental Control",
        authority: "Kahf Kids",
        url: "https://kahfkids.com/parental-control/",
        insight:
          "Muslim family apps are combining ad-free curated videos, Quran learning tools, games, app/site controls, parent approval, study-time limits, and parent dashboards.",
      },
      {
        title: "Deenee",
        authority: "Deenee",
        url: "https://deenee.app/",
        insight:
          "Child-focused Islamic learning products are moving toward personalised, trustworthy education paths with scholar-validated material and age-aware lessons.",
      },
    ],
    nuraiOpportunity:
      "Build an in-house Kids Deen mode with parent-approved lessons, Quran games, ad-free story cards, family challenges, progress visibility, and source-reviewed child-safe explanations.",
    safetyBoundary:
      "Do not give children unsupervised open-ended AI chat, unreviewed stories, external video feeds, or reward loops that pressure worship; parent controls and reviewed content come first.",
    nextBuild: [
      "Add real parent approval state per lesson pack, including approve, pause, archive, and review-history controls.",
      "Turn approved NurAI books into age-banded story cards, quizzes, Quran manners games, and family challenge packs.",
      "Connect child-safety review packets to scholar/content reviewer signoff before any AI-generated explanation or narration reaches Kids Mode.",
    ],
    implementedEvidence: [
      "client/services/familySafeKidsLearningService.ts",
      "client/screens/KidsModeScreen.tsx",
      "client/screens/KidsParentScreen.tsx",
      "scripts/check-family-safe-kids-learning-release.ts",
      "npm run check:family-safe-kids-learning-release",
    ],
  },
  {
    id: "credible-learning-library",
    category: "learning",
    title: "Credible reviewed learning library",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "Yaqeen Institute App",
        authority: "Yaqeen Institute",
        url: "https://apps.apple.com/us/app/yaqeen-institute/id1341006949",
        insight:
          "Credible Islamic learning products combine scholar and researcher trust with research papers, videos, multimedia content, saved learning, and clear institutional identity.",
      },
      {
        title: "Quran.com Developers",
        authority: "Quran.com",
        url: "https://quran.com/developers",
        insight:
          "A serious Quran learning layer needs robust source infrastructure, translations, tafsir, recitations, word-by-word data, and search.",
      },
    ],
    nuraiOpportunity:
      "Ship books as a reviewed learning product with source cards, review packets, signoff evidence, progress, narration, and AI chapter explanations after approval.",
    safetyBoundary:
      "Do not call the books fully published, scholar-reviewed, or highest-standard complete until real evidence is imported and the gate passes.",
    nextBuild: [
      "Complete editorial/source/scholar review evidence for all 60 books.",
      "Publish only through the guarded evidence import workflow.",
      "Use AI chapter explanations only after approved source-review audit.",
    ],
    implementedEvidence: [
      "client/data/libraryBooks.ts",
      "scripts/check-library-content-completion.ts",
      "scripts/export-library-review-packets.ts",
      "scripts/apply-library-review-evidence.ts",
    ],
  },
  {
    id: "zakat-and-giving-cockpit",
    category: "finance",
    title: "Zakat and ethical giving cockpit",
    priority: 2,
    status: "partially-built",
    lastChecked: "2026-05-17",
    sourceSignals: [
      {
        title: "LaunchGood Zakat Policy",
        authority: "LaunchGood",
        url: "https://www.launchgood.com/zakatpolicy",
        insight:
          "Zakat giving workflows need eligibility categories, scholar-reviewed policy boundaries, difference-of-opinion settings, verified-campaign labelling, and clear reminders that the donor remains responsible for fulfilling the obligation correctly.",
      },
      {
        title: "Islamic Relief Zakat FAQ",
        authority: "Islamic Relief Worldwide",
        url: "https://islamic-relief.org/zakat-faq/",
        insight:
          "Zakat tools need a Hijri seed-date reminder, nisab awareness, asset and debt checklists, and clear treatment of special cases such as savings for Hajj, pensions, shares, business stock, debts, and zakat al-fitr.",
      },
    ],
    nuraiOpportunity:
      "Build an in-house Zakat planner that separates estimates, source-linked method notes, Hijri reminders, asset/debt checklists, donation records, and questions that need scholar or accountant review.",
    safetyBoundary:
      "Do not present contested Zakat calculations as a final ruling, auto-endorse charities, or hide methodology differences; complex business, investment, family, and charity-eligibility cases need qualified review.",
    nextBuild: [
      "Add nisab source timestamps, Hijri seed-date reminders, and saved asset/debt checklists.",
      "Separate calculator estimates from scholar-reviewed method notes and unresolved edge cases.",
      "Add donation and receipt organization without marking charities as verified until a real verification process exists.",
    ],
    implementedEvidence: [
      "client/screens/ZakatScreen.tsx",
      "scripts/check-user-facing-claims.js",
    ],
  },
  {
    id: "accessible-offline-pilgrim-mode",
    category: "accessibility",
    title: "Accessible offline pilgrim mode",
    priority: 2,
    status: "partially-built",
    lastChecked: "2026-06-01",
    sourceSignals: [
      {
        title: "Nusuk without internet consumption",
        authority: "Saudi Ministry of Hajj and Umrah",
        url: "https://haj.gov.sa/en/Media-Center/Ministry-News/Ministry-of-Hajj-and-Umrah-activates-the-Nusuk-application-without-internet-consumption-to-serve-the",
        insight:
          "Pilgrimage support must account for tired users, low connectivity, crowded places, battery constraints, and official service workflows.",
      },
      {
        title: "CDC Yellow Book Hajj and Umrah",
        authority: "U.S. CDC",
        url: "https://www.cdc.gov/yellow-book/hcp/africa-middle-east/saudi-arabia-hajj-and-umrah-pilgrimages.html",
        insight:
          "Mass gatherings require preparation for medication, heat, crowds, injury, chronic conditions, and emergency planning.",
      },
      {
        title: "Mobile Accessibility at W3C",
        authority: "W3C Web Accessibility Initiative",
        url: "https://www.w3.org/WAI/standards-guidelines/mobile/",
        insight:
          "W3C treats mobile accessibility as part of WCAG and highlights touchscreens, small screens, different input modalities, and bright-sunlight contexts, all of which matter for tired pilgrims using phones in crowded places.",
      },
    ],
    nuraiOpportunity:
      "Add a low-cognitive-load mode with large text, one next action, offline duas/rites/checklists, hotel/meeting cards, emergency contacts, and source timestamps.",
    safetyBoundary:
      "NurAI can organize preparation and official links, but emergency symptoms, medication changes, pregnancy, and personal medical cases need clinicians or emergency services.",
    nextBuild: [
      "Persist a dedicated large-text pilgrim card that can be opened without navigating the full Travel screen.",
      "Add one-tap family/group sharing for meeting point, hotel/camp, and emergency contact cards.",
      "Keep health and medication prompts linked to official or clinician routes rather than AI medical advice.",
    ],
    implementedEvidence: [
      "client/services/accessiblePilgrimModeService.ts",
      "client/services/pilgrimCardService.ts",
      "client/screens/TravelCompanionScreen.tsx",
      "scripts/check-accessible-pilgrim-mode-release.ts",
      "npm run check:accessible-pilgrim-mode-release",
    ],
  },
  {
    id: "release-evidence-maintainability-runway",
    category: "release-readiness",
    title: "Release evidence and maintainability runway",
    priority: 1,
    status: "partially-built",
    lastChecked: "2026-06-01",
    sourceSignals: [
      {
        title: "App Review Guidelines",
        authority: "Apple Developer",
        url: "https://developer.apple.com/app-store/review/guidelines/",
        insight:
          "Apple review depends on safety, performance, business, design, and legal compliance, so NurAI's submission package needs traceable proof for AI boundaries, subscriptions, privacy, and religious claims before stronger launch language is used.",
      },
      {
        title: "Pre-launch reports",
        authority: "Google Play Console",
        url: "https://play.google.com/console/about/pre-launchreports/?hl=en",
        insight:
          "Google Play pre-launch reports position automated device, locale, and version checks as a launch-readiness tool, which supports keeping screenshot capture, technical QA, and production proof as separate evidence lanes.",
      },
      {
        title: "Android vitals",
        authority: "Google Play Console Help",
        url: "https://support.google.com/googleplay/android-developer/answer/9844486?hl=en-EN",
        insight:
          "Android vitals evaluates technical quality over recent production data, so NurAI needs post-release monitoring and owner action loops rather than treating a local build pass as ongoing app quality proof.",
      },
    ],
    nuraiOpportunity:
      "Make release operations a product-quality surface: logical review slices, owner handoffs, no-secret evidence intake, screenshot truth gates, production smoke proof, database proof, and post-release monitoring.",
    safetyBoundary:
      "Do not call NurAI launch-ready, production-ready, reviewed, or compliant just because local checks or screenshots pass; external runtime, database, store, and human review evidence must stay explicit.",
    nextBuild: [
      "Keep the App Store showcase maintainability runway aligned with logical slice commands and release blockers.",
      "Add post-launch health owner actions for deployed AI smoke, Android vitals, crash reporting, accessibility retakes, and store review feedback.",
      "Split the large worktree into source, review, release, and generated-artifact slices before commit handoff.",
    ],
    implementedEvidence: [
      "client/services/appStoreShowcaseService.ts",
      "client/screens/AppStoreShowcaseScreen.tsx",
      "scripts/export-logical-change-slices.js",
      "scripts/check-app-store-showcase-release.ts",
      "App Store post-release watch plan for AI smoke, DB migrations, store review, crash/vitals, accessibility, and Library drift.",
      "docs/audit/nurai-change-slice-manifest.md",
    ],
  },
];
