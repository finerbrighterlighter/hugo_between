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
 * Server orchestration is the part that used to make this command flaky, so it is
 * deliberate rather than hopeful:
 *
 *   - Ports are allocated from the OS, not fixed, so a leftover process from an
 *     earlier session can never be mistaken for this run's server.
 *   - Server output goes to a file, never a pipe. `python -m http.server` logs a
 *     line per request; piping that back-pressured once tens of thousands of
 *     requests had gone through, the server blocked writing its own log, and the
 *     accessibility scan timed out two thirds of the way in.
 *   - A server's output is captured. When a step fails, the tail is printed, so a
 *     crashed or complaining server is visible instead of silent.
 *   - A child that exits is recorded as dead and restarted before the next step
 *     that needs it, rather than leaving later steps to fail on a refused socket.
 *   - Every step has a timeout, so a hung browser cannot hold a CI job open.
 *   - Shutdown is awaited, so ports are released before the process ends.
 *
 * Flags: --skip=<names>  comma-separated step names to skip
 *        --only=<names>  run just these
 *        --bail          stop at the first failure
 *        --timeout=<s>   per-step timeout in seconds (default 600; a11y gets 3x,
 *                        because it is ~84 page loads and legitimately the slowest)
 */
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const BAIL = args.includes('--bail');
const listArg = (flag) => {
  const a = args.find((x) => x.startsWith(`${flag}=`));
  return a ? a.split('=')[1].split(',').filter(Boolean) : null;
};
const SKIP = listArg('--skip') || [];
const ONLY = listArg('--only');
const stepTimeoutArg = args.find((a) => a.startsWith('--timeout='));
const STEP_TIMEOUT_MS = (stepTimeoutArg ? Number(stepTimeoutArg.split('=')[1]) : 600) * 1000;
/* One timeout for every step killed the accessibility scan, which is not hung, just
   long: it loads every representative page in two viewports and two themes. A step
   declares its own multiplier rather than everything being paced by the slowest. */
const timeoutFor = (step) => STEP_TIMEOUT_MS * (step.timeoutFactor || 1);

/* Each entry: which server it needs, and how to build its argv once that server's
   base URL is known. `null` means the step needs no server. */
const STEPS = [
  { name: 'hugo:check', server: null, argv: () => ['node', ['scripts/check-hugo.js']] },
  { name: 'build', server: null, argv: () => ['npm', ['run', '--silent', 'build']] },
  { name: 'links', server: null, argv: () => ['node', ['scripts/links.js', 'public']] },
  { name: 'a11y', server: 'static', timeoutFactor: 3, argv: (base) => ['node', ['scripts/a11y.js', base]] },
  { name: 'csp', server: null, argv: () => ['node', ['scripts/csp_check.js']] },
  { name: 'smoke', server: 'dev', argv: (base) => ['node', ['scripts/smoke.js', base]] },
  { name: 'filters', server: 'dev', argv: (base) => ['node', ['scripts/works_filter_test.js', base]] },
  { name: 'balloon', server: 'dev', argv: (base) => ['node', ['scripts/balloon_test.js', base]] },
  { name: 'audit', server: 'dev', argv: (base) => ['node', ['scripts/final_audit.js', base]] },
];

function selected(step) {
  if (ONLY) return ONLY.includes(step.name);
  return !SKIP.includes(step.name);
}

/* Ask the OS for a port nobody is using, then hand it straight to the server. */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function probe(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 2000 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

const servers = {};

/* Both servers are children, and both write to a FILE rather than a pipe.
   That distinction is the whole point: piping `python -m http.server`, which logs a
   line per request, back-pressured once tens of thousands of requests had gone
   through, the server blocked writing its own log, and the accessibility scan timed
   out two thirds of the way in. A file has no such ceiling, and the output is still
   captured, which is what makes a failure legible. */
function startServer(kind, port) {
  const [cmd, cmdArgs] =
    kind === 'static'
      ? ['python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', 'public']]
      : ['hugo', ['server', '--bind', '127.0.0.1', '--port', String(port), '--renderToMemory']];

  const logFile = path.join(os.tmpdir(), `qc-${kind}-${process.pid}.log`);
  const fd = fs.openSync(logFile, 'w');
  const child = spawn(cmd, cmdArgs, { cwd: ROOT, stdio: ['ignore', fd, fd] });
  const rec = { child, server: null, port, base: `http://127.0.0.1:${port}`, logFile, alive: true, exit: null };
  child.on('exit', (code, signal) => {
    rec.alive = false;
    rec.exit = signal ? `signal ${signal}` : `code ${code}`;
  });
  servers[kind] = rec;
  return rec;
}

