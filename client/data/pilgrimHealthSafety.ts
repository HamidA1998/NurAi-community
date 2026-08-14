import { OFFICIAL_SERVICE_LINKS } from "@/data/officialServiceLinks";

export type PilgrimSafetyPhase = "before-travel" | "in-journey" | "urgent-help";

export type PilgrimSafetyRiskLevel = "prepare" | "watch" | "urgent";

export type PilgrimSafetyTopic = {
  id: string;
  title: string;
  phase: PilgrimSafetyPhase;
  riskLevel: PilgrimSafetyRiskLevel;
  summary: string;
  userActions: string[];
  officialSourceIds: string[];
  notFor: string;
  escalation: string;
  offlineReady: boolean;
};

export type PilgrimEmergencyContact = {
  id: string;
  label: string;
  value: string;
  countryScope: "saudi-arabia";
  sourceLinkId: string;
  useFor: string;
  caveat: string;
};

export type PilgrimHealthReadinessItem = {
  id: string;
  title: string;
  phase: PilgrimSafetyPhase;
  summary: string;
  checkLabel: string;
  officialSourceIds: string[];
  sourceReason: string;
  offlineReady: boolean;
};

export const PILGRIM_HEALTH_SAFETY_LAST_REVIEWED = "2026-05-17";

export const PILGRIM_EMERGENCY_CONTACTS: PilgrimEmergencyContact[] = [
  {
    id: "pilgrim-call-center-937",
    label: "Pilgrim health call center",
    value: "937",
    countryScope: "saudi-arabia",
    sourceLinkId: "nusuk-umrah-health-guidelines",
    useFor:
      "Saudi pilgrim support route for health-service guidance shown by the official Nusuk health page.",
    caveat:
      "Confirm the live official page before travel and use local emergency services for immediate danger.",
  },
  {
    id: "police-999-911",
    label: "Police emergency",
    value: "999 / 911",
    countryScope: "saudi-arabia",
    sourceLinkId: "nusuk-umrah-health-guidelines",
    useFor:
      "Saudi emergency route listed by Nusuk for urgent safety situations.",
    caveat:
      "Use only when in Saudi Arabia and follow official instructions from local authorities.",
  },
  {
    id: "moh-unified-number",
    label: "Ministry unified number",
    value: "00966920002814",
    countryScope: "saudi-arabia",
    sourceLinkId: "nusuk-umrah-health-guidelines",
    useFor:
      "Official unified contact number shown on Nusuk health guidance for pilgrim support.",
    caveat:
      "Phone numbers can change; keep the source timestamp visible and refresh before departure.",
  },
];

