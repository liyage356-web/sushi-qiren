import { writeFile } from "node:fs/promises";

const DEBUG_ORIGIN = "http://127.0.0.1:9336";
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

  async waitFor(expression, timeout = 7000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (await this.evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
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
            event.params.entry.level === "error") ||
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
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: mobile,
    maxTouchPoints: 1,
  });
}

async function navigate(session, route) {
  navigate.revision = (navigate.revision || 0) + 1;
  await session.send("Page.navigate", {
    url: `${PAGE_ORIGIN}?qa=${navigate.revision}#${route}`,
  });
  await session.waitFor("document.readyState === 'complete'");
  await session.evaluate("document.fonts.ready.then(() => true)");
}

async function openFromStreet(session) {
  await navigate(session, "street");
  await session.waitFor(
    "document.querySelector('#streetView').hidden === false",
  );
  await session.evaluate(
    "document.querySelector('.hotspot-baozi').click(); true",
  );
  await session.waitFor(
    "document.querySelector('#dogBuLiExperience').hidden === false",
  );
  await session.waitFor("location.hash === '#gou-bu-li/street'");
}

async function readState(session) {
  return session.evaluate(`(() => {
    const experience = document.querySelector("#dogBuLiExperience");
    const activePage = document.querySelector("[data-dog-page-panel]:not([hidden])");
    const nav = document.querySelector(".dog-step-nav");
    const toolbar = document.querySelector(".dog-toolbar");
    const activeNav = document.querySelector(".dog-step-nav [aria-current='page']");
    return {
      hash: location.hash,
      visible: !experience.hidden,
      bodyClass: document.body.className,
      activePage: activePage?.dataset.dogPagePanel,
      pageCount: document.querySelectorAll("[data-dog-page-panel]").length,
      navCount: document.querySelectorAll("[data-dog-page]").length,
      activeNav: activeNav?.dataset.dogPage,
      observationCount: document.querySelector("#dogObservationCount").textContent.trim(),
      observationTitle: document.querySelector("#dogObservationTitle").textContent.trim(),
      visitedHotspots: document.querySelectorAll("[data-dog-hotspot].is-visited").length,
      originalOpen: !document.querySelector("#dogOriginalModal").hidden,
      toolbarRect: (() => {
        const r = toolbar.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      })(),
      navRect: (() => {
        const r = nav.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      })(),
      viewport: { width: innerWidth, height: innerHeight },
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  })()`);
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

await setViewport(session, 1366, 768, false);
await openFromStreet(session);
const streetInitial = await readState(session);
await session.screenshot("gou-bu-li-stage1-street-1366.png");

const hotspotSnapshots = [];
for (const hotspot of ["sign", "steamer", "person", "customer"]) {
  await session.evaluate(
    `document.querySelector('[data-dog-hotspot="${hotspot}"]').click(); true`,
  );
  hotspotSnapshots.push(await readState(session));
}

const fourViewed = await readState(session);
await session.evaluate(
  "document.querySelector('[data-dog-next=\"shop\"]').click(); true",
);
await session.waitFor("location.hash === '#gou-bu-li/shop'");
const shop = await readState(session);
await session.screenshot("gou-bu-li-stage1-shop-1366.png");

const pageSnapshots = [];
for (const page of ["craft", "market", "name", "fame", "reflection"]) {
  await session.evaluate(
    `document.querySelector('[data-dog-page="${page}"]').click(); true`,
  );
  await session.waitFor(`location.hash === '#gou-bu-li/${page}'`);
  pageSnapshots.push(await readState(session));
  await session.screenshot(`gou-bu-li-stage1-${page}-1366.png`);
}

await session.evaluate(
  "document.querySelector('#dogOriginalButton').click(); true",
);
await session.waitFor(
  "document.querySelector('#dogOriginalModal').hidden === false",
);
const originalOpen = await readState(session);
await session.evaluate(
  "document.querySelector('[data-dog-original-close]').click(); true",
);
await session.waitFor(
  "document.querySelector('#dogOriginalModal').hidden === true",
);

await session.evaluate(
  "document.querySelector('#dogBuLiBackButton').click(); true",
);
await session.waitFor(
  "document.querySelector('#dogBuLiExperience').hidden === true",
);
const returned = await readState(session);

await navigate(session, "gou-bu-li/craft");
await session.waitFor(
  "document.querySelector('#dogBuLiExperience').hidden === false",
);
const directRoute = await readState(session);

await setViewport(session, 390, 844, true);
await openFromStreet(session);
await session.evaluate(
  "document.querySelector('[data-dog-hotspot=\"person\"]').click(); true",
);
const mobileStreet = await readState(session);
await session.screenshot("gou-bu-li-stage1-street-mobile-390.png");
await session.evaluate(
  "document.querySelector('#dogSkipButton').click(); true",
);
await session.waitFor(
  "document.querySelector('#dogOriginalModal').hidden === false",
);
const mobileOriginal = await readState(session);
await session.screenshot("gou-bu-li-stage1-original-mobile-390.png");

const assertions = {
  streetHotspotOpensIntegratedStory:
    streetInitial.visible &&
    streetInitial.activePage === "street" &&
    streetInitial.bodyClass.includes("dog-story-open"),
  contentAndNavigationScaffold:
    streetInitial.pageCount === 7 &&
    streetInitial.navCount === 7 &&
    streetInitial.activeNav === "street",
  fourObservationHotspots:
    fourViewed.observationCount === "4 / 4" &&
    fourViewed.visitedHotspots === 4 &&
    hotspotSnapshots.every((snapshot, index) =>
      index === 0 ? snapshot.visitedHotspots === 1 : true,
    ),
  shopPageIsReachable:
    shop.activePage === "shop" &&
    shop.activeNav === "shop" &&
    shop.hash === "#gou-bu-li/shop",
  everyChapterIsNavigable:
    pageSnapshots.length === 5 &&
    pageSnapshots.every(
      (snapshot, index) =>
        snapshot.activePage ===
          ["craft", "market", "name", "fame", "reflection"][index] &&
        snapshot.activeNav === snapshot.activePage,
    ),
  originalCanOpenAndClose: originalOpen.originalOpen,
  returnsToStreet:
    returned.visible === false && returned.hash === "#street",
  directRouteWorks:
    directRoute.visible &&
    directRoute.activePage === "craft" &&
    directRoute.hash === "#gou-bu-li/craft",
  mobileFitsViewport:
    mobileStreet.viewport.width === 390 &&
    mobileStreet.overflow <= 0 &&
    mobileStreet.toolbarRect.right <= 390 &&
    mobileStreet.navRect.right <= 390,
  mobileOriginalAccessible:
    mobileOriginal.originalOpen && mobileOriginal.overflow <= 0,
  noBrowserErrors: session.errors().length === 0,
};

console.log(
  JSON.stringify(
    {
      assertions,
      streetInitial,
      hotspotSnapshots,
      fourViewed,
      shop,
      pageSnapshots,
      originalOpen,
      returned,
      directRoute,
      mobileStreet,
      mobileOriginal,
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
