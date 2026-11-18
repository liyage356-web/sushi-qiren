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
    "document.querySelector('.hotspot-clay').click(); true",
  );
  await session.waitFor(
    "document.querySelector('#niRenZhangExperience').hidden === false",
  );
  await session.waitFor("location.hash === '#ni-ren-zhang/restaurant'");
}

async function readState(session) {
  return session.evaluate(`(() => {
    const experience = document.querySelector("#niRenZhangExperience");
    const activePage = document.querySelector("[data-nr-page-panel]:not([hidden])");
    const nav = document.querySelector(".nr-step-nav");
    const toolbar = document.querySelector(".nr-toolbar");
    const activeNav = document.querySelector(".nr-step-nav [aria-current='page']");
    const heroImage = document.querySelector(".nr-restaurant-background");
    return {
      hash: location.hash,
      visible: !experience.hidden,
      bodyClass: document.body.className,
      activePage: activePage?.dataset.nrPagePanel,
      pageCount: document.querySelectorAll("[data-nr-page-panel]").length,
      navCount: document.querySelectorAll("[data-nr-page]").length,
      activeNav: activeNav?.dataset.nrPage,
      observationCount: document.querySelector("#nrObservationCount").textContent.trim(),
      observationTitle: document.querySelector("#nrObservationTitle").textContent.trim(),
      visitedHotspots: document.querySelectorAll("[data-nr-hotspot].is-visited").length,
      originalOpen: !document.querySelector("#niRenZhangOriginalModal").hidden,
      heroLoaded: heroImage.complete && heroImage.naturalWidth > 0,
      heroSize: { width: heroImage.naturalWidth, height: heroImage.naturalHeight },
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
const restaurantInitial = await readState(session);
await session.screenshot("ni-ren-zhang-stage1-restaurant-1366.png");

const hotspotSnapshots = [];
for (const hotspot of ["cup", "door", "diners", "mudman"]) {
  await session.evaluate(
    `document.querySelector('[data-nr-hotspot="${hotspot}"]').click(); true`,
  );
  hotspotSnapshots.push(await readState(session));
}
const fourViewed = await readState(session);

const pageSnapshots = [];
for (const page of ["observe", "craft", "reveal", "market", "ending", "reflection"]) {
  await session.evaluate(
    `document.querySelector('[data-nr-page="${page}"]').click(); true`,
  );
  await session.waitFor(`location.hash === '#ni-ren-zhang/${page}'`);
  pageSnapshots.push(await readState(session));
  await session.screenshot(`ni-ren-zhang-stage1-${page}-1366.png`);
}

await session.evaluate(
  "document.querySelector('#niRenZhangOriginalButton').click(); true",
);
await session.waitFor(
  "document.querySelector('#niRenZhangOriginalModal').hidden === false",
);
const originalOpen = await readState(session);
await session.evaluate(
  "document.querySelector('[data-nr-original-close]').click(); true",
);
await session.waitFor(
  "document.querySelector('#niRenZhangOriginalModal').hidden === true",
);

await session.evaluate(
  "document.querySelector('#niRenZhangBackButton').click(); true",
);
await session.waitFor(
  "document.querySelector('#niRenZhangExperience').hidden === true",
);
const returned = await readState(session);

await navigate(session, "ni-ren-zhang/craft");
await session.waitFor(
  "document.querySelector('#niRenZhangExperience').hidden === false",
);
const directRoute = await readState(session);

await setViewport(session, 390, 844, true);
await openFromStreet(session);
await session.evaluate(
  "document.querySelector('[data-nr-hotspot=\"mudman\"]').click(); true",
);
const mobileRestaurant = await readState(session);
await session.screenshot("ni-ren-zhang-stage1-restaurant-mobile-390.png");
await session.evaluate(
  "document.querySelector('#niRenZhangSkipButton').click(); true",
);
await session.waitFor(
  "document.querySelector('#niRenZhangOriginalModal').hidden === false",
);
const mobileOriginal = await readState(session);
await session.screenshot("ni-ren-zhang-stage1-original-mobile-390.png");

const assertions = {
  streetHotspotOpensIntegratedStory:
    restaurantInitial.visible &&
    restaurantInitial.activePage === "restaurant" &&
    restaurantInitial.bodyClass.includes("nr-story-open"),
  suppliedArtworkLoads:
    restaurantInitial.heroLoaded &&
    restaurantInitial.heroSize.width === 1671 &&
    restaurantInitial.heroSize.height === 941,
  contentAndNavigationScaffold:
    restaurantInitial.pageCount === 7 &&
    restaurantInitial.navCount === 7 &&
    restaurantInitial.activeNav === "restaurant",
  fourObservationHotspots:
    fourViewed.observationCount === "4 / 4" &&
    fourViewed.visitedHotspots === 4,
  everyChapterIsNavigable:
    pageSnapshots.length === 6 &&
    pageSnapshots.every(
      (snapshot, index) =>
        snapshot.activePage ===
          ["observe", "craft", "reveal", "market", "ending", "reflection"][index] &&
        snapshot.activeNav === snapshot.activePage,
    ),
  originalCanOpen: originalOpen.originalOpen,
  returnsToStreet:
    returned.visible === false && returned.hash === "#street",
  directRouteWorks:
    directRoute.visible &&
    directRoute.activePage === "craft" &&
    directRoute.hash === "#ni-ren-zhang/craft",
  mobileFitsViewport:
    mobileRestaurant.viewport.width === 390 &&
    mobileRestaurant.overflow <= 0 &&
    mobileRestaurant.toolbarRect.right <= 390 &&
    mobileRestaurant.navRect.right <= 390,
  mobileOriginalAccessible:
    mobileOriginal.originalOpen && mobileOriginal.overflow <= 0,
  noBrowserErrors: session.errors().length === 0,
};

console.log(
  JSON.stringify(
    {
      assertions,
      restaurantInitial,
      hotspotSnapshots,
      fourViewed,
      pageSnapshots,
      originalOpen,
      returned,
      directRoute,
      mobileRestaurant,
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
