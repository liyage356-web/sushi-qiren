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

  async waitFor(expression, timeout = 8000) {
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

async function resetFish(session) {
  resetFish.revision = (resetFish.revision || 0) + 1;
  await session.send("Page.navigate", {
    url: `${PAGE_ORIGIN}?qa=${resetFish.revision}#heitou/fish`,
  });
  await session.waitFor(
    "document.readyState === 'complete' && document.querySelector('#heiTouExperience').hidden === false",
  );
  await session.evaluate("document.fonts.ready.then(() => true)");
  await session.evaluate(`(() => {
    window.__fishDogStates = [];
    const canvas = document.querySelector("#fishCanvas");
    new MutationObserver(() => {
      window.__fishDogStates.push(canvas.dataset.dogState);
    }).observe(canvas, { attributes: true, attributeFilter: ["data-dog-state"] });
    return true;
  })()`);
}

async function elementCenter(session, selector) {
  return session.evaluate(`(() => {
    const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
}

async function pressAndMove(session, from, to, steps = 8) {
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
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await session.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
      button: "left",
      buttons: 1,
    });
  }
}

async function release(session, point) {
  await session.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
}

async function mouseDrag(session, from, to) {
  await pressAndMove(session, from, to);
  await release(session, to);
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
  await release(session, point);
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
  return session.evaluate(`(() => {
    const canvas = document.querySelector("#fishCanvas");
    const fishImage = document.querySelector("#fishTarget img");
    return {
      count: Number(canvas.dataset.feedCount),
      countLabel: document.querySelector("#fishStepCount").textContent.trim(),
      feeding: canvas.dataset.feeding,
      dogState: canvas.dataset.dogState,
      dogLabel: document.querySelector("#fishDogState").textContent.trim(),
      response: document.querySelector("#fishResponse").textContent.trim(),
      prompt: document.querySelector("#fishPrompt").textContent.trim(),
      disabled: document.querySelector("#fishTarget").disabled,
      visibleFishWidth: fishImage.getBoundingClientRect().width,
      fishX: Number(gsap.getProperty("#fishTarget", "x")),
      fishY: Number(gsap.getProperty("#fishTarget", "y")),
      snapVisible: document.querySelector("#fishDropTarget").classList.contains("is-near"),
      states: [...window.__fishDogStates],
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
await session.send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});

await setViewport(session, 1366, 768, false);
await resetFish(session);
const initial = await readState(session);
await session.screenshot("heitou-chapter2-feeding-ready-1366.png");

let fishCenter = await elementCenter(session, "#fishTarget");
const dropCenter = await elementCenter(session, "#fishDropTarget");
await mouseDrag(session, fishCenter, { x: 24, y: 300 });
await session.waitFor(
  "document.querySelector('#fishCanvas').dataset.dragging === 'false'",
);
await new Promise((resolve) => setTimeout(resolve, 480));
const missed = await readState(session);

fishCenter = await elementCenter(session, "#fishTarget");
await pressAndMove(session, fishCenter, dropCenter);
await session.waitFor(
  "document.querySelector('#fishDropTarget').classList.contains('is-near')",
);
const snapped = await readState(session);
await session.screenshot("heitou-chapter2-feeding-snap-1366.png");
await release(session, dropCenter);
await session.waitFor(
  "document.querySelector('#fishCanvas').dataset.attemptPhase === 'eating'",
);
const firstEating = await readState(session);
await session.screenshot("heitou-chapter2-feeding-eating-1366.png");
await session.waitFor(
  "window.__fishDogStates.includes('wagging')",
);
await session.screenshot("heitou-chapter2-feeding-wagging-1366.png");
await session.waitFor(
  "document.querySelector('#fishCanvas').dataset.feedCount === '1'",
);
const firstDone = await readState(session);

await session.waitFor(
  "Math.abs(Number(gsap.getProperty('#fishTarget', 'x'))) < 1",
);
await mouseClick(session, await elementCenter(session, "#fishTarget"));
await session.waitFor(
  "document.querySelector('#fishCanvas').dataset.feedCount === '2'",
);
const secondDone = await readState(session);
await session.waitFor(
  "Math.abs(Number(gsap.getProperty('#fishTarget', 'x'))) < 1",
);
await mouseClick(session, await elementCenter(session, "#fishTarget"));
await session.waitFor(
  "document.querySelector('#fishCanvas').dataset.feedCount === '3'",
);
const thirdDone = await readState(session);
await session.screenshot("heitou-chapter2-feeding-complete-1366.png");

await session.evaluate(`(() => {
  const fish = document.querySelector("#fishTarget");
  for (let index = 0; index < 5; index += 1) fish.click();
  return true;
})()`);
await new Promise((resolve) => setTimeout(resolve, 2400));
const afterSpam = await readState(session);

await setViewport(session, 390, 844, true);
await resetFish(session);
const mobileInitial = await readState(session);
await session.screenshot("heitou-chapter2-feeding-ready-mobile-390.png");
const mobileFish = await elementCenter(session, "#fishTarget");
const mobileDrop = await elementCenter(session, "#fishDropTarget");
await touchDrag(session, mobileFish, mobileDrop);
await session.waitFor(
  "document.querySelector('#fishCanvas').dataset.feedCount === '1'",
);
const mobileDone = await readState(session);
await session.screenshot("heitou-chapter2-feeding-mobile-390.png");

const assertions = {
  startsAtZero:
    initial.count === 0 &&
    initial.countLabel === "0 / 3" &&
    !initial.disabled &&
    initial.dogState === "wary",
  fishMatchesHandScale:
    initial.visibleFishWidth >= 42 && initial.visibleFishWidth <= 90,
  releaseOutsideResets:
    missed.count === 0 &&
    Math.abs(missed.fishX) < 1 &&
    Math.abs(missed.fishY) < 1 &&
    missed.prompt.includes("回到摊上"),
  dragSnapsAtMouth: snapped.snapVisible && snapped.count === 0,
  firstSequenceIncludesRetreatAndBite:
    firstEating.dogState === "eating" &&
    firstEating.states.includes("retreat") &&
    firstEating.response ===
      "黑头先退半步，喉咙里低低一响；见商大爷不动，才低头咬了几口。",
  threeDistinctFeeds:
    firstDone.count === 1 &&
    secondDone.count === 2 &&
    thirdDone.count === 3 &&
    new Set([firstDone.response, secondDone.response, thirdDone.response]).size === 3 &&
    thirdDone.response ===
      "第三次，黑头吃净鱼头，抬起脸望着商大爷，尾巴一下一下摇起来。" &&
    thirdDone.states.includes("wagging"),
  completionLocks:
    thirdDone.disabled &&
    thirdDone.dogState === "familiar" &&
    thirdDone.countLabel === "3 / 3" &&
    afterSpam.count === 3 &&
    afterSpam.dogState === "familiar" &&
    afterSpam.states.filter((state) => state === "wagging").length === 3 &&
    afterSpam.response === thirdDone.response,
  mobileTouchFeeds:
    mobileInitial.count === 0 &&
    mobileDone.count === 1 &&
    mobileDone.documentOverflow <= 0,
  noBrowserErrors: session.errors().length === 0,
};

console.log(
  JSON.stringify(
    {
      assertions,
      initial,
      missed,
      snapped,
      firstEating,
      firstDone,
      secondDone,
      thirdDone,
      afterSpam,
      mobileInitial,
      mobileDone,
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
