# NurAI

NurAI is an open-source Islamic companion for worship, learning, reflection,
family, and gentle personal guidance. It is being built in public so Muslim
developers, designers, researchers, and reviewers can help make the experience
more trustworthy and useful.

This repository is the community edition of the app. It contains the mobile
client, server, shared contracts, database migrations, design system, and the
native iOS project needed for the current WidgetKit and native-module work.
Production credentials, private release evidence, user data, deployment
accounts, and uncleared media are intentionally not included.

## Current status

NurAI is an active work in progress. Some integrations require your own
provider accounts and local configuration. The app must not be described as a
medical device, a source of personal religious rulings, or a replacement for a
qualified clinician or scholar.

## What is here

- Quran reading, study, prayer times, Qibla, duas, dhikr, Islamic learning,
  Arabic practice, family features, travel helpers, wellbeing reflections, and
  a source-aware AI layer.
- Expo and React Native client code under `client/`.
- Express, Drizzle, PostgreSQL, authentication, entitlement, and AI routes
  under `server/` and `shared/`.
- SQL migrations under `migrations/`.
- Reusable Expo native modules under `modules/` and the checked-in iOS project
  under `ios/`.
- Design tokens and product rationale in `DESIGN.md`.

## Quick start

Requirements:

- Node.js 22.x (the project currently supports Node 20.19.4 through 22.x).
- PostgreSQL for authenticated server features.
- Xcode and CocoaPods for a native iOS build.
- Android Studio only if you want to generate and build Android locally.

```bash
npm ci
cp .env.example .env.local
# Edit .env.local with a local PostgreSQL URL and a random development secret.
npm run check:types
npm run check:secret-leaks
```

In one terminal, run the API:

```bash
npm run server:dev
```

In another terminal, start Expo:

```bash
npx expo start --localhost
```

For the first native iOS setup, install pods in `ios/` and use a development
client. Expo Go cannot provide every native feature used by NurAI.

## Environment and integrations

Copy `.env.example` to `.env.local`. Keep real values local or in your secret
manager. Never commit database URLs, session secrets, provider keys, Apple or
Google credentials, RevenueCat secrets, or private user data.

AI can run with a local OpenAI-compatible endpoint for development. Cloud AI,
RevenueCat, Google Places, Apple Sign-In, push notifications, HealthKit, and
production deployment each require separately configured accounts. The public
repository does not grant access to any of those services.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and
[CONTENT_LICENSE.md](CONTENT_LICENSE.md) before opening a pull request.

Good first contributions include accessibility fixes, tests, documentation,
local/offline improvements, performance work, thoughtful UI polish, and source
or licensing reviews. Please do not submit copied religious text, recordings,
brand assets, screenshots containing personal data, or medical claims without
clear rights and review notes.

Run the relevant checks before opening a pull request:

```bash
npm run check:types
npm run check:secret-leaks
npm run lint
```

The production checkout also contains private release-control checks. They are
not required for this community repository and are intentionally not part of
the public CI contract.

## Privacy and safety

NurAI handles potentially sensitive worship, family, location, wellbeing, and
conversation data. Changes must preserve authentication, ownership checks,
least-privilege access, deletion flows, safe logging, and honest permission
copy. AI output must not invent sources, private context, medical certainty, or
religious authority.

## License

Owned source code is licensed under the Apache License 2.0. The NurAI name,
logos, product identity, screenshots, and other brand assets are not granted
for confusing or misleading use. Content and third-party media have separate
terms; see [CONTENT_LICENSE.md](CONTENT_LICENSE.md) and the attribution files
next to the relevant assets.

## Help shape NurAI

Open an issue with a reproducible example, propose a focused improvement, or
send a pull request. Explain the user benefit, the privacy implications, and
how you tested it. We are especially interested in contributors who care about
accessible Islamic learning, source-aware AI, family safety, and calm mobile
experiences.
