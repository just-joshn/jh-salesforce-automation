# Test Tier Matrix

Pipeline tags are Playwright details metadata. Feature tags remain separate.

| Journeys           | `@smoke` | `@destructive` | `@nightly` |
| ------------------ | -------: | -------------: | ---------: |
| A1, A2, A3         |      yes |             no |         no |
| B1, B2, B3, B4, B5 |       no |          B1/B2 |        yes |
| B6, B7, B8, B9     |       no |            yes |        yes |
| C1, C2, C3         |       no |            yes |        yes |
| D1, D2             |       no |            yes |        yes |
| E1, E2, E3, E4, E5 |       no |            yes |        yes |
| F1, F2             |      yes |             no |         no |
| G1, G2             |      yes |             no |         no |
| H1                 |      yes |             no |         no |
| H2                 |       no |            yes |        yes |

`@live` is used only by read-only public-canary checks and never by a
mutating journey.

## Dedicated projects

| Project                           | Tier       | Mutation policy                     |
| --------------------------------- | ---------- | ----------------------------------- |
| `e2e-firefox` / `e2e-webkit`      | `@smoke`   | Read-only browser smoke             |
| `mobile-chrome` / `mobile-safari` | `@smoke`   | Read-only device smoke              |
| `a11y`                            | `@nightly` | Read-only accessibility states      |
| `visual`                          | `@nightly` | Read-only reviewed snapshots        |
| `performance`                     | `@nightly` | Read-only budget measurements       |
| `security`                        | `@nightly` | Read-only boundary checks           |
| `canary`                          | `@live`    | JavaScript-disabled GET-only checks |

`@boundary` remains descriptive metadata for expected service or configuration
boundaries; it does not select a CI tier.
