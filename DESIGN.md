---
name: NurAI Quiet Intelligence
description: A calm, private, source-aware visual system for NurAI's worship, learning, health, and personal guidance experiences.
colors:
  primary: "#56B394"
  background: "#071A1A"
  ink: "#0B1114"
  surface: "#101C1D"
  surfaceElevated: "#142425"
  surfaceMuted: "#192A2A"
  emerald: "#56B394"
  emeraldMuted: "#3E8C78"
  gold: "#CFAE69"
  ivory: "#F3F0E8"
  textSecondary: "#B8C2BD"
  textMuted: "#77847E"
  divider: "rgba(184, 194, 189, 0.12)"
  warning: "#E2A94D"
  critical: "#D9827C"
typography:
  editorial: "Libre Baskerville"
  interface: "Plus Jakarta Sans"
  arabic: "Noto Naskh Arabic"
  quran: "Amiri Quran"
rounded:
  card: "16px"
  inset: "12px"
  control: "12px"
  pill: "999px"
spacing:
  screenX: "20"
  sectionY: "32"
  cardPadding: "20"
  compactPadding: "16"
components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.cardPadding}"
  insetCard:
    backgroundColor: "{colors.surfaceElevated}"
    rounded: "{rounded.inset}"
    padding: "{spacing.compactPadding}"
  primaryButton:
    backgroundColor: "{colors.emerald}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  spiritualHighlight:
    textColor: "{colors.gold}"
  bodyText:
    textColor: "{colors.ivory}"
    typography: "{typography.interface}"
  secondaryText:
    textColor: "{colors.textSecondary}"
  mutedText:
    textColor: "{colors.textMuted}"
  criticalMessage:
    textColor: "{colors.critical}"
  warningMessage:
    textColor: "{colors.warning}"
  divider:
    backgroundColor: "{colors.divider}"
    height: "1px"
  mutedSurface:
    backgroundColor: "{colors.surfaceMuted}"
    rounded: "{rounded.inset}"
  glassSurface:
    backgroundColor: "rgba(16, 28, 29, 0.62)"
    rounded: "{rounded.card}"
  secondaryAction:
    backgroundColor: "{colors.emeraldMuted}"
    textColor: "{colors.ink}"
---

## Overview

NurAI is a quiet Islamic companion, not a dashboard and not a decorative technology demo. It should feel private, mature, precise, and warm. The interface earns trust through clear hierarchy, accurate status, readable religious content, restrained materials, and predictable interactions.

Every primary screen has one sentence job and one dominant focal point. Complexity is disclosed only when the user asks for it. Personal intelligence appears as one useful message whose next step is stated in plain language, never as multiple competing AI modules or an in-card action dashboard.

## Colors

Deep midnight and ink form the permanent canvas. NurAI is a dark-only product: every route, sheet, native header, loading state, and launch surface resolves to the same calm night atmosphere regardless of the device appearance setting. A restrained emerald/deep-blue aurora may sit behind primary tab screens so liquid-glass surfaces have real depth to refract. It is atmosphere, never content, and becomes static when Reduce Motion is enabled.

- `#56B394` is the canonical emerald for primary action, active state, successful progress, live guidance, and ordinary utility icons. Do not introduce brighter cyan or mint substitutes.
- Gold is reserved for Quran emphasis, spiritual milestones, citations, and rare premium moments.
- Warning amber is separate from sacred gold and is used only for incomplete, caution, or needs-attention states.
- Ivory is the primary dark-mode text color. Secondary and muted text must retain readable contrast.
- A surface uses one accent at most. Do not combine cyan, emerald, lime, and gold in one card.
- Gradients are exceptional and may only clarify a live state, the shared low-contrast aurora, or a single hero moment. They are not default card backgrounds.
- Remove glow, wallpaper geometry, and decorative orbs from content-dense surfaces. The functional Qibla/prayer orb is the exception. Aurora shapes stay behind content and never reduce text contrast.

## Typography

Libre Baskerville gives major editorial moments a calm voice. Plus Jakarta Sans carries navigation, controls, body text, metrics, and dense utility. Use dedicated Arabic and Quran fonts with generous line height.

The product scale is Display 32/40, Large title 26/34, Section title 20/28, Body 16/24, Body small 14/21, Caption 12/18, Overline 11/16, and Numeric metric 28/34 with tabular numerals. Letter spacing is always zero. Avoid all-caps except short overlines. Never shrink copy to force it into a fixed card.

## Layout

Use the 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 spacing scale. Default screen gutters are 20 points and major section gaps are 32 points. Prefer section spacing and dividers over wrapping every idea in a card.

