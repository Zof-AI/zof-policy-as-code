# Public policy API 0.1.0

`validatePolicy(unknown): Policy`, `evaluatePolicy(evidence,policy,{now?}): PolicyReport` and `formatReport(report): string` are exported ESM APIs with generated declarations. The schema is deliberately finite:

| type | arguments | behavior |
|---|---|---|
| all-tests-pass | minimum (positive integer, default 1) | requires completed passing executions and tests; skipped results are indeterminate |
| deny-severity | severity: info/low/medium/high/critical | fails at or above threshold |
| approved-tools | names: nonempty string array | every document producer must be listed |
| commit | value: 7–64 hex characters | requires exact case-insensitive match; no prefix expansion |
| max-age | seconds: integer 1–31536000 | compares creation time with explicit/current clock |
| required-types | types: nonempty string array | requires completed non-unknown evidence for each category |

All rules include unique `id` and `type`. Unknown properties are rejected; no shell or code expressions exist. String lengths, list sizes, document count and rule count are bounded. An empty policy is invalid. Conflicting requirements are all evaluated, so contradictory commits cannot pass. Unknown/malformed evidence throws `INVALID_EVIDENCE`; invalid policies throw `INVALID_POLICY`; no input values are reflected in errors. Version 1.0 supports only Evidence 1.0.0. Changes follow semantic versioning.
