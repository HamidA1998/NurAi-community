export type OfficialServiceCategory =
  | "official-platform"
  | "visa-booking"
  | "permit-visit"
  | "identity"
  | "health"
  | "safety"
  | "transport"
  | "guidance";

export type OfficialServiceAuthority =
  | "Saudi Ministry of Hajj and Umrah"
  | "Nusuk"
  | "Saudi Ministry of Health"
  | "Saudi Pilgrim Experience Program"
  | "U.S. Department of State"
  | "U.S. CDC"
  | "Saudi Arabia Railways";

export type OfficialServiceLink = {
  id: string;
  title: string;
  authority: OfficialServiceAuthority;
  category: OfficialServiceCategory;
  url: string;
  countryScope: "global" | "saudi-arabia" | "us-travelers";
  sourceType:
    | "official-government"
    | "official-platform"
    | "health-authority"
    | "travel-advisory"
    | "transport-provider";
  lastChecked: string;
  refreshCadenceDays: number;
  summary: string;
  useFor: string;
  doNotUseFor: string;
  externalAuthorityWarning: string;
};

export const OFFICIAL_SERVICE_LINKS: OfficialServiceLink[] = [
  {
    id: "nusuk-official-platform",
    title: "Nusuk Official Platform",
    authority: "Nusuk",
    category: "official-platform",
    url: "https://www.nusuk.sa/en",
    countryScope: "global",
    sourceType: "official-platform",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 30,
    summary:
      "Official Saudi platform for pilgrimage planning and official Hajj/Umrah service routing.",
    useFor:
      "Opening the official Nusuk route for permits, planning, official service discovery, and account-based pilgrim actions.",
    doNotUseFor:
      "NurAI must not claim to issue permits, visas, bookings, Rawdah access, or official credentials itself.",
    externalAuthorityWarning:
      "Complete official actions only inside Nusuk or the relevant Saudi official service.",
  },
  {
    id: "nusuk-umrah-platform",
    title: "Nusuk Umrah Platform",
    authority: "Nusuk",
    category: "visa-booking",
    url: "https://umrah.nusuk.sa/",
    countryScope: "global",
    sourceType: "official-platform",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 30,
    summary:
      "Official Umrah service route for visa, accommodation, transport, Rawdah, heritage visits, and package planning.",
    useFor:
      "Sending users to the official Umrah planning and provider route before bookings or payments.",
    doNotUseFor:
      "NurAI must not present package availability, prices, refund terms, or provider licensing as its own verified data.",
    externalAuthorityWarning:
      "Check the live Nusuk Umrah page before paying or relying on travel-service availability.",
  },
  {
    id: "ministry-hajj-umrah",
    title: "Ministry of Hajj and Umrah",
    authority: "Saudi Ministry of Hajj and Umrah",
    category: "official-platform",
    url: "https://haj.gov.sa/en",
    countryScope: "global",
    sourceType: "official-government",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 30,
    summary:
      "Official Ministry source for Hajj and Umrah announcements, awareness guides, initiatives, and services.",
    useFor:
      "Source-checking Ministry announcements, awareness guides, official initiatives, and policy-sensitive pilgrimage information.",
    doNotUseFor:
      "NurAI must not turn Ministry guidance into personal legal, medical, visa, or fiqh advice without the official context visible.",
    externalAuthorityWarning:
      "Use the Ministry page as the authority when rules or services may have changed.",
  },
  {
    id: "nusuk-card-ministry",
    title: "Nusuk Card Official Initiative",
    authority: "Saudi Ministry of Hajj and Umrah",
    category: "identity",
    url: "https://haj.gov.sa/en/About-the-ministry/Ministry-initiatives/Nusuk-Card?NuskCardType=Nusuk+Card+for+Pilgrims",
    countryScope: "saudi-arabia",
    sourceType: "official-government",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 60,
    summary:
      "Official Ministry page for the Nusuk Card pilgrim identity initiative, including holy-site access, accommodation, service-provider, bus boarding, group gathering, complaint, lost-card, and digital-card guidance.",
    useFor:
      "Explaining what must stay inside the official Nusuk/Tawakkalna identity flow while NurAI stores only private helper notes such as hotel, group, and emergency-contact cards.",
    doNotUseFor:
      "NurAI must not issue, duplicate, alter, verify, or replace an official Nusuk Card or Hajj credential.",
    externalAuthorityWarning:
      "Official pilgrim identity, credential status, group routing, and re-issuance belong to Saudi official systems and service providers.",
  },
  {
    id: "nusuk-hajj-health-guidelines",
    title: "Nusuk Hajj Health Guidelines",
    authority: "Nusuk",
    category: "health",
    url: "https://hajj.nusuk.sa/nusuk/health/guidelines",
    countryScope: "global",
    sourceType: "health-authority",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 30,
    summary:
      "Nusuk guidance for Hajj health preparation, medication documents, emergency contacts, and high-risk pilgrim precautions.",
    useFor:
      "Linking users to official Hajj health preparation before travel and during pilgrimage.",
    doNotUseFor:
      "NurAI must not diagnose symptoms, replace a clinician, or decide if a user is medically fit to travel.",
    externalAuthorityWarning:
      "Health requirements can change; users should follow the live official health page and their clinician.",
  },
  {
    id: "nusuk-umrah-health-guidelines",
    title: "Nusuk Umrah Health Guidelines",
    authority: "Nusuk",
    category: "health",
    url: "https://umrah.nusuk.sa/nusuk/health/guidelines",
    countryScope: "global",
    sourceType: "health-authority",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 30,
    summary:
      "Official Umrah health guidance covering dehydration, falls, respiratory illness, food safety, emergencies, and support services.",
    useFor:
      "Showing source-backed Umrah health readiness cards and official emergency-preparation links.",
    doNotUseFor:
      "NurAI must not provide personal medical treatment plans, medication changes, or emergency triage as an authority.",
    externalAuthorityWarning:
      "Use the live Nusuk health page and emergency services for urgent or personal medical situations.",
  },
  {
    id: "saudi-moh-pilgrim-health",
    title: "Saudi MOH Pilgrims Health Requirements",
    authority: "Saudi Ministry of Health",
    category: "health",
    url: "https://www.moh.gov.sa/en/healthawareness/pilgrims-health/pages/default.aspx",
    countryScope: "global",
    sourceType: "health-authority",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 30,
    summary:
      "Saudi Ministry of Health source for Hajj and Umrah health requirements and point-of-entry preventive measures.",
    useFor:
      "Routing users to the latest official vaccine, entry, and public-health requirements.",
    doNotUseFor:
      "NurAI must not hard-code vaccine or entry rules as permanently valid app advice.",
    externalAuthorityWarning:
      "Check the current MOH page before travel because health requirements can change.",
  },
  {
    id: "travel-state-hajj-umrah",
    title: "Travel.State.gov Hajj and Umrah Guidance",
    authority: "U.S. Department of State",
    category: "safety",
    url: "https://travel.state.gov/en/international-travel/planning/safety-tips/hajj-umrah-pilgrimage.html",
    countryScope: "us-travelers",
    sourceType: "travel-advisory",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 30,
    summary:
      "U.S. travel guidance warning about official channels, scams, documents, permits, and safety for Hajj and Umrah.",
    useFor:
      "Anti-scam and official-channel warnings for U.S. travelers and users who need a conservative safety checklist.",
    doNotUseFor:
      "NurAI must not present U.S.-specific guidance as universal legal advice for every country.",
    externalAuthorityWarning:
      "Travel rules and consular guidance vary by country; users should check their own government's live advice.",
  },
  {
    id: "cdc-hajj-umrah-yellow-book",
    title: "CDC Yellow Book Hajj and Umrah",
    authority: "U.S. CDC",
    category: "health",
    url: "https://www.cdc.gov/yellow-book/hcp/africa-middle-east/saudi-arabia-hajj-and-umrah-pilgrimages.html",
    countryScope: "us-travelers",
    sourceType: "health-authority",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 60,
    summary:
      "CDC travel-medicine reference for Hajj and Umrah health preparation, medications, vaccines, crowds, heat, traffic, and high-risk travelers.",
    useFor:
      "Adding source-backed health-readiness prompts and clinician-routing language.",
    doNotUseFor:
      "NurAI must not replace travel-medicine consultation, emergency advice, or country-specific medical requirements.",
    externalAuthorityWarning:
      "Users should confirm current medical requirements with official health authorities and clinicians.",
  },
  {
    id: "pilgrim-experience-program-nusuk",
    title: "Pilgrim Experience Program Nusuk Update",
    authority: "Saudi Pilgrim Experience Program",
    category: "official-platform",
    url: "https://pep.gov.sa/en/news/704",
    countryScope: "global",
    sourceType: "official-government",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 90,
    summary:
      "Official update describing Nusuk scale and services across planning, travel, hotels, flights, tours, Quran, prayer times, and Qibla.",
    useFor:
      "Understanding the official Nusuk service boundary that NurAI should complement rather than replace.",
    doNotUseFor:
      "NurAI must not copy Nusuk service claims into its own app unless the source and timestamp are visible.",
    externalAuthorityWarning:
      "Treat Nusuk and Saudi official channels as the authority for official pilgrimage service status.",
  },
  {
    id: "hajj-1447-registration-nusuk",
    title: "Hajj 1447 AH Registration Through Nusuk",
    authority: "Saudi Pilgrim Experience Program",
    category: "visa-booking",
    url: "https://pep.gov.sa/en/news/874",
    countryScope: "saudi-arabia",
    sourceType: "official-government",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 30,
    summary:
      "Official 2026 update stating that eligible domestic Hajj registration, eligibility, package selection, payment, and permit flow are routed through the Nusuk app or official website.",
    useFor:
      "Warning users to complete Hajj registration, package selection, payment, and permit actions only through official Nusuk routes and licensed providers.",
    doNotUseFor:
      "NurAI must not register pilgrims, collect Hajj payments, claim seat availability, or present third-party package offers as official.",
    externalAuthorityWarning:
      "Use the live Nusuk app or official website for registration and package status; NurAI can only prepare and link users to official routes.",
  },
  {
    id: "haramain-high-speed-railway",
    title: "Haramain High-Speed Railway",
    authority: "Saudi Arabia Railways",
    category: "transport",
    url: "https://sar.hhr.sa/",
    countryScope: "saudi-arabia",
    sourceType: "transport-provider",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 30,
    summary:
      "Official Haramain High-Speed Railway route for train planning between major pilgrimage travel points.",
    useFor:
      "Linking users to official train booking/status while storing only their personal itinerary notes in NurAI.",
    doNotUseFor:
      "NurAI must not claim train availability, prices, gates, or delays without live official confirmation.",
    externalAuthorityWarning:
      "Confirm schedules, tickets, gates, and policies on the live Haramain Railway service.",
  },
  {
    id: "ministry-umrah-awareness-guide",
    title: "Ministry Umrah Awareness Guide",
    authority: "Saudi Ministry of Hajj and Umrah",
    category: "guidance",
    url: "https://haj.gov.sa/-/media/Project/HAJJ/Awareness-Guides/Umrah-Guide-for-Domestic-Pilgrims/EN-Umrah-Guide-for-Domestic-Pilgrims.pdf",
    countryScope: "saudi-arabia",
    sourceType: "official-government",
    lastChecked: "2026-07-15",
    refreshCadenceDays: 60,
    summary:
      "Official awareness guide covering Umrah preparation, transport, mosque services, crowded periods, and accessibility routes.",
    useFor:
      "Source-backing travel prep, transport, accessibility, and mosque-service cards with visible timestamping.",
    doNotUseFor:
      "NurAI must not convert guide details into live crowd, gate, route, or service availability claims.",
    externalAuthorityWarning:
      "Use current official pages for live services, crowd status, and transport changes.",
  },
];

export const OFFICIAL_SERVICE_LAST_REVIEWED = "2026-07-15";