export const PILGRIM_HEALTH_READINESS_CHECKLIST: PilgrimHealthReadinessItem[] =
  [
    {
      id: "confirm-current-health-requirements",
      title: "Confirm current health requirements",
      phase: "before-travel",
      summary:
        "Open the Saudi Ministry of Health and Nusuk pages before departure because vaccine, certificate, and point-of-entry rules can change.",
      checkLabel: "I checked the live official health requirements.",
      officialSourceIds: [
        "saudi-moh-pilgrim-health",
        "nusuk-hajj-health-guidelines",
      ],
      sourceReason:
        "MOH is the authority for changing public-health requirements; Nusuk links pilgrim preparation to the official Hajj route.",
      offlineReady: false,
    },
    {
      id: "clinician-plan-for-higher-risk-pilgrims",
      title: "Make a clinician plan if higher risk",
      phase: "before-travel",
      summary:
        "Older pilgrims, pregnant pilgrims, disabled pilgrims, and anyone with chronic conditions should discuss travel preparation with a qualified clinician.",
      checkLabel: "I know when I need clinician advice before travel.",
      officialSourceIds: [
        "nusuk-hajj-health-guidelines",
        "cdc-hajj-umrah-yellow-book",
      ],
      sourceReason:
        "Official health guidance routes higher-risk and chronic-condition preparation to qualified health professionals.",
      offlineReady: true,
    },
    {
      id: "pack-medication-documents",
      title: "Pack medication and documents",
      phase: "before-travel",
      summary:
        "Prepare medicine in original packaging, prescription details, generic medicine names, batteries, and medical-equipment notes before travel.",
      checkLabel: "My medication and access documents are ready.",
      officialSourceIds: [
        "nusuk-hajj-health-guidelines",
        "cdc-hajj-umrah-yellow-book",
      ],
      sourceReason:
        "Nusuk and travel-medicine guidance both highlight medication preparation and documentation before pilgrimage.",
      offlineReady: true,
    },
    {
      id: "heat-hydration-rest-plan",
      title: "Plan heat, hydration and rest",
      phase: "in-journey",
      summary:
        "Agree water, shade, rest, and cooler-time plans before the most physically demanding movement, especially in crowds and hot weather.",
      checkLabel: "I have a simple hydration and rest plan.",
      officialSourceIds: [
        "nusuk-hajj-health-guidelines",
        "cdc-hajj-umrah-yellow-book",
      ],
      sourceReason:
        "Official health sources repeatedly warn pilgrims about heat stress, dehydration, fatigue, and crowd exposure.",
      offlineReady: true,
    },
    {
      id: "mobility-footwear-meeting-point",
      title: "Set mobility and meeting-point support",
      phase: "in-journey",
      summary:
        "Prepare suitable footwear where allowed, mobility aids, companion support, group-leader contact details, and a meeting point before crowded movement.",
      checkLabel: "My footwear, access support, and meeting point are ready.",
      officialSourceIds: [
        "nusuk-hajj-health-guidelines",
        "nusuk-umrah-health-guidelines",
      ],
      sourceReason:
        "Nusuk health guidance covers falls, accessibility, health facilities, and preparation for crowded pilgrimage movement.",
      offlineReady: true,
    },
    {
      id: "save-emergency-routes-offline",
      title: "Save emergency routes offline",
      phase: "urgent-help",
      summary:
        "Keep official Saudi emergency numbers, hotel details, group contacts, and medical or accessibility notes available in large text.",
      checkLabel: "My emergency contacts and offline pilgrim card are saved.",
      officialSourceIds: [
        "nusuk-umrah-health-guidelines",
        "nusuk-hajj-health-guidelines",
      ],
      sourceReason:
        "Nusuk health guidance publishes emergency routes and health-service contact points for pilgrims in Saudi Arabia.",
      offlineReady: true,
    },
  ];

