# Test Tier Matrix

The API project is a directional superset: every retained E2E declaration has an API counterpart, while API-only declarations are permitted. Tags are layer-local metadata and are not parity keys.

## Retained E2E journeys

| Journeys | `@smoke` | `@destructive` | `@nightly` |
|---|---:|---:|---:|
| A1 | yes | no | no |
| B1–B5, B9 | no | B1/B2/B9 | yes |
| C3 | no | yes | yes |
| D2 | no | yes | yes |
| E1–E4 | no | yes | yes |
| G1 | yes | no | no |
| H2 | no | yes | yes |

## API-only journey declarations

A2–A3, B6–B8, C1–C2, D1, E5, F1–F2, G2, and H1 remain in `api/tests` and are not browser-tier selections. Browser-only component-affordance coverage removed with A3, E5, and F2 is deferred until component source is available.

## Dedicated projects

| Project | Tier | Mutation policy |
|---|---|---|
| `e2e-firefox` / `e2e-webkit` | `@smoke` | Read-only browser smoke |
| `mobile-chrome` / `mobile-safari` | `@smoke` | Read-only device smoke |
| `a11y` | `@nightly` | Read-only accessibility states |
| `visual` | `@nightly` | Read-only reviewed snapshots |
| `performance` | `@nightly` | Read-only budget measurements |
| `security` | `@nightly` | Read-only boundary checks |
| `canary` | `@live` | JavaScript-disabled GET-only checks |
