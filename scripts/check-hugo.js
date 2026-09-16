#!/usr/bin/env node
/**
 * check-hugo.js — assert the Hugo on PATH is the version this site is pinned to.
 *
 * netlify.toml's HUGO_VERSION is the single source of truth: production builds
 * with it, and CI installs it. A local machine can easily have a newer Hugo first
 * on PATH, which is how a template change can pass locally and behave differently
 * on deploy. This turns that into a loud failure instead of a silent difference.
 *
 * Exit 0 when the versions match, 1 when they do not, 2 when Hugo or the pin
 * cannot be read. Pass --warn to report a mismatch without failing.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const WARN_ONLY = process.argv.includes('--warn');
const root = path.resolve(__dirname, '..');

function fail(message, code = 2) {
  console.error(`check-hugo: ${message}`);
  process.exit(code);
}

let netlify;
try {
  netlify = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
} catch {
  fail('cannot read netlify.toml');
}

const pinMatch = netlify.match(/^\s*HUGO_VERSION\s*=\s*"([^"]+)"/m);
if (!pinMatch) fail('no HUGO_VERSION found in netlify.toml');
const pinned = pinMatch[1];

let reported;
try {
  reported = execFileSync('hugo', ['version'], { encoding: 'utf8' });
} catch {
  fail('`hugo` is not on PATH');
}

const found = (reported.match(/hugo v(\d+\.\d+\.\d+)/) || [])[1];
if (!found) fail(`could not parse a version from: ${reported.trim()}`);

const extended = /\+extended/.test(reported);

if (found === pinned && extended) {
  console.log(`check-hugo: ok — hugo ${found} extended, matching netlify.toml`);
  process.exit(0);
}

const problems = [];
if (found !== pinned) problems.push(`version is ${found}, netlify.toml pins ${pinned}`);
if (!extended) problems.push('this build is not the extended edition (the site needs it for WebP and SCSS)');

const message =
  `hugo on PATH does not match the pin:\n` +
  problems.map((p) => `  - ${p}`).join('\n') +
  `\n\nUse the pinned build, for example:\n` +
  `  PATH=~/.local/hugo-${pinned}:$PATH hugo --gc --minify\n` +
  `or set PATH in .env as .env.example describes, then run through dotenv.`;

if (WARN_ONLY) {
  console.warn(`check-hugo: ${message}`);
  process.exit(0);
}
console.error(`check-hugo: ${message}`);
process.exit(1);
