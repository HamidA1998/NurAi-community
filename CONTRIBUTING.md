# Contributing to NurAI

Thank you for helping make NurAI more useful, private, accessible, and
trustworthy. Small, focused changes are welcome.

## Before you start

1. Read the README, SECURITY.md, and CONTENT_LICENSE.md.
2. Search existing issues before opening a new one.
3. For a feature, describe the user problem and the smallest useful change.
4. Do not use real user data, account exports, private screenshots, cookies,
   credentials, or production database values in issues, tests, fixtures, or
   pull requests.

## Development flow

1. Fork the repository and create a focused branch.
2. Install dependencies with `npm ci`.
3. Copy `.env.example` to `.env.local` and use local services or placeholders.
4. Make the smallest change that solves the stated problem.
5. Preserve navigation, authentication, authorization, deletion, analytics,
   subscription gates, accessibility labels, and privacy boundaries.
6. Run the checks relevant to your change.
7. Open a pull request with the user impact, screenshots only when safe, test
   commands, and any follow-up work.

## Review expectations

Every pull request should explain:

- What changed and why.
- Which user or contributor problem it solves.
- How it was tested.
- Any new permission, data, provider, cost, or licensing implications.
- Whether the change affects religious guidance, wellbeing, children, family
  safety, location, or private messages.

UI work should follow `DESIGN.md`: calm hierarchy, accessible contrast, safe
areas, useful loading and error states, and no invented claims. Religious or
health-related content needs source and review context before it is presented
as authoritative.

## Required checks

At minimum, run:

```bash
npm run check:types
npm run check:secret-leaks
npm run lint
```

For server, auth, data, deployment, or release changes, also run the relevant
checks from the README and include their results in the pull request.

## Content and media

Only submit content you have the right to redistribute. Keep third-party media
under its original license and include attribution. Do not add a recording,
translation, tafsir, hadith, fiqh explanation, image, or dataset merely because
it is easy to find online.

## Pull request conduct

Be specific, kind, and open to review. Maintainers may request a smaller scope,
source evidence, a privacy review, a qualified content review, or a follow-up
issue before merging.
