# Security Policy

This repository holds Playwright test automation for a Salesforce PWA Kit
storefront. It contains no application source and no production secrets —
every credential the tests use is either a public demo value or resolved
server-side by the storefront's own proxy (see `README.md`).

## Reporting a vulnerability

If you find a security issue in this repository — a leaked credential, a
malicious dependency, a CI workflow that could be abused to exfiltrate
secrets or run unreviewed code — please report it privately instead of
opening a public issue:

1. Use [GitHub's private vulnerability reporting](../../security/advisories/new)
   for this repository, or
2. Contact the repository owner directly through their GitHub profile.

Please include what you found, how to reproduce it, and its impact. You'll
get an acknowledgment within a few days.

## Scope

In scope:

- `.github/workflows/*` — CI pipelines and their permissions
- Anything that could leak the values in `.env` / repository secrets
- Supply-chain issues in `package.json` / `pnpm-lock.yaml` or pinned GitHub Actions

Out of scope:

- The target storefront itself (`*.mobify-storefront.com`) — that's Salesforce's
  demo environment, not something this repository controls or can fix
- Findings that require write access you weren't authorized to have