Home answers four questions in order: what matters now, what is next, what can I continue, and what small action will improve today. Its first viewport contains prayer status, one personal insight, one continuation, and no feature catalogue.

Home Quick Actions is a compact action layer, not a second Explore screen. It may show one live continuation, then exactly four user-selected destinations in one shared glass rail. Search and Edit remain separate 44-point controls; settings, subscription plans, and unrelated utility chips never form a second shortcut row. Tapping Edit opens the categorised tool picker in edit mode, long-pressing a home destination opens that same editor with a slot selected, and the editor keeps explicit accessible move controls alongside tap-to-replace. The four selected destinations persist locally.

Personal Guide has three layers only: context, conversation, and suggested action. Its header stays compact, the conversation owns the canvas, and the composer remains visible above the keyboard and safe area. Assistant replies are never line-clamped or placed inside a fixed-height message surface: short and long guidance expands naturally inside the conversation, remains selectable, and can be read from its beginning without a content-size update forcing the list to the final line.

Travel has four workspaces only: Today for one journey summary and next action, Trip for explicitly saved itinerary details, Worship for prayer timing/checklists/duas, and Safety for location, offline notes, trusted contacts, and official pilgrim routes. It uses the shared theme-aware Aurora beneath native/fallback glass surfaces. Live provider data must be labelled honestly; the free prayer-first checklist and manual trip fallback must never be hidden behind Premium.

Saved trips use one editorial row per journey. Tapping edits, swiping left reveals Edit and Remove, long-press opens the same menu, and a visible overflow action keeps destructive controls available without requiring a gesture. Remove All always confirms and clears itinerary data without silently deleting the saved home location. Foreground auto-detection runs only while Travel is open and enabled, never prompts for location without an explicit user action, refreshes at a battery-conscious interval, and turns location, airport proximity, flight timing, and the next prayer into one timely next action rather than a live-tracking dashboard.

Apple Wallet is a native handoff, not a generic sharing workflow. Travel shows one Add to Apple Wallet action only when the signed-pass service is configured and the device reports that it can add passes. The downloaded pass is validated with `PKPass`, then presented with Apple's `PKAddPassesViewController`; cancellation remains quiet, successful addition receives one calm confirmation, and a later prayer can update the same per-user pass instead of creating duplicates. The pass contains the next prayer, calculated time, and general location only—never passport, permit, payment, booking, Nusuk identity, health, or family-contact data.

The Home intelligence card is `NurAIContextCard`: a single compact message, not a chat widget, daily ledger, promotion, or feature panel. Its shared Home composition is a 48-point emerald identity orb, `NUR AI` label, one short context label, a maximum three-line personalised message, and one 44-point chevron within a 22-point continuous Liquid Glass surface. Paid tiers may add one quiet, maximum-three-item Today’s Context rail for real daily progress, Quran or the next prayer, and Body care when an already-authorised summary exists; this is a compact signal row, never a progress grid, evidence list, upgrade button, or secondary CTA. Tapping anywhere opens Personal Guide with the ranked prompt and safe context already loaded. Save, Dismiss, Show fewer, and paid Refresh live in the long-press sheet and equivalent VoiceOver actions. Free messages are selected and written by deterministic on-device V3 rules; paid model wording may connect the same authorised signals and safe server memory but cannot invent evidence, routes, completion, religious claims, or private context. Home never requests health permission: it uses only the user-authorised summary already cached by Health, and the health adapter is wellbeing coaching rather than medical advice. New-message glow and replacement motion are brief, never auto-rotate while being read, and disappear under Reduce Motion.

## Elevation & Depth

Dark-mode depth comes from the background, one glass section surface, and muted inset rows. On supported iOS versions, glass uses the native material; elsewhere it falls back to blur plus a quiet tint and hairline highlight. Do not stack glass cards inside glass cards: one section owns the material and its rows use spacing or dividers. Shadows are reserved for temporary floating elements such as sheets, menus, toasts, the compact media player, and the bottom composer. No neon shadows or persistent glow.

## Shapes

Cards use 16-point continuous corners, inset rows use 12, and controls use 12. The compact Home `NurAIContextCard` uses a 22-point corner so the shared AI, Prayer, Weather, and Garden surfaces read as one family while the emerald identity orb keeps it distinct. Capsules are reserved for true pills, filters, compact statuses, and the bottom tab selection. Avoid nested cards; repeated rows inside a section may use an inset surface without another outline.

