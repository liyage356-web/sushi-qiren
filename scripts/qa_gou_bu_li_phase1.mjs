import { writeFile } from "node:fs/promises";

const DEBUG_ORIGIN = "http://127.0.0.1:9336";
const PAGE_ORIGIN = "http://127.0.0.1:4173/gou-bu-li/index.html";
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

async function loadPage(session) {
  loadPage.revision = (loadPage.revision || 0) + 1;
  await session.send("Page.navigate", {
    url: `${PAGE_ORIGIN}?qa=${loadPage.revision}#street`,
  });
  await session.waitFor("document.readyState === 'complete'");
  await session.evaluate("document.fonts.ready.then(() => true)");
  await new Promise((resolve) => setTimeout(resolve, 280));
}

async function elementCenter(session, selector) {
  return session.evaluate(`(() => {
    const rect = document.querySelector(${JSON.stringify(selector)})
      .getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
}

async function mouseClick(session, point) {
  await session.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "none",
  });
  await session.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await session.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
}

async function readState(session) {
  return session.evaluate(`(() => {
    const stage = document.querySelector(".street-stage");
    const image = document.querySelector(".street-stage-art");
    const hotspots = [...document.querySelectorAll("[data-street]")];
    const activePanel = document.querySelector(".scene-panel:not([hidden])");
    return {
      activeScene: activePanel?.dataset.scene,
      hash: location.hash,
      navCurrent: document.querySelector(
        ".chapter-nav button[aria-current='page']"
      )?.textContent.trim(),
      imageLoaded: image.complete && image.naturalWidth > 0,
      imageSource: image.getAttribute("src"),
      stageRatio: stage.getBoundingClientRect().width /
        stage.getBoundingClientRect().height,
      hotspotCount: hotspots.length,
      hotspotLabels: hotspots.map((item) => item.textContent.trim()),
      visitCount: document.querySelector("#streetVisitCount").textContent.trim(),
      panelTitle: document.querySelector("#streetPanel h2").textContent.trim(),
      panelCopy: document.querySelector("#streetPanelCopy").textContent.trim(),
      originalOpen: !document.querySelector("#originalModal").hidden,
      originalText: document.querySelector("#originalContent").textContent.trim(),
      soundPressed: document.querySelector("#soundButton").getAttribute("aria-pressed"),
      documentOverflow: document.documentElement.scrollWidth - innerWidth,
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

await setViewport(session, 1366, 768, false);
await loadPage(session);
const initial = await readState(session);
await session.screenshot("gou-bu-li-phase1-desktop.png");

await session.evaluate("document.querySelector('[data-street=\"sign\"]').click(); true");
const sign = await readState(session);
await session.evaluate("document.querySelector('[data-street=\"steamer\"]').click(); true");
const steamer = await readState(session);
await session.evaluate("document.querySelector('[data-street=\"person\"]').click(); true");
const person = await readState(session);
await session.evaluate("document.querySelector('[data-street=\"customer\"]').click(); true");
const customer = await readState(session);
await session.screenshot("gou-bu-li-phase1-observed-desktop.png");

await session.evaluate("document.querySelector('#skipButton').click(); true");
await session.waitFor("document.querySelector('#originalModal').hidden === false");
const original = await readState(session);
await session.evaluate("document.querySelector('.dialog-close').click(); true");

await session.evaluate("document.querySelector('[data-scene-go=\"craft\"]').click(); true");
await session.waitFor("location.hash === '#craft'");
const craft = await readState(session);
await session.evaluate("document.querySelector('[data-scene-go=\"reflection\"]').click(); true");
await session.waitFor("location.hash === '#reflection'");
const reflection = await readState(session);
await session.evaluate("document.querySelector('#restartStory').click(); true");
await session.waitFor("location.hash === '#street'");
const restarted = await readState(session);

await mouseClick(session, await elementCenter(session, "#soundButton"));
await session.waitFor(
  "document.querySelector('#soundButton').getAttribute('aria-pressed') === 'true'",
);
const sound = await readState(session);

await setViewport(session, 390, 844, true);
await loadPage(session);
const mobileInitial = await readState(session);
const mobileTargets = await session.evaluate(`(() => {
  return [...document.querySelectorAll("[data-street]")].map((item) => {
    const rect = item.getBoundingClientRect();
    return { label: item.textContent.trim(), width: rect.width, height: rect.height };
  });
})()`);
await session.evaluate("document.querySelector('[data-street=\"person\"]').click(); true");
const mobilePerson = await readState(session);
await session.screenshot("gou-bu-li-phase1-mobile-390.png");

const assertions = {
  assetLoaded:
    initial.imageLoaded && initial.imageSource === "assets/bao-shop-busy.webp",
  streetFrameReady:
    initial.activeScene === "street" &&
    initial.navCurrent.includes("巷口闻香") &&
    initial.hotspotCount === 4,
  hotspotsAdvance:
    sign.visitCount === "1 / 4" &&
    steamer.visitCount === "2 / 4" &&
    person.visitCount === "3 / 4" &&
    customer.visitCount === "4 / 4" &&
    customer.panelTitle === "桌边的人，自己取包子",
  originalAlwaysAvailable:
    original.originalOpen &&
    original.originalText.includes("狗子行呵，不理人啦！"),
  navigationWorks:
    craft.activeScene === "craft" &&
    craft.hash === "#craft" &&
    reflection.activeScene === "reflection" &&
    reflection.hash === "#reflection" &&
    restarted.activeScene === "street" &&
    restarted.visitCount === "0 / 4",
  soundControlHasState: sound.soundPressed === "true",
  mobileTargetsUsable:
    mobileInitial.documentOverflow <= 0 &&
    mobileTargets.length === 4 &&
    mobileTargets.every((target) => target.width >= 44 && target.height >= 44),
  mobileInteractionWorks:
    mobilePerson.visitCount === "1 / 4" &&
    mobilePerson.panelTitle === "只顾手上的活计" &&
    mobilePerson.documentOverflow <= 0,
  noBrowserErrors: session.errors().length === 0,
};

console.log(
  JSON.stringify(
    {
      assertions,
      initial,
      sign,
      steamer,
      person,
      customer,
      original,
      craft,
      reflection,
      restarted,
      sound,
      mobileInitial,
      mobileTargets,
      mobilePerson,
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
