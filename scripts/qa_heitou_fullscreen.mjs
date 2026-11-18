import { writeFile } from "node:fs/promises";

const DEBUG_ORIGIN = "http://127.0.0.1:9335";
const PAGE_ORIGIN = "http://127.0.0.1:4173/";
const OUTPUT_DIR = new URL("../", import.meta.url);

class Session {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) {
        this.events.push(message);
        return;
      }
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text,
      );
    }
    return result.result.value;
  }

  async waitFor(expression, timeout = 6000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (await this.evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  }

  async screenshot(name) {
    const result = await this.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    await writeFile(new URL(name, OUTPUT_DIR), result.data, "base64");
  }

  errors() {
    return this.events
      .filter(
        (event) =>
          event.method === "Runtime.exceptionThrown" ||
          (event.method === "Log.entryAdded" &&
            ["error", "warning"].includes(event.params.entry.level)) ||
          (event.method === "Runtime.consoleAPICalled" &&
            event.params.type === "error"),
      )
      .map((event) => {
        if (event.method === "Runtime.exceptionThrown") {
          return event.params.exceptionDetails.text;
        }
        if (event.method === "Log.entryAdded") return event.params.entry.text;
        return event.params.args
          .map((argument) => argument.value || argument.description || "")
          .join(" ");
      });
  }
}

async function connect() {
  const response = await fetch(
    `${DEBUG_ORIGIN}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  );
  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return new Session(socket);
}

async function setViewport(session, width, height, mobile) {
  await session.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
}

async function inspectPage(session, pageName, screenshotName) {
  await session.send("Page.navigate", {
    url: `${PAGE_ORIGIN}#heitou/${pageName}`,
  });
  await session.waitFor(
    `document.readyState === 'complete' &&
      document.querySelector('#heiTouExperience').hidden === false`,
  );
  await session.evaluate("document.fonts.ready.then(() => true)");
  await new Promise((resolve) => setTimeout(resolve, 520));

  const geometry = await session.evaluate(`(() => {
    const targetPage = ${JSON.stringify(pageName)};
    const rect = (element) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };
    const root = document.querySelector("#heiTouExperience");
    const panel = document.querySelector(
      '[data-story-page-panel="${pageName}"]'
    );
    const scene = targetPage === "street"
      ? document.querySelector("#streetExplore")
      : targetPage === "fish"
        ? document.querySelector("#fishCanvas")
        : panel.firstElementChild;
    return {
      pageName: targetPage,
      root: rect(root),
      panel: rect(panel),
      scene: rect(scene),
      toolbar: rect(document.querySelector(".story-toolbar")),
      navigation: rect(document.querySelector(".story-step-nav")),
      position: getComputedStyle(root).position,
      bodyOverflow: getComputedStyle(document.body).overflow,
      documentOverflow:
        document.documentElement.scrollWidth - window.innerWidth,
      viewport: { width: innerWidth, height: innerHeight },
      panelVisible: !panel.hidden,
      activeStep: document.querySelector(
        '.story-step-nav button[aria-current="page"] strong'
      )?.textContent,
    };
  })()`);

  await session.screenshot(screenshotName);
  return geometry;
}

const session = await connect();
await Promise.all([
  session.send("Page.enable"),
  session.send("Runtime.enable"),
  session.send("Log.enable"),
  session.send("Network.enable"),
]);
await session.send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});

const desktopPages = [
  ["street", "heitou-fullscreen-street-1366.png"],
  ["fish", "heitou-fullscreen-fish-1366.png"],
  ["courtyard", "heitou-fullscreen-courtyard-1366.png"],
  ["guardian", "heitou-fullscreen-guardian-1366.png"],
  ["ending", "heitou-fullscreen-ending-1366.png"],
  ["reflection", "heitou-fullscreen-reflection-1366.png"],
];

await setViewport(session, 1366, 768, false);
const desktop = [];
for (const [pageName, screenshot] of desktopPages) {
  desktop.push(await inspectPage(session, pageName, screenshot));
}

await setViewport(session, 390, 844, true);
const mobile = [];
for (const [pageName, screenshot] of [
  ["street", "heitou-fullscreen-street-mobile-390.png"],
  ["fish", "heitou-fullscreen-fish-mobile-390.png"],
  ["guardian", "heitou-fullscreen-guardian-mobile-390.png"],
]) {
  mobile.push(await inspectPage(session, pageName, screenshot));
}

const expected = (result, viewport) =>
  Math.abs(result.root.width - viewport.width) < 1 &&
  Math.abs(result.root.height - viewport.height) < 1 &&
  result.position === "fixed" &&
  result.bodyOverflow === "hidden" &&
  result.documentOverflow <= 0 &&
  result.panelVisible &&
  Math.abs(result.panel.width - viewport.width) < 1 &&
  Math.abs(result.panel.height - viewport.height) < 1;

const scenePages = [...desktop, ...mobile].filter((result) =>
  ["street", "fish"].includes(result.pageName),
);
const assertions = {
  allPagesUseFullViewport: desktop.every((result) =>
    expected(result, result.viewport),
  ),
  desktopScenesFillViewport: scenePages
    .filter((result) => result.viewport.width === 1366)
    .every(
      (result) =>
        Math.abs(result.scene.left) < 1 &&
        Math.abs(result.scene.top) < 1 &&
        Math.abs(result.scene.width - result.viewport.width) < 1 &&
        Math.abs(result.scene.height - result.viewport.height) < 1,
    ),
  mobileUsesFullViewport: mobile.every((result) =>
    expected(result, result.viewport),
  ),
  overlaysDoNotConsumeLayout:
    desktop.every(
      (result) =>
        result.navigation.top >= result.toolbar.bottom - 1 &&
        result.navigation.bottom <= result.viewport.height,
    ) &&
    mobile.every(
      (result) =>
        result.navigation.top >= result.toolbar.bottom - 1 &&
        result.navigation.bottom <= result.viewport.height,
    ),
  noBrowserErrors: session.errors().length === 0,
};

console.log(
  JSON.stringify(
    {
      assertions,
      desktop,
      mobile,
      browserErrors: session.errors(),
    },
    null,
    2,
  ),
);

if (Object.values(assertions).some((passed) => !passed)) {
  process.exitCode = 1;
}

session.socket.close();
