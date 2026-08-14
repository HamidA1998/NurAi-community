# NurAI architecture

NurAI is a TypeScript monorepo with an Expo/React Native client and an
Express/PostgreSQL server.

| Area | Purpose |
| --- | --- |
| `client/` | Screens, navigation, local storage, device integrations, and user-facing services |
| `server/` | HTTP routes, sessions, authentication, AI providers, rate limits, ownership checks, and storage |
| `shared/` | Database schema, types, subscription identifiers, and shared AI contracts |
| `migrations/` | Repeat-safe PostgreSQL schema and data migrations |
| `modules/` | Reusable Expo native modules such as Athan alarms and Wallet handoff |
| `ios/` | Checked-in iOS project, WidgetKit target, entitlements, and native bridges; Pods are generated locally |
| `assets/` | Approved product assets and openly licensed Athan notification recordings |
| `scripts/` | Local checks, build helpers, and release-control utilities |

The client communicates with the server through `client/lib/query-client.ts`.
Authentication is session-based. Server routes must derive ownership from the
authenticated session rather than trusting IDs or tier values sent by the
client.

AI routing is provider-agnostic. Cloud keys remain server-side. Local or
hosted OpenAI-compatible providers can be configured for lower-risk use cases;
religious and sensitive requests stay behind explicit safety controls.

When adding a feature, keep the boundary clear:

1. Define shared types or schema changes in `shared/`.
2. Add a guarded server route and ownership check.
3. Add the client service and screen state.
4. Add the migration, test, privacy copy, and source/licensing notes that the
   feature needs.