Segmented controls use one quiet translucent rail and one moving Liquid Glass selection lens with a restrained emerald tint. Never paint the selected tab as an opaque green block. The selection remains readable through icon, text weight, and accessibility state rather than colour alone, and its motion becomes immediate when Reduce Motion is enabled.

The five-destination bottom dock is a 54-point floating rail with 16-point side gutters. On iOS 26, both its continuous near-neutral surface and selected lens use the native `UIGlassEffect` bridge; NurAI must not paint another blur, highlight, emerald wash, or green capsule behind either material. The selected lens contains icon and label and has no second outline, glow, or nested box. Older iOS, Android, and web use the same geometry with the documented blur-and-hairline fallback. All paths keep the five labels, unread state, automation identifiers, Reduce Transparency behavior, and home-indicator clearance. The experimental React Navigation native tab host is not used until its `react-native-screens` contract matches the Expo runtime.

## Components

All new screens compose the shared NurAI primitives. Primary tab screens use the shared safe-area-aware header, Aurora backdrop, glass section surface, and bottom-bar clearance. A component owns its pressed, disabled, loading, empty, error, accessibility, and reduced-motion behavior. Screens do not hardcode brand colors, radii, type sizes, haptic patterns, or animation timings.

In-product identity and feature marks are authored vectors, never the full raster App Store artwork shrunk into a header or control. The compact NurAI mark uses one crescent, one guided N-shaped doorway, and one reserved gold point; it must remain legible from 16 to 54 points. Standard actions use the shared Phosphor-backed `AppIcon`, while Quran, Prayer, Qibla, Health, Community, audience, and tab identities use the custom NurAI SVG family. Real profile portraits remain compressed raster photographs and empty portraits use readable initials. Apple app icons, splash exports, Wallet artwork, and notification assets remain raster where the platform contract requires them, generated from approved masters rather than traced at runtime.

Primary actions remain solid emerald for unmistakable hierarchy. Secondary actions, icon buttons, and segmented selections use the shared glass material instead of flat dark fills or repeated outlines. A glass surface owns its own highlight edge; screens must not add a second border around it.

Persistent media controls remain compact enough to leave the underlying task usable. They appear only while media is active; an idle play prompt never floats over reading content because the content-level play action already owns that transition. Advanced queues, sleep timers, learning rails, and download controls belong in an explicit sheet rather than an always-expanded overlay.

Quran Home is a sanctuary, not a catalogue. It leads with the saved reading position and one dominant continuation, then a single Liquid Glass Read / Listen / Study selector, quiet progress, recent reading, and the surah index. Repeated actions use editorial rows and dividers instead of a card grid. The reader uses a full-width continuous reading surface rather than a stack of inset dashboard cards: the Arabic ayah is the dominant object, translation and study are progressively disclosed, and ayah boundaries come from whitespace, a restrained sacred-gold rule, and state-aware glass only when an ayah is playing or selected. Per-ayah bookmark, play, and icon-only study controls remain 44-point targets. The compact safe-area-aware header and active bottom playback dock must never obscure content or lose their dismiss controls.

Explore is an intent router, not a feature inventory. The opening surface owns the only search action and four priority routes. Below it, categories behave as a single-open accordion: collapsed groups show only their title, explanation, and item count; opening one closes the previous group. This preserves discoverability without exposing dozens of rows at once.

The free Personal Guide exposes the deterministic V3 daily briefing: what is complete, what remains, which visible signals were considered, and the ranked next action. Paid tiers may use the server model to improve wording and connect those same visible signals into richer context, but the model cannot invent completion, private activity, sources, routes, or rulings. The interface labels local and model-enhanced modes honestly.

Family Circle messaging treats queued delivery as waiting, never as a sent or failed message. One conversation-level status owns outbox recovery and “Send now”; queued bubbles say “Waiting to send” and do not repeat edit/retry controls. The latest bubble rests naturally above the safe-area-aware Liquid Glass composer without artificial bottom clearance. Client message IDs make retries idempotent, app foreground and a restrained 20-second interval retry only while a queue is visible, and recipient push notifications are created only after a new server message is stored. Transport failures preserve the exact draft locally; authorization or membership failures remain explicit and are never disguised as offline state.

Family Circle's primary shell has four calm workspaces: Home, People, Together, and Chat. Home owns one family pulse, one primary message action, a short people preview, and one next shared intention; it does not repeat the same progress in several command panels. People is a readable member list with direct actions plus small Live and Places subviews. Together contains goals and shared duas behind one small local switcher. Chat is a focused conversation with the composer anchored above the safe area. Saved places are family-defined labels; manual check-ins show only each member's current state; the Live view uses native Apple Maps on iOS and native Google Maps on Android to show only active, explicitly shared coordinates, refreshing while the view is open. One-time location sharing requires foreground permission and expires within two hours. Background tracking, arrival alerts, and history remain separate consent-led capabilities and must not appear as decorative placeholders until their privacy, permission, retention, and server contracts are ready.