function serverLog(kind) {
  const rec = servers[kind];
  if (!rec) return '';
  if (!rec.logFile) return `(the ${kind} server runs in this process; there is no separate log)`;
  let text = '';
  try {
    text = fs.readFileSync(rec.logFile, 'utf8').trim();
  } catch {
    /* nothing written yet */
  }
  if (!text) return `(the ${kind} server produced no output)`;
  return text.split('\n').slice(-15).join('\n');
}

/* Ready means: the child we just spawned is still alive AND the port answers. A
   dead child fails immediately rather than after the full wait. */
async function waitReady(kind, timeoutMs = 60000) {
  const rec = servers[kind];
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (!rec.alive) throw new Error(`the ${kind} server exited (${rec.exit}) before it was ready`);
    if (await probe(rec.port)) return;
    if (Date.now() > deadline) throw new Error(`the ${kind} server did not answer on port ${rec.port} within ${timeoutMs / 1000}s`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

async function ensureServer(kind) {
  if (!kind) return null;
  const existing = servers[kind];
  if (existing && existing.alive && (await probe(existing.port))) return existing;
  if (existing) {
    console.warn(
      `\n--- the ${kind} server is gone (${existing.exit || 'stopped answering'}); restarting it.\n` +
        `${serverLog(kind)}\n---`
    );
    try {
      if (existing.server) existing.server.close();
      else existing.child?.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }
  const port = await freePort();
  startServer(kind, port);
  await waitReady(kind);
  return servers[kind];
}

function stopServers() {
  return Promise.all(
    Object.values(servers).map(
      (rec) =>
        new Promise((resolve) => {
          if (rec.server) {
            rec.alive = false;
            rec.server.closeAllConnections?.();
            return rec.server.close(() => resolve());
          }
          if (!rec.alive || !rec.child) return resolve();
          rec.child.once('exit', () => resolve());
          try {
            rec.child.kill('SIGTERM');
          } catch {
            return resolve();
          }
          setTimeout(() => {
            try {
              rec.child.kill('SIGKILL');
            } catch {
              /* already gone */
            }
            resolve();
          }, 4000);
        })
    )
  );
}

async function main() {
  const results = [];
  for (const step of STEPS) {
    if (!selected(step)) {
      results.push({ name: step.name, status: 'skipped' });
      continue;
    }

    let base = null;
    try {
      const rec = await ensureServer(step.server);
      base = rec ? rec.base : null;
    } catch (err) {
      console.error(`\n=== ${step.name}: ${err.message}\n${serverLog(step.server)}`);
      results.push({ name: step.name, status: 'failed' });
      if (BAIL) break;
      continue;
    }

    console.log(`\n=== ${step.name} ${'='.repeat(Math.max(0, 60 - step.name.length))}`);
    const [cmd, cmdArgs] = step.argv(base);
    const limit = timeoutFor(step);
    const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', timeout: limit });

    let ok = r.status === 0;
    if (r.error && r.error.code === 'ETIMEDOUT') {
      console.error(`--- ${step.name} exceeded ${limit / 1000}s and was killed.`);
      ok = false;
    }
    /* A step that failed while its server died says so, rather than leaving a bare
       connection-refused for the reader to interpret. */
    if (!ok && step.server && servers[step.server] && !servers[step.server].alive) {
      console.error(`--- the ${step.server} server exited during this step (${servers[step.server].exit}):\n${serverLog(step.server)}`);
    }
    results.push({ name: step.name, status: ok ? 'passed' : 'failed' });
    if (!ok && BAIL) break;
  }

  await stopServers();

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
    stopServers().then(() => process.exit(130));
  });
}

main().catch(async (err) => {
  console.error(err);
  await stopServers();
  process.exit(2);
});
