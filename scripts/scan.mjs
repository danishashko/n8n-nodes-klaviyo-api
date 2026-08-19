/**
 * Runs the exact ESLint gate that `npx @n8n/scan-community-package` applies when
 * n8n vets a community node, against this working copy.
 *
 * That gate is stricter than `npm run lint`: it ignores inline eslint-disable
 * comments, lints package.json, and ships a newer copy of the community-nodes
 * plugin than the one bundled with the local CLI. Rules have already disagreed
 * between the two - `n8n-node lint` asked for `usableAsTool` on a trigger node
 * while the scanner rejected exactly that - so this is the check that decides
 * whether a submission is auto-rejected.
 *
 * The published scanner only accepts a package name on npm and additionally
 * verifies provenance and the source repository, neither of which exists before
 * the first release. This runs the lint half early.
 *
 *   npm run build && npm run scan
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectDir = path.resolve(import.meta.dirname, '..');
const SCANNER_PKG = '@n8n/scan-community-package';

function resolveScanner() {
	// `shell: true` because npm is a .cmd shim on Windows and would not resolve otherwise.
	const cacheRoot = execFileSync('npm', ['config', 'get', 'cache'], {
		encoding: 'utf8',
		shell: true,
	}).trim();
	const npxDir = path.join(cacheRoot, '_npx');
	if (!existsSync(npxDir)) return null;

	for (const entry of readdirSync(npxDir)) {
		const candidate = path.join(npxDir, entry, 'node_modules', SCANNER_PKG, 'scanner', 'scanner.mjs');
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

const scannerPath = resolveScanner();
if (!scannerPath) {
	console.error(
		`Could not find ${SCANNER_PKG} in the npx cache.\n` +
			`Prime it once with:  npx --yes ${SCANNER_PKG} n8n-nodes-klaviyo-api\n` +
			'(it will fail until the package is published - that is fine, it only needs to download.)',
	);
	process.exit(1);
}

const { analyzePackage } = await import(pathToFileURL(scannerPath).href);

// The published scan lints a fresh git checkout, which has no dist/ in it. Packing
// to a temp directory reproduces that, and keeps compiled output out of the source leg.
const packDir = mkdtempSync(path.join(tmpdir(), 'n8n-scan-'));
execFileSync('npm', ['pack', '--pack-destination', packDir], {
	cwd: projectDir,
	stdio: 'pipe',
	shell: true,
});
const tarball = readdirSync(packDir).find((file) => file.endsWith('.tgz'));
// Relative filename, not an absolute one: GNU tar reads a leading "C:" as a remote host.
execFileSync('tar', ['xzf', tarball], { cwd: packDir, shell: true });

const legs = [
	['published tarball', path.join(packDir, 'package'), ['**/*.js', '**/*.json']],
	['source checkout', projectDir, ['credentials/**/*.ts', 'nodes/**/*.ts', 'package.json']],
];

let failed = false;
for (const [label, dir, patterns] of legs) {
	const result = await analyzePackage(dir, patterns);
	if (result.passed) {
		console.log(`PASS  ${label}`);
	} else {
		failed = true;
		console.log(`FAIL  ${label}: ${result.message}`);
		if (result.details) console.log(result.details);
	}
}

if (failed) {
	console.log('\nThis submission would be auto-rejected. Fix the rules above first.');
	process.exit(1);
}
console.log('\nBoth legs clean. Provenance and the source repository are checked by n8n after publishing.');
