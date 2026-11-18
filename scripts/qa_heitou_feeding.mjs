import { writeFile } from "node:fs/promises";

const DEBUG_ORIGIN = "http://127.0.0.1:9336";
const PAGE_URL = "http://127.0.0.1:4173/#heitou/street";
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

  async waitFor(expression, timeout = 5000) {
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
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: mobile,
    maxTouchPoints: 1,
  });
}

async function resetStreet(session) {
  resetStreet.revision = (resetStreet.revision || 0) + 1;
  await session.send("Page.navigate", {
    url: `${PAGE_URL.split("#")[0]}?qa=${resetStreet.revision}#heitou/street`,
  });
  await session.waitFor(
    "document.readyState === 'complete' && document.querySelector('#heiTouExperience').hidden === false",
  );
  await session.evaluate("document.fonts.ready.then(() => true)");
  await session.evaluate("document.querySelector('#streetDogHotspot').click(); true");
  await session.waitFor(
    "document.querySelector('#streetExplore').dataset.state === 'focused'",
  );
}

async function elementCenter(session, selector) {
  return session.evaluate(`(() => {
    const rect = document.querySelector(${JSON.stringify(selector)})
      .getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
}

async function mouseDrag(session, from, to) {
  await session.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: from.x,
    y: from.y,
    button: "none",
  });
  await session.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: from.x,
    y: from.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  for (let index = 1; index <= 8; index += 1) {
    const progress = index / 8;
    await session.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
      button: "left",
      buttons: 1,
    });
  }
  await session.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: to.x,
    y: to.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
}

async function touchDrag(session, from, to) {
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y, id: 1, radiusX: 2, radiusY: 2 }],
  });
  for (let index = 1; index <= 8; index += 1) {
    const progress = index / 8;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
          id: 1,
          radiusX: 2,
          radiusY: 2,
        },
      ],
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function readState(session) {
  return session.evaluate(`(() => ({
    attempts: Number(document.querySelector("#streetFeedAttempt").textContent),
    status: document.querySelector("#streetFeedStatus").textContent.trim(),
    unlockedMessage: document.querySelector("#streetFeedUnlocked").textContent.trim(),
    unlockedMessageHidden: document.querySelector("#streetFeedUnlocked").hidden,
    wildDogTriggerCount:
      document.querySelector("#streetExplore").dataset.wildDogTriggerCount,
    feedState: document.querySelector("#streetExplore").dataset.feedState,
    followDisabled: document.querySelector("#streetFollowButton").disabled,
    followLabel: document.querySelector("#streetFollowButton").textContent.trim(),
    fishNavDisabled:
      document.querySelector('.story-step-nav button[data-story-page="fish"]').disabled,
    foodPressed: document.querySelector("#streetFeedFood").getAttribute("aria-pressed"),
    targetArmed: document.querySelector("#streetFeedTarget").classList.contains("is-armed"),
    wildDogVisible:
      getComputedStyle(document.querySelector("#streetWildDogEncounter")).visibility,
    viewport: { width: innerWidth, height: innerHeight },
    documentOverflow: document.documentElement.scrollWidth - innerWidth,
  }))()`);
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
await resetStreet(session);
const ready = await readState(session);
await session.screenshot("heitou-feeding-ready-1366.png");

const foodCenter = await elementCenter(session, "#streetFeedFood");
const targetCenter = await elementCenter(session, "#streetFeedTarget");
await mouseDrag(session, foodCenter, { x: 24, y: 430 });
await new Promise((resolve) => setTimeout(resolve, 450));
const invalidDrop = await readState(session);

await mouseDrag(session, foodCenter, targetCenter);
await session.waitFor(
  "document.querySelector('#streetFeedAttempt').textContent === '1'",
);
await new Promise((resolve) => setTimeout(resolve, 650));
const firstDrag = await readState(session);
await session.screenshot("heitou-feeding-blocked-1366.png");

await session.evaluate(
  "document.querySelector('#streetFeedFood').getBoundingClientRect(); true",
);
await mouseDrag(session, foodCenter, targetCenter);
await session.waitFor(
  "document.querySelector('#streetFeedAttempt').textContent === '2'",
);
const secondDrag = await readState(session);
await session.screenshot("heitou-feeding-complete-1366.png");

await session.evaluate("document.querySelector('#streetFollowButton').click(); true");
await session.waitFor("location.hash === '#heitou/fish'");
const dragUnlockedChapter = await session.evaluate("location.hash");

await setViewport(session, 1366, 768, false);
await resetStreet(session);
await session.evaluate("document.querySelector('#streetFeedFood').click(); true");
const clickSelected = await readState(session);
await session.evaluate("document.querySelector('#streetFeedTarget').click(); true");
await session.waitFor(
  "document.querySelector('#streetFeedAttempt').textContent === '1'",
);
const firstClick = await readState(session);
await session.evaluate("document.querySelector('#streetFeedFood').click(); true");
await session.evaluate("document.querySelector('#streetFeedTarget').click(); true");
await session.waitFor(
  "document.querySelector('#streetFeedAttempt').textContent === '2'",
);
const secondClick = await readState(session);
await session.evaluate("document.querySelector('#streetFollowButton').click(); true");
await session.waitFor("location.hash === '#heitou/fish'");
const clickUnlockedChapter = await session.evaluate("location.hash");

await setViewport(session, 390, 844, true);
await resetStreet(session);
const mobileFood = await elementCenter(session, "#streetFeedFood");
const mobileTarget = await elementCenter(session, "#streetFeedTarget");
await session.evaluate(`(() => {
  window.__qaPointerEvents = [];
  ["pointerdown", "pointermove", "pointerup", "pointercancel"].forEach((type) => {
    document.addEventListener(type, (event) => {
      window.__qaPointerEvents.push({
        type,
        pointerType: event.pointerType,
        x: event.clientX,
        y: event.clientY,
        target: event.target.id || event.target.className,
      });
    }, true);
  });
})()`);
await touchDrag(session, mobileFood, mobileTarget);
await new Promise((resolve) => setTimeout(resolve, 250));
console.log(
  "touch-debug",
  JSON.stringify({
    mobileFood,
    mobileTarget,
    state: await readState(session),
    events: await session.evaluate("window.__qaPointerEvents"),
  }),
);
await session.waitFor(
  "document.querySelector('#streetFeedAttempt').textContent === '1'",
);
const mobileFirst = await readState(session);
await touchDrag(session, mobileFood, mobileTarget);
await session.waitFor(
  "document.querySelector('#streetFeedAttempt').textContent === '2'",
);
const mobileSecond = await readState(session);
await session.screenshot("heitou-feeding-complete-mobile-390.png");

const assertions = {
  startsLocked:
    ready.attempts === 0 &&
    ready.followDisabled &&
    ready.fishNavDisabled &&
    ready.wildDogTriggerCount === "0",
  invalidDropDoesNotCount:
    invalidDrop.attempts === 0 && invalidDrop.wildDogTriggerCount === "0",
  mouseDragFirstAttempt:
    firstDrag.attempts === 1 &&
    firstDrag.wildDogTriggerCount === "1" &&
    firstDrag.wildDogVisible === "visible" &&
    firstDrag.followDisabled,
  mouseDragUnlocks:
    secondDrag.attempts === 2 &&
    secondDrag.status === "它仍没能靠近食物" &&
    !secondDrag.followDisabled &&
    !secondDrag.fishNavDisabled &&
    secondDrag.wildDogTriggerCount === "1",
  dragEntersNextChapter: dragUnlockedChapter === "#heitou/fish",
  clickSelectionFeedback:
    clickSelected.foodPressed === "true" && clickSelected.targetArmed,
  clickAlternative:
    firstClick.attempts === 1 &&
    secondClick.attempts === 2 &&
    secondClick.status === "它仍没能靠近食物" &&
    secondClick.wildDogTriggerCount === "1" &&
    !secondClick.followDisabled,
  clickEntersNextChapter: clickUnlockedChapter === "#heitou/fish",
  touchPointerDrag:
    mobileFirst.attempts === 1 &&
    mobileSecond.attempts === 2 &&
    mobileSecond.wildDogTriggerCount === "1" &&
    !mobileSecond.followDisabled &&
    mobileSecond.documentOverflow <= 0,
  noBrowserErrors: session.errors().length === 0,
};

console.log(
  JSON.stringify(
    {
      assertions,
      ready,
      invalidDrop,
      firstDrag,
      secondDrag,
      clickSelected,
      firstClick,
      secondClick,
      mobileFirst,
      mobileSecond,
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