export const PILGRIM_HEALTH_SAFETY_TOPICS: PilgrimSafetyTopic[] = [
  {
    id: "health-requirements-check",
    title: "Health requirements check",
    phase: "before-travel",
    riskLevel: "prepare",
    summary:
      "Route pilgrims to the latest official health requirements instead of freezing vaccination or entry rules inside NurAI.",
    userActions: [
      "Open the Saudi Ministry of Health source before booking final travel.",
      "Save any required certificates with your travel documents.",
      "Ask a clinician about personal medical conditions before departure.",
    ],
    officialSourceIds: ["saudi-moh-pilgrim-health"],
    notFor:
      "NurAI must not decide vaccine eligibility, entry permission, or medical fitness for travel.",
    escalation:
      "Use the current Ministry page and a qualified clinician for personal health decisions.",
    offlineReady: false,
  },
  {
    id: "medication-and-documents",
    title: "Medication and documents",
    phase: "before-travel",
    riskLevel: "prepare",
    summary:
      "Help pilgrims prepare medication names, prescriptions, equipment batteries, and clinician notes before travel.",
    userActions: [
      "Pack medicine in original packaging with enough supply for the journey.",
      "Save prescription details and generic medicine names offline.",
      "Carry medical documentation for chronic conditions or medical equipment.",
    ],
    officialSourceIds: [
      "nusuk-hajj-health-guidelines",
      "cdc-hajj-umrah-yellow-book",
    ],
    notFor:
      "NurAI must not change doses, medication schedules, or treatment plans.",
    escalation:
      "Discuss medication timing, chronic illness, pregnancy, disability, or high-risk travel with a clinician.",
    offlineReady: true,
  },
  {
    id: "heat-hydration-rest",
    title: "Heat, hydration and rest",
    phase: "in-journey",
    riskLevel: "watch",
    summary:
      "Turn official heat and dehydration guidance into gentle reminders for shade, water, rest, and avoiding unnecessary crowd exposure.",
    userActions: [
      "Keep water accessible and plan rest pauses before rituals become physically demanding.",
      "Use shade, umbrellas, light clothing, and cooler times where official guidance allows.",
      "Watch for dehydration, dizziness, confusion, rapid heartbeat, or severe weakness.",
    ],
    officialSourceIds: [
      "nusuk-hajj-health-guidelines",
      "cdc-hajj-umrah-yellow-book",
    ],
    notFor:
      "NurAI must not handle heat illness or tell users to delay urgent medical help.",
    escalation:
      "Seek immediate medical help for severe heat symptoms, confusion, fainting, chest pain, or breathing difficulty.",
    offlineReady: true,
  },
  {
    id: "falls-footwear-accessibility",
    title: "Falls, footwear and accessibility",
    phase: "in-journey",
    riskLevel: "watch",
    summary:
      "Support older pilgrims and disabled pilgrims with footwear, mobility aids, companion plans, and low-cognitive-load route prompts.",
    userActions: [
      "Wear suitable footwear where allowed and keep feet dry and rested.",
      "Use canes, wheelchairs, hearing aids, eyewear, or companion support when needed.",
      "Agree a meeting point and helper contact before crowded movement.",
    ],
    officialSourceIds: ["nusuk-hajj-health-guidelines"],
    notFor:
      "NurAI must not override official accessibility routes, wheelchair provider rules, or medical advice.",
    escalation:
      "Use official service staff, healthcare facilities, or emergency services after a fall, injury, dizziness, or disorientation.",
    offlineReady: true,
  },
  {
    id: "respiratory-food-hygiene",
    title: "Respiratory, food and hygiene care",
    phase: "in-journey",
    riskLevel: "watch",
    summary:
      "Convert official hygiene guidance into small reminders around handwashing, cough etiquette, safe food habits, and respiratory care.",
    userActions: [
      "Wash hands before eating and after restroom use.",
      "Avoid sharing personal items when illness is present.",
      "Choose food and drink sources carefully and avoid unsafe leftovers in heat.",
    ],
    officialSourceIds: [
      "nusuk-hajj-health-guidelines",
      "nusuk-umrah-health-guidelines",
    ],
    notFor:
      "NurAI must not diagnose infection, food poisoning, or respiratory illness.",
    escalation:
      "Seek medical help for persistent fever, breathing difficulty, severe vomiting, dehydration, or worsening symptoms.",
    offlineReady: true,
  },
  {
    id: "urgent-help-card",
    title: "Urgent help card",
    phase: "urgent-help",
    riskLevel: "urgent",
    summary:
      "Keep Saudi Arabia emergency contacts, hotel/group details, and official health links available in large text for tired or separated pilgrims.",
    userActions: [
      "Save hotel, group leader, family, and emergency contacts before departure.",
      "Keep the official source timestamp visible on the card.",
      "Use Saudi emergency services or nearby official staff for immediate danger.",
    ],
    officialSourceIds: [
      "nusuk-umrah-health-guidelines",
      "nusuk-hajj-health-guidelines",
    ],
    notFor:
      "NurAI must not act as an emergency authority, medical decision-maker, or Saudi official service.",
    escalation:
      "For immediate danger, call local emergency services, ask official staff nearby, or go to the nearest health facility.",
    offlineReady: true,
  },
];

export const PILGRIM_HEALTH_SAFETY_SOURCE_IDS = new Set(
  OFFICIAL_SERVICE_LINKS.map((link) => link.id),
);
