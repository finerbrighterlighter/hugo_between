#!/usr/bin/env node
/**
 * qc.js — the whole quality gate, in the order a reviewer would want it.
 *
 * `npm run qc` used to mean "build and check links", which was a weaker promise
 * than its name: a contributor could get a green result while interaction,
 * accessibility or CSP were broken. This runs everything that can assert, so the
 * name matches the guarantee. Use `npm run qc:static` for the fast subset.
 *
 * Steps, in order. Everything after the build runs against a static server that
 * this script starts and stops, except the ones that need Hugo's dev server
 * (marked `dev`), which get one too.
 *
 *   1. hugo:check   the Hugo on PATH matches netlify.toml
 *   2. build        hugo --gc --minify
 *   3. links        no broken internal links in either language
 *   4. a11y         axe-core, desktop and phone, light and dark, both languages
 *   5. csp          the production CSP does not block the site's own scripts
 *   6. smoke   dev  the page behaviours still work
 *   7. filters dev  works filtering and URL state
 *   8. balloon dev  mobile navigation, keyboard and focus
 *   9. audit   dev  layout, palette and theme persistence
 *
 * Every step runs even if an earlier one failed, so one run tells you everything
 * that is wrong rather than only the first thing. Exit 1 if any step failed.
 *
 * Flags: --skip=<names>  comma-separated step names to skip
 *        --only=<names>  run just these
 *        --bail          stop at the first failure
 */
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');

const ROOT = path.resolve(__dirname, '..');
const STATIC_PORT = 1313;
const DEV_PORT = 1315;
const args = process.argv.slice(2);
const BAIL = args.includes('--bail');
const listArg = (flag) => {
  const a = args.find((x) => x.startsWith(`${flag}=`));
  return a ? a.split('=')[1].split(',').filter(Boolean) : null;
};
const SKIP = listArg('--skip') || [];
const ONLY = listArg('--only');

const STEPS = [
  { name: 'hugo:check', server: null, cmd: ['node', ['scripts/check-hugo.js']] },
  { name: 'build', server: null, cmd: ['npm', ['run', '--silent', 'build']] },
  { name: 'links', server: null, cmd: ['node', ['scripts/links.js', 'public']] },
  { name: 'a11y', server: 'static', cmd: ['node', ['scripts/a11y.js', `http://127.0.0.1:${STATIC_PORT}`]] },
  { name: 'csp', server: null, cmd: ['node', ['scripts/csp_check.js']] },
  { name: 'smoke', server: 'dev', cmd: ['node', ['scripts/smoke.js', `http://127.0.0.1:${DEV_PORT}`]] },
  { name: 'filters', server: 'dev', cmd: ['node', ['scripts/works_filter_test.js', `http://127.0.0.1:${DEV_PORT}`]] },
  { name: 'balloon', server: 'dev', cmd: ['node', ['scripts/balloon_test.js', `http://127.0.0.1:${DEV_PORT}`]] },
  { name: 'audit', server: 'dev', cmd: ['node', ['scripts/final_audit.js', `http://127.0.0.1:${DEV_PORT}`]] },
];

function selected(step) {
  if (ONLY) return ONLY.includes(step.name);
  return !SKIP.includes(step.name);
}

function waitForPort(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 2000 }, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => (Date.now() > deadline ? reject(new Error(`port ${port} never came up`)) : setTimeout(attempt, 400)));
      req.on('timeout', () => {
        req.destroy();
        Date.now() > deadline ? reject(new Error(`port ${port} timed out`)) : setTimeout(attempt, 400);
      });
    };
    attempt();
  });
}

const servers = {};

async function ensureServer(kind) {
  if (!kind || servers[kind]) return;
  if (kind === 'static') {
    servers.static = spawn('python3', ['-m', 'http.server', String(STATIC_PORT), '--bind', '127.0.0.1', '--directory', 'public'], {
      cwd: ROOT,
      stdio: 'ignore',
    });
    await waitForPort(STATIC_PORT);
  } else {
    servers.dev = spawn('hugo', ['server', '--bind', '127.0.0.1', '--port', String(DEV_PORT), '--renderToMemory'], {
      cwd: ROOT,
      stdio: 'ignore',
    });
    await waitForPort(DEV_PORT);
  }
}

function stopServers() {
  for (const s of Object.values(servers)) {
    try {
      s.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
}

async function main() {
  const results = [];
  for (const step of STEPS) {
    if (!selected(step)) {
      results.push({ name: step.name, status: 'skipped' });
      continue;
    }
    try {
      await ensureServer(step.server);
    } catch (err) {
      console.error(`\n=== ${step.name}: could not start the ${step.server} server — ${err.message}`);
      results.push({ name: step.name, status: 'failed' });
      if (BAIL) break;
      continue;
    }
    console.log(`\n=== ${step.name} ${'='.repeat(Math.max(0, 60 - step.name.length))}`);
    const [cmd, cmdArgs] = step.cmd;
    const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit' });
    const ok = r.status === 0;
    results.push({ name: step.name, status: ok ? 'passed' : 'failed' });
    if (!ok && BAIL) break;
  }

  stopServers();

  const failed = results.filter((r) => r.status === 'failed');
  console.log(`\n${'='.repeat(64)}\nQC summary`);
  for (const r of results) {
    const mark = r.status === 'passed' ? 'pass' : r.status === 'failed' ? 'FAIL' : 'skip';
    console.log(`  ${mark}  ${r.name}`);
  }
  console.log(failed.length ? `\n${failed.length} step(s) failed: ${failed.map((f) => f.name).join(', ')}` : '\nAll selected checks passed.');
  process.exit(failed.length ? 1 : 0);
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    stopServers();
    process.exit(130);
  });
}

main().catch((err) => {
  console.error(err);
  stopServers();
  process.exit(2);
});