Community and direct messaging are private, purposeful social spaces rather than engagement feeds. Connection discovery may use username or email, but the server owns audience separation, privacy, blocking, and accepted-connection checks. A direct-message photo is compressed before upload, visibly previewed, optionally captioned, and delivered through a private authenticated media route; no public URL or device path is exposed. “Beneficial” remains the public positive response. Negative feedback is the private “Show less” action so it can improve relevance without publishing dislike counts, encouraging pile-ons, or turning faith-centred posts into popularity contests.

The Qibla/prayer orb remains a signature functional object. The dedicated Qibla screen is one sacred instrument rather than a dashboard: live turn guidance, a responsive compass rose, Kaaba bearing, distance, heading quality, and selected location form one visual composition. Its spatial model is literal: the user is the quiet point at the centre, the Kaaba travels at the directional needle's destination, and the neutral gate at the top is where that destination aligns when the phone faces Qibla. The dial itself stays a high-contrast navigation instrument with restrained rim light and no blur over its markings; the status, guidance, readings, and location controls use a grouped native Liquid Glass container on supported iOS and the documented opaque fallback when transparency is reduced. Interactive glass is reserved for controls. Never label the centre as the Kaaba or duplicate the bearing as competing dashboard metrics. True-north, magnetic, static, permission, unavailable, and calibration states are labelled honestly. Alignment uses both copy and haptics, Reduce Motion removes interpolation, the location prompt follows a user action, and the bearing and sensor heading are calculated on-device. It must not become a decorative pattern for unrelated AI or content cards.

Health uses a compact biometric-instrument language: one dominant score ring, a maximum four-metric strip, a real-data trend, and a short explanation of what changed or which signals are missing. Each Health area has a recognisable layered vector glyph built from the shared icon family; do not use people photography, stock fitness imagery, generated bodies, or decorative muscle renders. Emerald means recorded progress, gold marks a comparison or important context, and missing data stays visibly blank. Performance explanations must identify the source, personal baseline or goal, and data coverage without treating missing data as poor performance.

Notifications form a quiet sanctuary, not a switchboard. The first viewport answers whether NurAI can alert the user, whether prayer alerts are ready, and what needs attention. Prayer timing and Athan are the dominant hierarchy; worship, wellbeing, family, and product updates follow as calm grouped controls. One status surface owns permission, readiness, refresh, and test actions so the same alarm state is never repeated in competing cards. Permission denial always has a direct recovery action, quiet hours explain which reminders they affect, advance nudges are clearly separated from at-prayer sounds, and customer builds never expose diagnostic counts or internal scheduling language.

The Athan Sound Studio treats listening as a deliberate spiritual choice. It shows one selected voice, a clear preview control, duration and source credit, then a short catalogue of openly licensed or first-party recordings. The original NurAI Athan remains free. Premium and Scholar voices may be gated by plan, but a locked voice can always be previewed before purchase and its licence remains visible. New recordings enter the catalogue only after their source page or generation record, creator or production credit, licence, duration, local preview, and exact native bundle filename are verified. Original generated voices use broad recitation qualities rather than imitating a named reciter. Alarm copy must reflect the operating system contract exactly: the native alarm path can break through Silent Mode and Focus only when authorised, but NurAI never promises unsupported looping, volume, or delivery behaviour. Changing a voice, prayer, location, calculation method, timezone, or alarm preference must reconcile the saved schedule.

Profile portraits are optional, private by default, and never required for worship or learning. The picker uses a circular crop and an explicit save state, preserves initials as the empty and error fallback, and provides a plain remove action. Uploaded data is size-limited, limited to safe raster formats, available only to the signed-in account until a separate social-sharing consent contract exists, and removed with account deletion.

## Do's and Don'ts

Do lead with the user's current status and next useful action. Do keep Quran text, prayer accuracy, source boundaries, and private data handling explicit. Do preserve drafts and provide recovery for network, permission, quota, and offline failures.

Do not use internal language such as command centre, operating system, control deck, trust rail, release gate, or readiness checkpoint in customer UI. Do not show multiple AI identities or mode dashboards. Do not place cards inside cards, use decorative geometry behind text, or make users decode a wall of badges and metrics.
