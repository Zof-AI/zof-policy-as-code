# Zof Policy as Code

Evaluate explicit local rules against portable verification evidence. CI maintainers can require completed passing tests, reject severe findings, approve tool names, pin commits, limit evidence age and require verification categories. This is a deterministic public utility with no network, scripts, plugins or account requirement.

<!-- ZOF_NPM_INSTALL_START -->
## Install from npm

Use Node.js 22 or 24 and npm. File-based operations require Linux or macOS with Python 3.10 or newer; Windows file operations fail closed. In a new project directory, install the version used by this guide:

```sh
npm install --ignore-scripts --save-exact @zof-ai/policy-as-code@0.1.1
npx --no-install zof-policy-as-code --help
```

The package includes compiled JavaScript, TypeScript declarations and its runtime dependencies. No source build, Zof account or repository upload is required. `--ignore-scripts` disables installation lifecycle scripts; `--no-install` keeps the example commands from downloading another package.

Confirm the public ESM entry point; this prints `function`:

```sh
node --input-type=module -e "import('@zof-ai/policy-as-code').then(api => console.log(typeof api.evaluatePolicy))"
```

Run a packaged example from the same directory:

```sh
npx --no-install zof-policy-as-code node_modules/@zof-ai/policy-as-code/examples/strict-policy.json node_modules/@zof-ai/policy-as-code/examples/passing.json --json --now 2026-01-01T00:00:30Z
```

The fixed-time example prints `result: "pass"` and the decisions for each rule.

Package: [@zof-ai/policy-as-code](https://www.npmjs.com/package/@zof-ai/policy-as-code). The source-checkout instructions and three additional workflows follow.
<!-- ZOF_NPM_INSTALL_END -->

<!-- ZOF_RELEASE_INSTALL_START -->
## Install from GitHub source

Requires Node.js 22 or 24, npm, and Git. Filesystem operations require Linux or macOS with Python 3.10 or newer; Windows file operations fail closed. Clone this repository and explicitly prepare its reviewed release dependencies:

```sh
git clone --branch v0.1.1 --depth 1 https://github.com/Zof-AI/zof-policy-as-code.git
cd zof-policy-as-code
node scripts/bootstrap.mjs --allow-network
npm ci --ignore-scripts --prefer-offline
npm run build
npm test
```

The bootstrap downloads only the exact versioned dependency assets from [GitHub Releases](https://github.com/Zof-AI/zof-policy-as-code/releases), as listed in `scripts/release-dependencies.json`, verifies SHA256 and byte size, and adds them to the npm cache. It does not extract archives, run package scripts, collect application data, or send credentials. Downloads require the explicit flag and follow only HTTPS GitHub asset redirects. Installation then fetches ordinary third-party dependencies from npm. Use a writable npm cache; set `npm_config_cache` consistently for both commands if needed. An unavailable asset, changed hash, or oversized response stops installation.

<!-- ZOF_RELEASE_INSTALL_END -->

## Install and quick start

Requires Node.js 22 or 24. After the GitHub source installation above, validate the checkout with:

```sh
npm ci --ignore-scripts
npm run build
npm test
node dist/cli.js examples/strict-policy.json examples/passing.json --json --now 2026-01-01T00:00:30Z
```

The final command prints `result: "pass"` and explanatory rule decisions. The explicit timestamp makes the example reproducible.

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
