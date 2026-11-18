const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const AUDIO_ROOT = path.join(
  ROOT,
  "public",
  "assets",
  "forty-eight",
  "tianjin-lyrics",
  "audio",
);
const REPORT = path.join(ROOT, "output", "qa-tianjin-lyrics-audio.json");
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const LINES = [
  "天津药糖家家好",
  "四十八样数第一",
  "一色一味块块香",
  "再饶半块随您意",
  "俞家能耐不传女",
  "谁我儿子谁学艺",
];
const LINE_FILES = [
  "tianjin-line-01.mp3",
  "tianjin-line-02.mp3",
  "tianjin-line-03.mp3",
  "tianjin-line-04.mp3",
  "tianjin-line-05.mp3",
  "tianjin-line-06.mp3",
];
const CUE_FILES = ["crowd-laugh.mp3", "crowd-cheer.mp3"];

function findBrowser() {
  return BROWSERS.find((candidate) => fs.existsSync(candidate));
}

function audioInventory() {
  return [...LINE_FILES, ...CUE_FILES, "street-ambience.mp3"].map((name) => {
    const file = path.join(AUDIO_ROOT, name);
    return {
      name,
      exists: fs.existsSync(file),
      bytes: fs.existsSync(file) ? fs.statSync(file).size : 0,
    };
  });
}

