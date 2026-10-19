# Zof Policy as Code

Evaluate explicit local rules against portable verification evidence. CI maintainers can require completed passing tests, reject severe findings, approve tool names, pin commits, limit evidence age and require verification categories. This is a deterministic public utility with no network, scripts, plugins or account requirement.

<!-- ZOF_RELEASE_INSTALL_START -->
## Install from GitHub source

Requires Node.js 22 or 24, npm, and Git. Filesystem operations require Linux or macOS with Python 3.10 or newer; Windows file operations fail closed. Clone this repository and explicitly prepare its reviewed release dependencies:

```sh
git clone https://github.com/Zof-AI/zof-policy-as-code.git
cd zof-policy-as-code
node scripts/bootstrap.mjs --allow-network
npm ci --ignore-scripts --prefer-offline
npm run build
npm test
```

The bootstrap downloads only the exact `v0.1.0` dependency assets from [GitHub Releases](https://github.com/Zof-AI/zof-policy-as-code/releases), as listed in `scripts/release-dependencies.json`, verifies SHA256 and byte size, and adds them to the npm cache. It does not extract archives, run package scripts, collect application data, or send credentials. Downloads require the explicit flag and follow only HTTPS GitHub asset redirects. Installation then fetches ordinary third-party dependencies from npm. Use a writable npm cache; set `npm_config_cache` consistently for both commands if needed. An unavailable asset, changed hash, or oversized response stops installation.

GitHub source and release artifacts are the initial distribution channel. These instructions do not claim that `@zof-ai` packages are published on npm or that the VS Code extension is listed in Marketplace.
<!-- ZOF_RELEASE_INSTALL_END -->

## Install and quick start

Requires Node.js 22 or 24. After the GitHub source installation above, validate the checkout with:

```sh
npm ci --ignore-scripts
npm run build
npm test
node dist/cli.js examples/strict-policy.json examples/passing.json --json --now 2026-01-01T00:00:30Z
```

During candidate review, the program's private staging script supplies reviewed dependency tarballs and seeds an isolated npm cache. Do not claim a registry installation has passed before publication. The final command prints `result: "pass"` and explanatory rule decisions.

## Three examples

```sh
# Completed tests, approved producer, recent timestamp and required category: exit 0.
node dist/cli.js examples/strict-policy.json examples/passing.json --now 2026-01-01T00:00:30Z
# A failed test: exit 1.
node dist/cli.js examples/test-policy.json examples/failing.json --json
# No test results: indeterminate, exit 2.
node dist/cli.js examples/test-policy.json examples/missing.json --json
```

## Library

```js
import { evaluatePolicy } from '@zof-ai/policy-as-code';
const result = evaluatePolicy(evidence, {
  version: '1.0', rules: [{id: 'tests', type: 'all-tests-pass', minimum: 1}]
});
```

`evidence` may be one Evidence 1.0.0 document, an array of up to 100 documents, or null. `evaluatePolicy(evidence, policy, {now})` accepts an explicit timestamp for reproducible age checks. `validatePolicy` throws a fixed error on unknown rules or fields. `formatReport` produces plain text. CLI file paths must be relative to the working directory.

## Rules and decisions

Policies contain `version: "1.0"` and 1–100 rules with unique alphanumeric IDs. See [API](docs/API.md). There is no expression language. `fail` dominates `indeterminate`; a report passes only when every required rule passes and all supplied executions completed. Missing evidence, skipped tests, incomplete execution, missing categories, future timestamps or missing commit attribution are indeterminate. Expired evidence or contradictory commit requirements fail. Input/schema errors exit 2 without echoing input.

## Limits and security

Rules only inspect supplied data. No test is run and evidence authenticity is not established. Tool names and commits can be forged in unsigned evidence; verify authenticity separately where required. Known sensitive patterns are redacted, but callers must minimize sensitive input. Inputs are bounded by the evidence library; files outside the current root and symlinks are rejected. No raw application logs or environment capture occurs. Read [SECURITY.md](SECURITY.md).

Built independently for the [Zof](https://zof.ai) ecosystem. No hosted integration is claimed. Licensed under [Apache-2.0](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md) and [release process](docs/RELEASE.md).
