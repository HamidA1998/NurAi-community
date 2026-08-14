# NurAI Community Edition 0.1.0

This release is the first public community snapshot of NurAI, published on
14 August 2026.

## Included

- Expo and React Native client source.
- Express, Drizzle, PostgreSQL, authentication, entitlement, and AI server
  source.
- Shared contracts and database migrations.
- Design tokens and product rationale.
- Native iOS project, WidgetKit target, and custom Expo modules.
- Community contribution, security, conduct, and content-rights guidance.

## Deliberately not included

- Production credentials, deployment accounts, private user data, health
  exports, release evidence, private account notes, and marketing media.
- Android-generated native output; generate it locally with Expo when needed.
- Nasheed recordings and other media whose redistribution rights are not yet
  documented for this community snapshot.

## Verification

The snapshot passed the public type check, secret-pattern check, and lint with
warnings only. `npm audit` still reports high-severity findings in the
Expo/Metro build toolchain; resolving those requires a coordinated breaking
Expo/React Native upgrade and native verification. See [SECURITY.md](../SECURITY.md).

This is a source release for contributors, not a claim that the app is ready
for production deployment or that every optional integration is configured.