async function openChapter(page) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter6`, {
    waitUntil: "networkidle",
  });
  await page
    .locator("#sishiOriginal-chapter6")
    .getByRole("button", { name: "进入本段互动" })
    .click();
  await page.waitForFunction(
    () => window.wordLyricsController?.getSnapshot,
  );
  await page.waitForTimeout(180);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const stage = document.querySelector("#wordStage");
    const walker = document.querySelector("#wordWalker");
    const bob = document.querySelector(".word-walker__bob");
    const pompom = document.querySelector(".word-walker__pompom");
    const items = [...document.querySelectorAll("[data-word-line]")];
    return {
      controller: window.wordLyricsController.getSnapshot(),
      lines: items.map((item) => ({
        text: item.querySelector(".word-line-text")?.textContent || "",
        locked: item.classList.contains("is-locked"),
        current: item.classList.contains("is-current"),
        completed: item.classList.contains("is-completed"),
        revealed: item.classList.contains("is-revealed"),
        disabled: item.querySelector("button")?.disabled,
        state: item.querySelector(".word-line-state")?.textContent.trim(),
      })),
      progress: document
        .querySelector("#wordProgress")
        .getAttribute("aria-valuenow"),
      nextLabel: document.querySelector("#wordNextLabel").textContent.trim(),
      nextDisabled: document.querySelector("#wordNext").disabled,
      pauseDisabled: document.querySelector("#wordPause").disabled,
      status: document.querySelector("#wordAudioStatus").textContent.trim(),
      completeVisible: !document.querySelector("#wordComplete").hidden,
      completeHeadline: document
        .querySelector("#wordComplete h3")
        .textContent.trim(),
      continueVisible:
        document.querySelector("#wordContinueStory").getBoundingClientRect()
          .width > 0,
      walker: {
        left: walker.style.getPropertyValue("--word-left"),
        bottom: walker.style.getPropertyValue("--word-bottom"),
        className: walker.className,
        bobAnimation: getComputedStyle(bob).animationName,
        pompomAnimation: getComputedStyle(pompom).animationName,
      },
      stage: {
        className: stage.className,
        step: stage.dataset.wordStep,
        parity: stage.dataset.stepParity,
        voiceState: stage.dataset.voiceState,
        swayDuration: stage.style.getPropertyValue("--word-sway-duration"),
      },
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

async function waitForPlaying(page) {
  await page.waitForFunction(
    () => window.wordLyricsController.getSnapshot().playbackState === "playing",
  );
}

async function waitForLineComplete(page, index) {
  await page.waitForFunction(
    ([lineIndex, unlocked]) => {
      const state = window.wordLyricsController.getSnapshot();
      return (
        state.playbackState === "idle" &&
        state.completed.includes(lineIndex) &&
        state.unlockedCount >= unlocked
      );
    },
    [index, Math.min(6, index + 2)],
    { timeout: 15000 },
  );
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  const audioRequests = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("request", (request) => {
    if (request.url().includes("/tianjin-lyrics/audio/")) {
      audioRequests.push(decodeURIComponent(request.url().split("/").at(-1)));
    }
  });

  await openChapter(page);
  const initial = await snapshot(page);
  const noAutoplay = audioRequests.length === 0;

  await page.locator("[data-word-line-play]").first().click();
  await waitForPlaying(page);
  await page.waitForTimeout(280);
  const lineOnePlaying = await snapshot(page);
  await page.locator("#wordStage").screenshot({
    path: path.join(ROOT, "tianjin-lyrics-audio-playing.png"),
  });

  await page.locator("#wordPause").click();
  await page.waitForFunction(
    () => window.wordLyricsController.getSnapshot().playbackState === "paused",
  );
  const paused = await snapshot(page);
  const pausedAt = paused.controller.audio.currentTime;
  await page.waitForTimeout(360);
  const pausedLater = await snapshot(page);
  const pauseHolds = Math.abs(pausedLater.controller.audio.currentTime - pausedAt) <
    0.08;

  await page.locator("#wordNext").click();
  await waitForPlaying(page);
  await page.waitForTimeout(260);
  const resumed = await snapshot(page);
  const resumeAdvances =
    resumed.controller.audio.currentTime > pausedLater.controller.audio.currentTime;
  await waitForLineComplete(page, 0);
  const lineOneComplete = await snapshot(page);

  await page.locator("[data-word-line-play]").nth(1).click();
  await waitForPlaying(page);
  await page.waitForTimeout(180);
  await page.locator("[data-word-line-play]").first().click();
  await waitForPlaying(page);
  await page.waitForTimeout(120);
  const switched = await snapshot(page);
  await waitForLineComplete(page, 0);

  const lineObservations = [];
  for (let index = 1; index < LINES.length; index += 1) {
    await page.locator("[data-word-line-play]").nth(index).click();
    await waitForPlaying(page);
    await page.waitForTimeout(260);
    const during = await snapshot(page);
    await waitForLineComplete(page, index);
    const after = await snapshot(page);
    lineObservations.push({ index, during, after });
  }

  await page.waitForFunction(
    () => {
      const state = window.wordLyricsController.getSnapshot();
      return state.feedbackTriggered && state.audio.cueName === "laugh";
    },
    null,
    { timeout: 15000 },
  );
  const laughing = await snapshot(page);
  await page.waitForFunction(
    () => window.wordLyricsController.getSnapshot().audio.cueName === "cheer",
    null,
    { timeout: 20000 },
  );
  const cheering = await snapshot(page);
  await page.locator("#wordComplete").scrollIntoViewIfNeeded();
  await page.waitForTimeout(180);
  await page.locator("#wordComplete").screenshot({
    path: path.join(ROOT, "tianjin-lyrics-audio-complete.png"),
  });
  const cueCountBeforeReplay = audioRequests.filter((name) =>
    CUE_FILES.includes(name),
  ).length;

  await page.locator("[data-word-line-play]").first().click();
  await waitForPlaying(page);
  await waitForLineComplete(page, 0);
  await page.waitForTimeout(300);
  const cueCountAfterReplay = audioRequests.filter((name) =>
    CUE_FILES.includes(name),
  ).length;

  await page.locator("[data-word-line-play]").nth(1).click();
  await waitForPlaying(page);
  await page.locator(
    '#sishiChapterNav [data-sishi-page="chapter5"]',
  ).click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter5",
  );
  const afterLeave = await page.evaluate(() => ({
    page: document.body.dataset.sishiPage,
    state: window.wordLyricsController.getSnapshot(),
  }));
  await page.locator(
    '#sishiChapterNav [data-sishi-page="chapter6"]',
  ).click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter6",
  );
  await page.locator("#wordContinueStory").click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter7",
  );
  const continued = await page.evaluate(() => ({
    page: document.body.dataset.sishiPage,
    hash: location.hash,
  }));
  await context.close();

  return {
    initial,
    noAutoplay,
    lineOnePlaying,
    paused,
    pauseHolds,
    resumed,
    resumeAdvances,
    lineOneComplete,
    switched,
    lineObservations,
    laughing,
    cheering,
    cueCountBeforeReplay,
    cueCountAfterReplay,
    afterLeave,
    continued,
    audioRequests,
    errors,
  };
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  await openChapter(page);
  await page.locator("[data-word-line-play]").first().tap();
  await waitForPlaying(page);
  await page.waitForTimeout(240);
  const playing = await snapshot(page);
  await page.locator("#wordPause").tap();
  await page.waitForFunction(
    () => window.wordLyricsController.getSnapshot().playbackState === "paused",
  );
  const paused = await snapshot(page);
  await page.locator("#wordMute").tap();
  const muted = await snapshot(page);
  await page.locator("#wordMute").tap();
  await page.locator("#wordVolume").evaluate((input) => {
    input.value = "0.55";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.screenshot({
    path: path.join(ROOT, "tianjin-lyrics-audio-mobile.png"),
  });
  const volume = await snapshot(page);
  await context.close();
  return { playing, paused, muted, volume, errors };
}

async function runMissingAudioFallback(browser) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  await page.route("**/tianjin-line-01.mp3", (route) => route.abort());
  await openChapter(page);
  await page.locator("[data-word-line-play]").first().click();
  await page.waitForFunction(
    () => window.wordLyricsController.getSnapshot().playbackState === "error",
  );
  const missing = await snapshot(page);
  await page.locator("#wordNext").click();
  await page.waitForFunction(() => {
    const state = window.wordLyricsController.getSnapshot();
    return state.completed.includes(0) && state.textFallback.includes(0);
  });
  const fallback = await snapshot(page);
  await context.close();
  return { missing, fallback, errors };
}

async function runFileMode(browser) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  const errors = [];
  const requestFailures = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on(
    "requestfailed",
    (request) => requestFailures.push(request.url()),
  );
  const url = `${pathToFileURL(
    path.join(ROOT, "web", "si-shi-ba-yang", "index.html"),
  ).href}#sishi/chapter6`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.wordLyricsController?.getSnapshot);
  await page
    .locator("#sishiOriginal-chapter6")
    .getByRole("button", { name: "进入本段互动" })
    .click();
  await page.locator("[data-word-line-play]").first().click();
  await waitForPlaying(page);
  await page.waitForTimeout(300);
  const playback = await snapshot(page);
  await context.close();
  return { playback, errors, requestFailures };
}

