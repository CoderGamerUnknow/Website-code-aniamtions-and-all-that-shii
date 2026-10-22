// A dependency-free Chrome DevTools Protocol client.
//
// The audit drives a real browser, so it needs a real CDP connection. The
// protocol is a JSON-RPC over WebSocket, and Node 22+ ships a WebSocket
// client in the standard library, so nothing has to be installed.
//
// The browser is discovered instead of hardcoded: CI runs on Linux, local
// development usually runs Edge or Chrome on Windows or macOS.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// Candidate binaries, most preferred first. `CHROME_PATH` overrides all of
// them, which is what a CI job with a pinned browser uses.
const BROWSER_CANDIDATES = {
  win32: [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ],
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ],
};

export function findBrowser() {
  const override = process.env.CHROME_PATH || process.env.BROWSER_PATH;
  if (override) {
    if (!existsSync(override)) {
      throw new Error(`CHROME_PATH does not exist: ${override}`);
    }
    return override;
  }
  const candidates = BROWSER_CANDIDATES[process.platform] || [];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    "No Chrome or Chromium binary found. Install one or set CHROME_PATH."
  );
}

/**
 * Launches a headless browser and returns a client for the first page.
 *
 * `reducedMotion` starts the browser with the media feature emulated, which
 * is how the audit exercises the `prefers-reduced-motion` branch.
 */
export async function launch({ reducedMotion = false, port = 0 } = {}) {
  const binary = findBrowser();
  const profileDir = mkdtempSync(join(tmpdir(), "anim-audit-"));
  const debugPort = port || 9222 + Math.floor(Math.random() * 500);

  const args = [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    "--window-size=1920,936",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--autoplay-policy=no-user-gesture-required",
    // Without this the headless browser throttles timers in a background
    // tab, which stalls the requestAnimationFrame loops the audit measures.
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ];
  // A CI container usually runs the browser as root, where the sandbox is
  // not available. A developer machine keeps the sandbox on.
  if (process.env.CI) args.push("--no-sandbox", "--disable-setuid-sandbox");
  args.push("about:blank");

  const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });

  const cleanup = () => {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(1);
  });

  const wsUrl = await waitForDevtools(debugPort);
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let messageId = 0;
  const pending = new Map();
  const consoleMessages = [];

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    if (message.method === "Runtime.consoleAPICalled") {
      consoleMessages.push({
        type: message.params.type,
        text: (message.params.args || [])
          .map((arg) => arg.value ?? arg.description ?? arg.type)
          .join(" "),
      });
    } else if (message.method === "Runtime.exceptionThrown") {
      consoleMessages.push({
        type: "exception",
        text:
          message.params.exceptionDetails?.exception?.description ||
          message.params.exceptionDetails?.text,
      });
    } else if (message.method === "Log.entryAdded") {
      const entry = message.params.entry;
      consoleMessages.push({
        type: entry.level,
        text: `${entry.text} ${entry.url || ""}`.trim(),
      });
    }
  });

  const send = (method, params = {}, sessionId) => {
    const id = ++messageId;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 120000);
    });
  };

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  await send("Log.enable", {}, sessionId);

  if (reducedMotion) {
    await send(
      "Emulation.setEmulatedMedia",
      {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      },
      sessionId
    );
  }

  const client = {
    consoleMessages,
    send,
    // Exposed so a caller can issue page-scoped commands of its own, such as
    // emulating a phone-sized viewport.
    sessionId,

    async evaluate(expression) {
      const result = await send(
        "Runtime.evaluate",
        { expression, awaitPromise: true, returnByValue: true },
        sessionId
      );
      if (result.exceptionDetails) {
        throw new Error(
          "eval failed: " +
            (result.exceptionDetails.exception?.description ||
              result.exceptionDetails.text)
        );
      }
      return result.result.value;
    },

    async navigate(url) {
      const loaded = new Promise((resolve) => {
        const finish = () => {
          ws.removeEventListener("message", handler);
          clearTimeout(timer);
          resolve();
        };
        const handler = (event) => {
          const message = JSON.parse(event.data);
          if (message.method === "Page.loadEventFired") finish();
        };
        // A navigation that never finishes loading must not hang the audit.
        const timer = setTimeout(finish, 20000);
        ws.addEventListener("message", handler);
      });
      await send("Page.navigate", { url }, sessionId);
      await loaded;
    },

    async mouseMove(x, y) {
      await send(
        "Input.dispatchMouseEvent",
        { type: "mouseMoved", x, y },
        sessionId
      );
    },

    async click(x, y) {
      await client.mouseMove(x, y);
      await sleep(120);
      await send(
        "Input.dispatchMouseEvent",
        { type: "mousePressed", x, y, button: "left", clickCount: 1 },
        sessionId
      );
      await send(
        "Input.dispatchMouseEvent",
        { type: "mouseReleased", x, y, button: "left", clickCount: 1 },
        sessionId
      );
    },

    async wheel(deltaY, times, gapMs = 50) {
      for (let i = 0; i < times; i++) {
        send(
          "Input.dispatchMouseEvent",
          { type: "mouseWheel", x: 960, y: 400, deltaX: 0, deltaY },
          sessionId
        ).catch(() => {});
        await sleep(gapMs);
      }
    },

    async screenshot() {
      const { data } = await send(
        "Page.captureScreenshot",
        { format: "png" },
        sessionId
      );
      return Buffer.from(data, "base64");
    },

    async close() {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      cleanup();
    },
  };

  return client;
}

async function waitForDevtools(port) {
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      const info = await response.json();
      if (info.webSocketDebuggerUrl) return info.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(200);
  }
  throw new Error("The browser did not expose a devtools endpoint in time");
}

export { sleep };
