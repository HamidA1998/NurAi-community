# Security policy

Please do not report security vulnerabilities in a public issue.

Use GitHub's private vulnerability reporting for this repository when it is
available. If it is not available, contact the repository owner privately
through [HamidA1998 on GitHub](https://github.com/HamidA1998).

Include:

- The affected commit, route, screen, or configuration.
- A short description of the impact and realistic attack path.
- Reproduction steps that do not access real accounts or data.
- A suggested mitigation, if you have one.

Never include API keys, session cookies, database URLs, private keys, health
records, family or location data, or unredacted logs in a report. If a secret
may have been exposed, rotate it first and report the exposure without sending
the secret itself.

NurAI is a work in progress. A public release is not a guarantee that every
deployment or optional integration has the same security posture. Operators
must configure strong production secrets, HTTPS, database ownership checks,
rate limits, provider quotas, and monitoring before serving real users.

At this snapshot, `npm audit` still reports high-severity findings in the
Expo/Metro build toolchain. Non-breaking lockfile fixes have been applied; the
remaining automated fix proposes a breaking Expo/React Native upgrade. Do not
run `npm audit fix --force` blindly. Coordinate an Expo upgrade, native rebuild,
and full app verification before treating those findings as resolved.