function buildChecks(result, inventory) {
  const lineSourcesCorrect = result.lineObservations.every(
    (entry) =>
      entry.during.controller.audio.currentSource.endsWith(
        LINE_FILES[entry.index],
      ),
  ) && result.lineOnePlaying.controller.audio.currentSource.endsWith(
    LINE_FILES[0],
  );
  const lineCopyCorrect = result.initial.lines.every(
    (line, index) => line.text === LINES[index],
  );
  const lockedInitially =
    result.initial.lines[0].disabled === false &&
    result.initial.lines.slice(1).every((line) => line.disabled);
  const animationSync =
    result.lineOnePlaying.stage.className.includes("is-voice-playing") &&
    result.lineOnePlaying.stage.parity === "odd" &&
    result.lineOnePlaying.walker.bobAnimation !== "none" &&
    result.lineOnePlaying.walker.pompomAnimation !== "none" &&
    result.lineObservations.every(
      (entry) =>
        entry.during.walker.bobAnimation !== "none" &&
        entry.during.stage.className.includes("is-voice-playing") &&
        entry.after.stage.className.includes("is-voice-playing") === false,
    );
  const stepsAdvance = result.lineObservations.every(
    (entry) =>
      entry.during.stage.step === String(entry.index + 1) &&
      entry.during.lines[entry.index].current,
  );
  const durationDriven = result.lineObservations.every(
    (entry) => entry.during.stage.swayDuration.endsWith("s"),
  );
  const alternatesFeet = result.lineObservations.every(
    (entry) =>
      entry.during.stage.parity ===
      (entry.index % 2 === 0 ? "odd" : "even"),
  );
  const unlockFlow =
    result.lineOneComplete.controller.unlockedCount === 2 &&
    result.lineOneComplete.lines[1].disabled === false &&
    result.lineOneComplete.lines[2].disabled === true &&
    result.lineObservations.every(
      (entry) =>
        entry.after.controller.unlockedCount >=
        Math.min(6, entry.index + 2),
    );
  const switchNoOverlap =
    result.switched.controller.activeIndex === 0 &&
    result.switched.controller.audio.currentSource.endsWith(LINE_FILES[0]) &&
    result.switched.controller.audio.playingAudioCount <= 1;
  const completionOnce =
    result.cueCountAfterReplay === result.cueCountBeforeReplay &&
    result.laughing.controller.feedbackTriggered &&
    result.cheering.controller.feedbackTriggered;
  const leaveStops =
    result.afterLeave.page === "chapter5" &&
    result.afterLeave.state.audio.playingAudioCount === 0 &&
    result.afterLeave.state.activeIndex === null;
  const mobileTouch =
    result.mobile.playing.controller.playbackState === "playing" &&
    result.mobile.paused.controller.playbackState === "paused" &&
    result.mobile.muted.controller.audio.muted === true &&
    Math.abs(result.mobile.volume.controller.audio.volume - 0.55) < 0.001 &&
    result.mobile.playing.overflow <= 0 &&
    result.mobile.volume.overflow <= 0;
  const missingFallback =
    result.missing.missing.status.includes("录音缺失") &&
    result.missing.fallback.controller.completed.includes(0) &&
    result.missing.fallback.controller.textFallback.includes(0) &&
    result.missing.fallback.lines[1].disabled === false;

  return {
    allAssetsExist: inventory.every((asset) => asset.exists && asset.bytes > 0),
    noAutoplay: result.noAutoplay,
    lineCopyCorrect,
    lockedInitially,
    lineSourcesCorrect,
    lineOnePlaysAndHighlights:
      result.lineOnePlaying.controller.activeIndex === 0 &&
      result.lineOnePlaying.controller.audio.state === "playing" &&
      result.lineOnePlaying.lines[0].current,
    animationSync,
    durationDriven,
    stepsAdvance,
    alternatesFeet,
    pauseHolds: result.pauseHolds,
    resumeAdvances: result.resumeAdvances,
    unlockFlow,
    switchNoOverlap,
    completionTriggered:
      result.cheering.completeVisible &&
      result.cheering.completeHeadline === "六句词已念完" &&
      result.cheering.continueVisible,
    crowdAudioOrder:
      result.audioRequests.join("|").includes(
        "crowd-laugh.mp3|crowd-cheer.mp3",
      ),
    completionOnce,
    leaveStops,
    continueOpensStory:
      result.continued.page === "chapter7" &&
      result.continued.hash === "#sishi/chapter7",
    fileModePlayback:
      result.fileMode.playback.controller.playbackState === "playing" &&
      result.fileMode.playback.controller.audio.currentSource.endsWith(
        LINE_FILES[0],
      ) &&
      result.fileMode.requestFailures.length === 0,
    mobileTouch,
    missingAudioFallback: missingFallback,
    noBrowserErrors:
      result.errors.length === 0 &&
      result.mobile.errors.length === 0 &&
      result.missing.errors.length === 0 &&
      result.fileMode.errors.length === 0,
  };
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge or Chrome found.");
  const inventory = audioInventory();
  const browser = await chromium.launch({ executablePath, headless: true });
  const desktop = await runDesktop(browser);
  const mobile = await runMobile(browser);
  const missing = await runMissingAudioFallback(browser);
  const fileMode = await runFileMode(browser);
  await browser.close();
  const combined = { ...desktop, mobile, missing, fileMode };
  const checks = buildChecks(combined, inventory);
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  const report = {
    passed: failed.length === 0,
    generatedAt: new Date().toISOString(),
    checkCount: Object.keys(checks).length,
    failed,
    checks,
    inventory,
    desktop,
    mobile,
    missingFallback: missing,
    fileMode,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        checkCount: report.checkCount,
        failed,
        inventory,
        report: REPORT,
      },
      null,
      2,
    ),
  );
  if (!report.passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
