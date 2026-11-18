import { writeFile } from "node:fs/promises";

const DEBUG_ORIGIN = "http://127.0.0.1:9334";
const PAGE_ORIGIN = "http://127.0.0.1:4173/";
const OUTPUT_DIR = new URL("../", import.meta.url);
const PROGRESS_POINTS = [0, 0.25, 0.5, 0.75, 1];

class CdpSession {
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
      if (message.error) {
        waiter.reject(new Error(message.error.message));
      } else {
        waiter.resolve(message.result);
      }
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
      await new Promise((resolve) => setTimeout(resolve, 35));
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

  async screenshotClip(name, clip) {
    const result = await this.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
      clip,
    });
    await writeFile(new URL(name, OUTPUT_DIR), result.data, "base64");
  }

  browserErrors() {
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
        if (event.method === "Log.entryAdded") {
          return event.params.entry.text;
        }
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
  return new CdpSession(socket);
}

async function openArchive(pageUrl, session) {
  await session.send("Page.navigate", { url: pageUrl });
  await session.waitFor(
    "document.readyState === 'complete' && Boolean(window.archiveExperience)",
  );
  await session.evaluate("document.fonts.ready.then(() => true)");
  await session.evaluate("document.querySelector('#enterButton').click(); true");
  await session.waitFor(
    "window.archiveExperience.state === window.ARCHIVE_STATES.CLOSED",
  );
  await session.evaluate(
    "document.querySelector('#archiveThreadButton').click(); true",
  );
  await session.waitFor(
    "window.archiveExperience.state === window.ARCHIVE_STATES.OPEN",
  );
  await session.evaluate(
    "document.querySelector('#archiveOpenButton').click(); true",
  );
  await session.waitFor(
    "window.archiveExperience.state === window.ARCHIVE_STATES.PAPER_SLIDING",
  );
}

