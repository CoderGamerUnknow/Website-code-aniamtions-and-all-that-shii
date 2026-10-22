// The animation audit runner.
//
// It builds the site, serves the production bundle, opens it in a real
// browser and runs the checks of ./checks.mjs against it. The suite runs
// twice: once with the normal motion and once with `prefers-reduced-motion:
// reduce` emulated by the browser.
//
//   node tools/anim-audit/index.mjs                 build, serve and audit
//   node tools/anim-audit/index.mjs --no-build      audit the existing dist
//   node tools/anim-audit/index.mjs --url http://…  audit a running server
//   node tools/anim-audit/index.mjs --only nav      run a single check
//
// The exit code is 0 when every check passed and 1 when one of them failed,
// which is what a CI job needs.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "./cdp.mjs";
import {
  normalChecks,
  reducedChecks,
  waitForApp,
  waitForSettled,
} from "./checks.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const VITE_BIN = join(ROOT, "node_modules", "vite", "bin", "vite.js");

// ---------------------------------------------------------------- options

function parseArgs(argv) {
  const options = {
    url: null,
    build: true,
    port: 4173,
    only: null,
    report: join(ROOT, ".freebuff", "audit", "report.json"),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--no-build") options.build = false;
    else if (arg === "--url") options.url = argv[++i];
    else if (arg === "--port") options.port = Number(argv[++i]);
    else if (arg === "--only") options.only = argv[++i];
    else if (arg === "--report") options.report = resolve(argv[++i]);
    else if (arg === "--help" || arg === "-h") options.help = true;
  }
  return options;
}

// ---------------------------------------------------------------- server

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: "inherit",
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise(0);
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (response.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return false;
}

/**
 * Serves the built site. `vite preview` is used because it serves the same
 * files the production build produces - the audit then measures the bundle
 * that actually ships.
 */
async function startServer(port) {
  if (!existsSync(join(ROOT, "dist", "index.html"))) {
    throw new Error("There is no dist/ folder to serve. Run the build first.");
  }
  const child = spawn(
    process.execPath,
    [VITE_BIN, "preview", "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }
  );
  child.stdout.on("data", () => {});
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  const url = `http://127.0.0.1:${port}`;
  const ready = await waitForServer(url);
  if (!ready) {
    child.kill();
    throw new Error(`The preview server did not answer on ${url}`);
  }
  return { child, url };
}

// ---------------------------------------------------------------- checks

async function runCheck(client, check, base) {
  const started = Date.now();
  try {
    if (check.route) {
      await client.navigate(`${base}${check.route}?audit=1`);
      if (check.waitForApp !== false) {
        const ready = await waitForApp(client);
        if (!ready) {
          return {
            pass: false,
            detail: "the page never became ready",
            durationMs: Date.now() - started,
          };
        }
        // The router resolves its first location a moment after the page
        // loaded and resets the scroll when it does. A check that scrolls
        // before that happens would be dragged back to the top.
        await waitForSettled(client);
      }
    }
    const result = await check.run(client);
    return { ...result, durationMs: Date.now() - started };
  } catch (error) {
    return {
      pass: false,
      detail: `the check threw an error: ${error.message}`,
      data: { stack: String(error.stack).split("\n").slice(0, 4).join("\n") },
      durationMs: Date.now() - started,
    };
  }
}

function matches(check, only) {
  if (!only) return true;
  return (
    check.id === only ||
    check.group.toLowerCase() === only.toLowerCase() ||
    check.id.toLowerCase().startsWith(only.toLowerCase())
  );
}

// ---------------------------------------------------------------- report

const GREEN = "[32m";
const RED = "[31m";
const DIM = "[2m";
const BOLD = "[1m";
const RESET = "[0m";

function printGroup(name, results) {
  console.log(`\n${BOLD}${name}${RESET}`);
  for (const result of results) {
    const mark = result.pass ? `${GREEN}pass${RESET}` : `${RED}FAIL${RESET}`;
    const seconds = (result.durationMs / 1000).toFixed(1);
    console.log(
      `  ${mark}  ${result.id.padEnd(22)} ${result.detail} ${DIM}(${seconds}s)${RESET}`
    );
    if (!result.pass && result.data) {
      console.log(
        `        ${DIM}${JSON.stringify(result.data).slice(0, 600)}${RESET}`
      );
    }
  }
}

// ---------------------------------------------------------------- main

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(
      [
        "The animation audit",
        "",
        "  --no-build      do not build, use the existing dist/",
        "  --url <url>     audit a server that is already running",
        "  --port <port>   the port for the preview server (default 4173)",
        "  --only <id>     run a single check or group",
        "  --report <path> where the JSON report is written",
      ].join("\n")
    );
    return 0;
  }

  let server = null;
  let base = options.url;
  if (!base) {
    if (options.build) {
      console.log(`${DIM}building...${RESET}`);
      await run(process.execPath, [VITE_BIN, "build"]);
    }
    server = await startServer(options.port);
    base = server.url;
  }
  console.log(`${DIM}auditing ${base}${RESET}`);

  const report = { base, startedAt: new Date().toISOString(), passes: {} };
  let failed = 0;

  try {
    // ---- pass one: the site as it normally behaves
    {
      const client = await launch({ reducedMotion: false });
      client.base = base;
      const results = [];
      for (const check of normalChecks.filter((c) => matches(c, options.only))) {
        const result = await runCheck(client, check, base);
        results.push({ id: check.id, group: check.group, title: check.title, ...result });
        if (!result.pass) failed++;
      }
      printGroup("Normal motion", results);
      report.passes.normal = results;
      await client.close();
    }

    // ---- pass two: the site as it behaves with less motion
    {
      const client = await launch({ reducedMotion: true });
      client.base = base;
      const results = [];
      for (const check of reducedChecks.filter((c) => matches(c, options.only))) {
        const result = await runCheck(client, check, base);
        results.push({ id: check.id, group: check.group, title: check.title, ...result });
        if (!result.pass) failed++;
      }
      printGroup("Reduced motion", results);
      report.passes.reduced = results;
      await client.close();
    }
  } finally {
    if (server) server.child.kill();
  }

  const total =
    (report.passes.normal?.length || 0) + (report.passes.reduced?.length || 0);
  report.finishedAt = new Date().toISOString();
  report.failed = failed;
  report.total = total;

  try {
    mkdirSync(dirname(options.report), { recursive: true });
    writeFileSync(options.report, JSON.stringify(report, null, 2));
    console.log(`\n${DIM}report written to ${options.report}${RESET}`);
  } catch (error) {
    console.log(`\n${DIM}the report could not be written: ${error.message}${RESET}`);
  }

  if (failed > 0) {
    console.log(
      `\n${RED}${failed} of ${total} checks failed${RESET}\n`
    );
    return 1;
  }
  console.log(`\n${GREEN}all ${total} checks passed${RESET}\n`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(`\n${RED}the audit could not run: ${error.message}${RESET}`);
    process.exit(1);
  });