async function readGeometry(session) {
  return session.evaluate(`(() => {
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const paper = document.querySelector("#archivePaperStack");
    const folder = document.querySelector("#archiveFolder");
    const back = document.querySelector("#archiveBagBack");
    const paperWindow = document.querySelector("#archivePaperWindow");
    const contact = document.querySelector("#archiveContactShadow");
    const paperRect = paper.getBoundingClientRect();
    const folderRect = folder.getBoundingClientRect();
    const overlapWidth = Math.max(
      0,
      Math.min(paperRect.right, folderRect.right) -
        Math.max(paperRect.left, folderRect.left),
    );
    const matrix = new DOMMatrixReadOnly(getComputedStyle(paper).transform);
    return {
      state: window.archiveExperience.state,
      stage: document.querySelector("#archiveModal").dataset
        .archiveImplementationStage,
      readingClass: document
        .querySelector("#archiveCanvas")
        .classList.contains("archive-paper-reading"),
      paper: box(paper),
      folder: box(folder),
      back: box(back),
      paperWindow: box(paperWindow),
      overlapRatio: paperRect.width ? overlapWidth / paperRect.width : 0,
      exposedPastMouth: paperRect.right - folderRect.right,
      paperTransform: getComputedStyle(paper).transform,
      paperClipPath: getComputedStyle(paper).clipPath,
      paperRotation: Math.atan2(matrix.b, matrix.a) * (180 / Math.PI),
      paperScaleX: Math.hypot(matrix.a, matrix.b),
      paperScaleY: Math.hypot(matrix.c, matrix.d),
      layerOrder: {
        back: getComputedStyle(back).zIndex,
        paperWindow: getComputedStyle(paperWindow).zIndex,
        front: getComputedStyle(folder).zIndex,
      },
      openFlapParent: document.querySelector("#archiveFlapOpen").parentElement.id,
      contact: {
        ...box(contact),
        opacity: Number(getComputedStyle(contact).opacity),
      },
      hint: document.querySelector("#archiveHint").textContent,
      viewport: { width: innerWidth, height: innerHeight },
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
await session.send("Emulation.setDeviceMetricsOverride", {
  width: 1366,
  height: 768,
  deviceScaleFactor: 1,
  mobile: false,
  screenWidth: 1366,
  screenHeight: 768,
});
await session.send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});

const progressResults = [];
for (const progress of PROGRESS_POINTS) {
  const isCompleteRun = progress === 1;
  const query = isCompleteRun ? "" : `?paperProgress=${progress}`;
  await openArchive(`${PAGE_ORIGIN}${query}`, session);
  if (isCompleteRun) {
    await session.waitFor(
      "window.archiveExperience.state === window.ARCHIVE_STATES.COMPLETE",
    );
  } else {
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  const screenshotName = `archive-extraction-fixed-${Math.round(
    progress * 100,
  )}.png`;
  await session.screenshot(screenshotName);
  if (progress === 0.5) {
    await session.screenshotClip("archive-extraction-fixed-mouth-zoom.png", {
      x: 590,
      y: 185,
      width: 185,
      height: 410,
      scale: 2,
    });
  }
  progressResults.push({
    progress: Math.round(progress * 100),
    screenshot: screenshotName,
    geometry: await readGeometry(session),
  });
}

await openArchive(PAGE_ORIGIN, session);
await session.waitFor(
  "window.archiveExperience.state === window.ARCHIVE_STATES.COMPLETE",
);
const firstRunFolder = (await readGeometry(session)).folder;
await session.evaluate(
  "document.querySelector('#archiveReplayButton').click(); true",
);
await session.waitFor(
  "window.archiveExperience.state === window.ARCHIVE_STATES.CLOSED",
);
await session.evaluate(
  "document.querySelector('#archiveThreadButton').click(); true",
);
await session.waitFor(
  "window.archiveExperience.state === window.ARCHIVE_STATES.OPEN",
);
await session.evaluate(
  "document.querySelector('#archiveOpenButton').click(); true",
);
await session.waitFor(
  "window.archiveExperience.state === window.ARCHIVE_STATES.COMPLETE",
);
const secondRunGeometry = await readGeometry(session);

await session.send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});
await openArchive(`${PAGE_ORIGIN}?paperProgress=0.5`, session);
await new Promise((resolve) => setTimeout(resolve, 80));
const mobileMidpoint = await readGeometry(session);
await session.screenshot("archive-extraction-fixed-mobile-50.png");
await openArchive(PAGE_ORIGIN, session);
await session.waitFor(
  "window.archiveExperience.state === window.ARCHIVE_STATES.COMPLETE",
);
const mobileComplete = await readGeometry(session);
await session.screenshot("archive-extraction-fixed-mobile-100.png");

const initial = progressResults[0].geometry;
const midpoint = progressResults[2].geometry;
const final = progressResults[4].geometry;
const extractionFrames = progressResults.slice(0, 4);
const strictlyIncreasing = extractionFrames.every((point, index, list) => {
  if (index === 0) return true;
  return point.geometry.paper.left > list[index - 1].geometry.paper.left;
});
const finalCenterX = (final.paper.left + final.paper.right) / 2;
const mobileFinalCenterX =
  (mobileComplete.paper.left + mobileComplete.paper.right) / 2;
const assertions = {
  logicalLayerOrder:
    Number(initial.layerOrder.back) <
      Number(initial.layerOrder.paperWindow) &&
    Number(initial.layerOrder.paperWindow) < Number(initial.layerOrder.front),
  openFlapBehindPaper: initial.openFlapParent === "archiveBagBack",
  noMovingPaperClip: initial.paperClipPath === "none",
  startsMostlyInside:
    initial.overlapRatio >= 0.9 && initial.exposedPastMouth > 0,
  quarterStillInserted:
    progressResults[1].geometry.overlapRatio >= 0.55 &&
    progressResults[1].geometry.exposedPastMouth > initial.exposedPastMouth,
  halfwayContinuous:
    midpoint.overlapRatio > 0.25 &&
    midpoint.overlapRatio < 0.65 &&
    midpoint.paper.width > 0,
  mostlyExtracted:
    progressResults[3].geometry.overlapRatio < 0.35 &&
    progressResults[3].geometry.overlapRatio > 0,
  extractionCompleted:
    progressResults[3].geometry.overlapRatio < 0.1 &&
    progressResults[3].geometry.paper.right >
      progressResults[3].geometry.folder.right,
  readingPlacement:
    final.state === "COMPLETE" &&
    final.readingClass &&
    final.layerOrder.paperWindow === "30" &&
    Math.abs(finalCenterX - final.viewport.width / 2) < 1 &&
    final.paper.width >
      progressResults[3].geometry.paper.width * 1.5 &&
    final.paper.left >= 0 &&
    final.paper.right <= final.viewport.width &&
    final.paper.top >= 0 &&
    final.paper.bottom <= final.viewport.height,
  uprightPaper:
    final.paperRotation === 0 &&
    final.paperScaleX > 0 &&
    final.paperScaleY > 0,
  contactShadowFades:
    initial.contact.opacity > midpoint.contact.opacity &&
    midpoint.contact.opacity > final.contact.opacity &&
    final.contact.opacity === 0,
  monotonicTrajectory: strictlyIncreasing,
  frontLayerStable:
    progressResults.every(
      (point) =>
        Math.abs(point.geometry.folder.left - initial.folder.left) < 0.5 &&
        Math.abs(point.geometry.folder.top - initial.folder.top) < 0.5 &&
        Math.abs(point.geometry.folder.width - initial.folder.width) < 0.5,
    ),
  replayStable:
    secondRunGeometry.state === "COMPLETE" &&
    Math.abs(secondRunGeometry.folder.left - firstRunFolder.left) < 0.5,
  mobileExtraction:
    mobileMidpoint.state === "PAPER_SLIDING" &&
    mobileComplete.state === "COMPLETE" &&
    mobileComplete.readingClass &&
    mobileComplete.layerOrder.paperWindow === "30" &&
    Math.abs(mobileFinalCenterX - mobileComplete.viewport.width / 2) < 1 &&
    mobileComplete.paper.width > mobileMidpoint.paper.width * 1.15 &&
    mobileComplete.paper.left >= 0 &&
    mobileComplete.paper.right <= mobileComplete.viewport.width &&
    mobileComplete.paper.top >= 0 &&
    mobileComplete.paper.bottom <= mobileComplete.viewport.height,
  noBrowserErrors: session.browserErrors().length === 0,
};

console.log(
  JSON.stringify(
    {
      assertions,
      progressResults,
      replay: secondRunGeometry,
      mobile: {
        midpoint: mobileMidpoint,
        complete: mobileComplete,
      },
      browserErrors: session.browserErrors(),
    },
    null,
    2,
  ),
);

if (Object.values(assertions).some((value) => !value)) {
  process.exitCode = 1;
}

session.socket.close();
