const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173";
const REPORT = path.join(ROOT, "output", "qa-heitou-courtyard.json");
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];
const expectedSources = {
  follow: "/images/hei-tou/follow/shang-home-gate.png",
  acceptedOpen: "/images/hei-tou/yard/shang-opens-gate.png",
  acceptedWelcome: "/images/hei-tou/yard/shang-welcomes-hei-tou.png",
  guard: "/images/hei-tou/courtyard/scene-guard.png",
  accident: "/images/hei-tou/courtyard/scene-accident.png",
  conflict: "/images/hei-tou/courtyard/scene-conflict.png",
  leave: "/images/hei-tou/courtyard/scene-departure.png",
};
const expectedEventSources = {
  ribbon: "/images/hei-tou/courtyard/red-ribbon.png",
  smoke: "/images/hei-tou/courtyard/ink-smoke.png",
  rush: "/images/hei-tou/courtyard/heitou-rush.png",
  audio: "/audio/hei-tou/firecracker.mp3",
};

function findBrowser() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

async function snapshot(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("#yardCanvas");
    const stack = document.querySelector("#yardSceneStack");
    const layers = [...document.querySelectorAll(".yard-scene-image")].map(
      (layer) => {
        const rect = layer.getBoundingClientRect();
        const style = getComputedStyle(layer);
        return {
          source: layer.src
            ? decodeURIComponent(new URL(layer.src).pathname)
            : "",
          current: layer.classList.contains("is-current"),
          departing: layer.classList.contains("is-departing"),
          opacity: Number(style.opacity),
          objectFit: style.objectFit,
          objectPosition: style.objectPosition,
          naturalWidth: layer.naturalWidth,
          naturalHeight: layer.naturalHeight,
          rect: {
            width: rect.width,
            height: rect.height,
          },
        };
      },
    );
    const canvasRect = canvas.getBoundingClientRect();
    const navigationRect = document
      .querySelector(".story-step-nav")
      ?.getBoundingClientRect();
    const current = layers.find((layer) => layer.current);
    const stateButtons = [...document.querySelectorAll(".yard-state-button")];
    const ribbon = document.querySelector("#yardRibbonHotspot");
    const ribbonRect = ribbon.getBoundingClientRect();
    const ribbonPrompt = document.querySelector("#yardRibbonPrompt");
    const gazeHotspot = document.querySelector("#yardGazeHotspot");
    const gazeContinueButton = document.querySelector(
      "#yardGazeContinueButton",
    );
    const closeupLayer = document.querySelector("#yardCloseupLayer");
    const closeupImage = document.querySelector("#yardCloseupImage");
    const closeupCopy = document.querySelector("#yardCloseupCopy");
    const finishButton = document.querySelector("#yardGazeFinishButton");
    const departureEnding = document.querySelector("#yardDepartureEnding");
    const departureContinue = document.querySelector(
      "#yardDepartureContinue",
    );
    const departureRestart = document.querySelector(
      "#yardDepartureRestart",
    );
    const gazeHotspotRect = gazeHotspot.getBoundingClientRect();
    const expectedGazeParagraph =
      window.HEI_TOU_STORY?.canonicalText?.find(
        (paragraph) => paragraph.paragraphId === "hei-tou-p19",
      );
    return {
      route: location.hash,
      activePanel: document.querySelector(
        "[data-story-page-panel]:not([hidden])",
      )?.dataset.storyPagePanel,
      state: canvas.dataset.yardState,
      phase: canvas.dataset.yardPhase,
      transitionClass: canvas.classList.contains("is-transitioning"),
      currentSource: current?.source || "",
      stackLabel: stack.getAttribute("aria-label"),
      caption: document.querySelector("#yardCaption")?.textContent.trim(),
      door: document.querySelector("#yardDoorStatus")?.textContent.trim(),
      pressedState: stateButtons.find(
        (button) => button.getAttribute("aria-pressed") === "true",
      )?.dataset.yardState,
      stateButtonStates: stateButtons.map(
        (button) => button.dataset.yardState,
      ),
      stateButtonLabels: stateButtons.map((button) =>
        button.textContent.trim(),
      ),
      layers,
      canvas: {
        width: canvasRect.width,
        height: canvasRect.height,
        top: canvasRect.top,
        bottom: canvasRect.bottom,
        ratio: canvasRect.height ? canvasRect.width / canvasRect.height : 0,
      },
      navigationBottom: navigationRect?.bottom || 0,
      legacySceneElementCount: document.querySelectorAll(
        ".yard-wall, .yard-gate, .yard-character, .yard-ground, .yard-sky",
      ).length,
      rightPanelVisible:
        document.querySelector(".story-page-layout > .story-copy")
          ?.getBoundingClientRect().width > 0,
      stateButtonsVisible: stateButtons.every(
        (button) => button.getBoundingClientRect().width > 0,
      ),
      toolbarButtonsVisible: [
        ...document.querySelectorAll(".story-toolbar button"),
      ].every((button) => button.getBoundingClientRect().width > 0),
      navigationVisible:
        document.querySelector(".story-step-nav")?.getBoundingClientRect()
          .width > 0,
      storyActionLabels: [
        ...document.querySelectorAll(
          "#storyPageCourtyard .story-actions .story-action",
        ),
      ].map((button) => button.textContent.trim()),
      eventState: canvas.dataset.yardEventState,
      triggerCount: Number(canvas.dataset.yardTriggerCount || 0),
      audioState: canvas.dataset.audioState || "idle",
      soundToggle: document.querySelector("#storySoundToggle")?.textContent.trim(),
      eventStatus:
        document.querySelector("#yardEventStatus")?.textContent.trim() || "",
      motionOff: document
        .querySelector("#heiTouExperience")
        ?.classList.contains("motion-off"),
      sceneFilter: getComputedStyle(stack).filter,
      emotionState: canvas.dataset.emotionState,
      audioFadeState: canvas.dataset.audioFadeState,
      gaze: {
        hotspotHidden: gazeHotspot.hidden,
        hotspotWidth: gazeHotspotRect.width,
        hotspotHeight: gazeHotspotRect.height,
        prompt: document.querySelector("#yardGazePrompt")?.textContent.trim(),
        continueHidden: gazeContinueButton.hidden,
        continueWidth: gazeContinueButton.getBoundingClientRect().width,
        closeupHidden: closeupLayer.hidden,
        closeupVisible:
          closeupLayer.classList.contains("is-visible"),
        imageLoaded:
          closeupImage.complete && closeupImage.naturalWidth > 0,
        imageWidth: closeupImage.naturalWidth,
        imageHeight: closeupImage.naturalHeight,
        text: document.querySelector("#yardCloseupText")?.textContent.trim(),
        source: document
          .querySelector("#yardCloseupSource")
          ?.textContent.trim(),
        textVisible:
          closeupCopy.classList.contains("is-text-visible"),
        sourceVerified: closeupCopy.dataset.sourceVerified,
        expectedText: expectedGazeParagraph?.text || "",
        expectedVerified: Boolean(expectedGazeParagraph?.sourceVerified),
        finishHidden: finishButton.hidden,
        finishWidth: finishButton.getBoundingClientRect().width,
      },
      departure: {
        state: canvas.dataset.departureState,
        visible: !departureEnding.hidden,
        caption: document
          .querySelector("#yardDepartureCaption")
          ?.textContent.trim(),
        continueText: departureContinue.textContent.trim(),
        continueWidth: departureContinue.getBoundingClientRect().width,
        restartText: departureRestart.textContent.trim(),
        restartWidth: departureRestart.getBoundingClientRect().width,
      },
      ribbon: {
        visible: getComputedStyle(ribbon).visibility === "visible",
        opacity: Number(getComputedStyle(ribbon).opacity),
        disabled: ribbon.disabled,
        width: ribbonRect.width,
        height: ribbonRect.height,
        promptOpacity: Number(
          getComputedStyle(ribbonPrompt).opacity,
        ),
        consumed: ribbon.classList.contains("is-consumed"),
      },
      animationClasses: {
        shaking: canvas.classList.contains("is-shaking"),
        smoking: canvas.classList.contains("is-smoking"),
        rush: document
          .querySelector("#yardRushDog")
          .classList.contains("is-running"),
        veil: document
          .querySelector("#yardInkVeil")
          .classList.contains("is-active"),
      },
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

async function waitForPhase(page, phase, settle = true) {
  await page.waitForFunction(
    (expected) => {
      const canvas = document.querySelector("#yardCanvas");
      return (
        canvas?.dataset.yardPhase === expected &&
        [...document.querySelectorAll(".yard-scene-image")].some(
          (layer) =>
            layer.classList.contains("is-current") &&
            layer.complete &&
            layer.naturalWidth > 0,
        )
      );
    },
    phase,
    { timeout: 7000 },
  );
  if (settle) await page.waitForTimeout(560);
  return snapshot(page);
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge/Chrome found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const checks = {};
  const errors = [];
  const captures = [];

  function check(name, condition, detail = "") {
    checks[name] = {
      passed: Boolean(condition),
      detail:
        typeof detail === "string" ? detail : JSON.stringify(detail),
    };
  }

  function observe(page) {
    page.on("pageerror", (error) => {
      errors.push(`pageerror: ${error.message}`);
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(`console: ${message.text()}`);
      }
    });
    page.on("requestfailed", (request) => {
      if (request.url().startsWith(ORIGIN)) {
        errors.push(`request failed: ${request.url()}`);
      }
    });
  }

  const desktopContext = await browser.newContext({
    viewport: { width: 1720, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const page = await desktopContext.newPage();
  observe(page);
  await page.goto(`${ORIGIN}/#heitou/courtyard`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#storyPageCourtyard")?.hidden === false &&
      document.querySelector("#yardCanvas")?.dataset.yardState === "follow",
  );
  await waitForPhase(page, "follow");

  const assets = await page.evaluate(async (sources) => {
    const entries = Object.entries(sources);
    return Promise.all(
      entries.map(
        ([name, source]) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () =>
              resolve({
                name,
                source,
                loaded: true,
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
            image.onerror = () =>
              resolve({
                name,
                source,
                loaded: false,
                width: 0,
                height: 0,
              });
            image.src = source;
          }),
      ),
    );
  }, expectedSources);

  const eventAssets = await page.evaluate(async (sources) => {
    const imageEntries = Object.entries(sources).filter(
      ([name]) => name !== "audio",
    );
    const images = await Promise.all(
      imageEntries.map(
        ([name, source]) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () =>
              resolve({
                name,
                source,
                loaded: true,
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
            image.onerror = () =>
              resolve({
                name,
                source,
                loaded: false,
                width: 0,
                height: 0,
              });
            image.src = source;
          }),
      ),
    );
    const audioResponse = await fetch(sources.audio);
    const audioBytes = await audioResponse.arrayBuffer();
    return {
      images,
      audio: {
        source: sources.audio,
        loaded: audioResponse.ok,
        contentType: audioResponse.headers.get("content-type"),
        size: audioBytes.byteLength,
      },
    };
  }, expectedEventSources);

  check(
    "allYardStoryImagesLoadAs16By9",
    assets.every(
      (asset) =>
        asset.loaded && Math.abs(asset.width / asset.height - 16 / 9) < 0.01,
    ),
    assets,
  );
  check(
    "ribbonSmokeAndRunningDogLoad",
    eventAssets.images.every(
      (asset) => asset.loaded && asset.width > 0 && asset.height > 0,
    ),
    eventAssets.images,
  );
  check(
    "firecrackerMp3Loads",
    eventAssets.audio.loaded &&
      eventAssets.audio.size > 10000,
    eventAssets.audio,
  );

  const follow = await snapshot(page);
  check(
    "stagePickerExposesOnlyFollowAndAccepted",
    follow.stateButtonStates.join(",") === "follow,accepted" &&
      follow.stateButtonLabels.join(",") === "一 · 跟随,二 · 接纳",
    {
      stateButtonStates: follow.stateButtonStates,
      stateButtonLabels: follow.stateButtonLabels,
    },
  );
  check(
    "defaultStateUsesClosedWaitingScene",
    follow.activePanel === "courtyard" &&
      follow.state === "follow" &&
      follow.pressedState === "follow" &&
      follow.currentSource === expectedSources.follow &&
      follow.layers.filter((layer) => layer.current).length === 1,
    follow,
  );
  check(
    "legacyCompositionRemoved",
    follow.legacySceneElementCount === 0 &&
      follow.layers.length === 2 &&
      follow.layers.every(
        (layer) =>
          layer.objectFit === "cover" &&
          layer.naturalWidth > 0 &&
          layer.naturalHeight > 0,
      ),
    {
      legacySceneElementCount: follow.legacySceneElementCount,
      layers: follow.layers,
    },
  );
  check(
    "surroundingInterfaceRemainsVisible",
    follow.rightPanelVisible &&
      follow.stateButtonsVisible &&
      follow.toolbarButtonsVisible &&
      follow.navigationVisible &&
      follow.storyActionLabels.join(",") ===
        "继续 · 守护与惊变,去读原文,回看鱼头" &&
      follow.horizontalOverflow <= 1,
    follow,
  );
  const followFile = path.join(
    ROOT,
    "heitou-courtyard-follow-1720.png",
  );
  await page.screenshot({ path: followFile, fullPage: false });
  captures.push({ name: "follow", file: followFile });

  await page.locator("[data-yard-state='accepted']").click();
  await page.waitForTimeout(180);
  const crossfade = await snapshot(page);
  check(
    "sceneSwitchUsesTwoLayerCrossfade",
    crossfade.layers.filter((layer) => layer.opacity > 0.02).length === 2 &&
      crossfade.layers.some((layer) => layer.departing),
    crossfade.layers,
  );

  const acceptedOpen = await waitForPhase(page, "accepted-1");
  check(
    "acceptedShowsOpenGateFirst",
    acceptedOpen.state === "accepted" &&
      acceptedOpen.pressedState === "accepted" &&
      acceptedOpen.currentSource === expectedSources.acceptedOpen &&
      acceptedOpen.door === "院门打开",
    acceptedOpen,
  );
  const heldOpen = await snapshot(page);
  check(
    "acceptedFirstImageHoldsBeforeAdvance",
    heldOpen.phase === "accepted-1" &&
      heldOpen.currentSource === expectedSources.acceptedOpen,
    heldOpen,
  );
  const openFile = path.join(
    ROOT,
    "heitou-courtyard-accepted-open-1720.png",
  );
  await page.screenshot({ path: openFile, fullPage: false });
  captures.push({ name: "accepted-open", file: openFile });

  const acceptedWelcome = await waitForPhase(page, "accepted-2");
  check(
    "acceptedAdvancesToWelcomeAndStays",
    acceptedWelcome.state === "accepted" &&
      acceptedWelcome.pressedState === "accepted" &&
      acceptedWelcome.currentSource === expectedSources.acceptedWelcome,
    acceptedWelcome,
  );
  const welcomeFile = path.join(
    ROOT,
    "heitou-courtyard-accepted-welcome-1720.png",
  );
  await page.screenshot({ path: welcomeFile, fullPage: false });
  captures.push({ name: "accepted-welcome", file: welcomeFile });

  await page
    .locator(
      "#storyPageCourtyard .story-actions [data-story-page='guardian']",
    )
    .click();
  await page.waitForFunction(
    () => document.querySelector("#storyPageGuardian")?.hidden === false,
  );
  check(
    "primaryContinueOpensGuardianChapter",
    await page.evaluate(
      () =>
        document.querySelector(
          "[data-story-page-panel]:not([hidden])",
        )?.dataset.storyPagePanel === "guardian",
    ),
  );

  await page
    .locator(".story-step-nav [data-story-page='courtyard']")
    .click();
  await waitForPhase(page, "follow");
  await page
    .locator(
      "#storyPageCourtyard .story-actions [data-story-page='fish']",
    )
    .click();
  await page.waitForFunction(
    () => document.querySelector("#storyPageFish")?.hidden === false,
  );
  check(
    "reviewFishActionOpensFishChapter",
    await page.evaluate(
      () =>
        document.querySelector(
          "[data-story-page-panel]:not([hidden])",
        )?.dataset.storyPagePanel === "fish",
    ),
  );
  await page
    .locator(".story-step-nav [data-story-page='courtyard']")
    .click();
  await waitForPhase(page, "follow");

  await page
    .locator(
      "#storyPageCourtyard .story-actions [data-original-reader='heitou']",
    )
    .click();
  await page.waitForFunction(
    () => document.querySelector("#sharedOriginalReader")?.open === true,
  );
  check(
    "readOriginalActionKeepsCourtyardStoryState",
    await page.evaluate(
      () =>
        document.querySelector("#sharedOriginalReader")?.open === true &&
        document.querySelector("#yardCanvas")?.dataset.yardState === "follow",
    ),
  );
  await page.locator(".shared-original-reader__close").click();
  await page.waitForFunction(
    () => document.querySelector("#sharedOriginalReader")?.open === false,
  );

  await page.evaluate(() => window.setYardState("guard"));
  const guard = await waitForPhase(page, "guard");
  check(
    "guardUsesFestivalCourtyardScene",
    guard.state === "guard" &&
      !guard.pressedState &&
      guard.currentSource === expectedSources.guard &&
      guard.ribbon.visible &&
      guard.ribbon.width > 100 &&
      !guard.ribbon.disabled,
    guard,
  );
  const guardFile = path.join(ROOT, "heitou-courtyard-guard-1720.png");
  await page.screenshot({ path: guardFile, fullPage: false });
  captures.push({ name: "guard", file: guardFile });

  await page.locator("#yardRibbonHotspot").hover();
  await page.waitForTimeout(120);
  const ribbonHover = await snapshot(page);
  check(
    "ribbonHoverRevealsPrompt",
    ribbonHover.ribbon.promptOpacity > 0.8 &&
      ribbonHover.eventStatus === "",
    ribbonHover.ribbon,
  );

  await page.evaluate(() => {
    const ribbon = document.querySelector("#yardRibbonHotspot");
    ribbon.click();
    ribbon.click();
  });
  await page.waitForTimeout(520);
  const rush = await snapshot(page);
  check(
    "ribbonStartsSingleRushSequence",
    rush.eventState === "playing" &&
      rush.triggerCount === 1 &&
      rush.animationClasses.rush &&
      rush.eventStatus.includes("冲去"),
    rush,
  );
  const rushFile = path.join(ROOT, "heitou-courtyard-ribbon-rush-1720.png");
  await page.screenshot({ path: rushFile, fullPage: false });
  captures.push({ name: "ribbon-rush", file: rushFile });

  const accident = await waitForPhase(page, "accident");
  check(
    "firecrackerSequenceReachesChildAccident",
    accident.state === "accident" &&
      accident.currentSource === expectedSources.accident &&
      accident.triggerCount === 1 &&
      accident.eventState === "playing" &&
      accident.audioState === "played" &&
      accident.eventStatus.includes("跌坐"),
    accident,
  );
  const accidentFile = path.join(
    ROOT,
    "heitou-courtyard-scene-accident-1720.png",
  );
  await page.screenshot({ path: accidentFile, fullPage: false });
  captures.push({ name: "scene-accident", file: accidentFile });

  const conflict = await waitForPhase(page, "conflict");
  check(
    "sequenceEndsOnMerchantConflict",
    conflict.state === "conflict" &&
      conflict.currentSource === expectedSources.conflict &&
      conflict.eventState === "complete" &&
      conflict.triggerCount === 1 &&
      conflict.ribbon.consumed &&
      conflict.ribbon.disabled &&
      !conflict.ribbon.visible,
    conflict,
  );
  const conflictFile = path.join(
    ROOT,
    "heitou-courtyard-scene-conflict-1720.png",
  );
  await page.screenshot({ path: conflictFile, fullPage: false });
  captures.push({ name: "scene-conflict", file: conflictFile });

  await page.evaluate(() =>
    document.querySelector("#yardRibbonHotspot").click(),
  );
  await page.waitForTimeout(120);
  const repeatedTrigger = await snapshot(page);
  check(
    "completedRibbonIgnoresRepeatedTrigger",
    repeatedTrigger.triggerCount === 1 &&
      repeatedTrigger.state === "conflict" &&
      repeatedTrigger.eventState === "complete",
    repeatedTrigger,
  );

  await page.waitForFunction(
    () => document.querySelector("#yardCanvas")?.dataset.emotionState === "ready",
    { timeout: 3000 },
  );
  const gazeReady = await snapshot(page);
  check(
    "conflictFreezesIntoQuietEyePrompt",
    gazeReady.state === "conflict" &&
      gazeReady.currentSource === expectedSources.conflict &&
      gazeReady.emotionState === "ready" &&
      gazeReady.audioFadeState === "silent" &&
      gazeReady.audioState === "silent" &&
      gazeReady.sceneFilter !== "none" &&
      !gazeReady.gaze.hotspotHidden &&
      gazeReady.gaze.hotspotWidth > 100 &&
      gazeReady.gaze.prompt === "看看黑头。" &&
      !gazeReady.gaze.continueHidden &&
      gazeReady.gaze.closeupHidden &&
      gazeReady.gaze.finishHidden,
    gazeReady,
  );
  const gazeReadyFile = path.join(
    ROOT,
    "heitou-courtyard-gaze-ready-1720.png",
  );
  await page.screenshot({ path: gazeReadyFile, fullPage: false });
  captures.push({ name: "gaze-ready", file: gazeReadyFile });

  const gazeBox = await page.locator("#yardGazeHotspot").boundingBox();
  await page.mouse.click(
    gazeBox.x + gazeBox.width * 0.5,
    gazeBox.y + gazeBox.height * 0.5,
  );
  await page.waitForFunction(
    () =>
      document.querySelector("#yardCanvas")?.dataset.emotionState ===
      "focusing",
  );
  const gazeApproaching = await snapshot(page);
  check(
    "eyeClickDissolvesConflictIntoHighResolutionCloseup",
    gazeApproaching.emotionState === "focusing" &&
      gazeApproaching.gaze.hotspotHidden &&
      gazeApproaching.gaze.continueHidden &&
      !gazeApproaching.gaze.closeupHidden &&
      gazeApproaching.gaze.closeupVisible &&
      gazeApproaching.gaze.imageLoaded &&
      gazeApproaching.gaze.imageWidth === 1254 &&
      gazeApproaching.gaze.imageHeight === 1254 &&
      gazeApproaching.gaze.text === "",
    gazeApproaching,
  );

  await page.waitForFunction(
    () =>
      document.querySelector("#yardCanvas")?.dataset.emotionState ===
      "revealed",
    { timeout: 6000 },
  );
  const gazeRevealed = await snapshot(page);
  check(
    "quietPauseRevealsVerifiedOriginalGazeText",
    gazeRevealed.emotionState === "revealed" &&
      gazeRevealed.gaze.textVisible &&
      gazeRevealed.gaze.sourceVerified === "true" &&
      gazeRevealed.gaze.expectedVerified &&
      gazeRevealed.gaze.text === gazeRevealed.gaze.expectedText &&
      gazeRevealed.gaze.source.includes("原文") &&
      !gazeRevealed.gaze.finishHidden &&
      gazeRevealed.gaze.finishWidth > 80,
    gazeRevealed.gaze,
  );
  const gazeCloseupFile = path.join(
    ROOT,
    "heitou-courtyard-gaze-closeup-1720.png",
  );
  await page.screenshot({ path: gazeCloseupFile, fullPage: false });
  captures.push({ name: "gaze-closeup", file: gazeCloseupFile });

  await page.keyboard.press("Enter");
  await waitForPhase(page, "leave");
  await page.waitForFunction(
    () =>
      document.querySelector("#yardCanvas")?.dataset.emotionState ===
      "complete",
    { timeout: 2000 },
  );
  await page.waitForFunction(
    () =>
      document.querySelector("#yardCanvas")?.dataset.departureState ===
      "ready",
    { timeout: 4000 },
  );
  const departureReady = await snapshot(page);
  check(
    "gazeSettlesIntoQuietDepartureScene",
    departureReady.state === "leave" &&
      !departureReady.pressedState &&
      departureReady.currentSource === expectedSources.leave &&
      departureReady.door === "夺门而去" &&
      departureReady.caption.includes("夺门而去") &&
      departureReady.emotionState === "complete" &&
      departureReady.eventState === "complete" &&
      departureReady.audioState === "silent" &&
      departureReady.soundToggle === "声音：关" &&
      departureReady.departure.state === "ready" &&
      departureReady.departure.visible &&
      departureReady.departure.caption.includes("没有回头") &&
      departureReady.departure.continueText === "继续故事" &&
      departureReady.departure.restartText === "重新体验" &&
      departureReady.departure.continueWidth > 80 &&
      departureReady.departure.restartWidth > 80 &&
      departureReady.gaze.closeupHidden &&
      departureReady.gaze.finishHidden,
    departureReady,
  );
  const leaveFile = path.join(
    ROOT,
    "heitou-courtyard-departure-1720.png",
  );
  await page.screenshot({ path: leaveFile, fullPage: false });
  captures.push({ name: "departure", file: leaveFile });

  await page.locator("#yardDepartureContinue").click();
  await page.waitForFunction(
    () => document.querySelector("#storyPageGuardian")?.hidden === false,
  );
  const nextChapter = await page.evaluate(() => ({
    activePanel: document.querySelector(
      "[data-story-page-panel]:not([hidden])",
    )?.dataset.storyPagePanel,
    activeNav: document
      .querySelector(".story-step-nav [aria-current='page'] strong")
      ?.textContent.trim(),
    guardianView:
      document.querySelector("#guardianStage")?.dataset.guardianView,
  }));
  check(
    "departureContinuesToCompletedGuardianChapter",
    nextChapter.activePanel === "guardian" &&
      nextChapter.activeNav === "守护" &&
      nextChapter.guardianView === "blackhead",
    nextChapter,
  );

  await page
    .locator(".story-step-nav [data-story-page='courtyard']")
    .click();
  await waitForPhase(page, "follow");
  await page.evaluate(() => window.setYardState("guard"));
  await waitForPhase(page, "guard");
  await page.locator("#yardRibbonHotspot").click();
  await waitForPhase(page, "conflict");
  await page.waitForFunction(
    () => document.querySelector("#yardCanvas")?.dataset.emotionState === "ready",
    { timeout: 3000 },
  );
  await page.locator("#yardGazeHotspot").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#yardCanvas")?.dataset.emotionState ===
      "revealed",
    { timeout: 6000 },
  );
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () =>
      document.querySelector("#yardCanvas")?.dataset.departureState ===
      "ready",
    { timeout: 6000 },
  );
  await page.locator("#yardDepartureRestart").click();
  await page.waitForFunction(
    () => document.querySelector("#storyPageGuardian")?.hidden === false,
  );
  const restarted = await page.evaluate(() => {
    const canvas = document.querySelector("#yardCanvas");
    const ribbon = document.querySelector("#yardRibbonHotspot");
    return {
      activePanel: document.querySelector(
        "[data-story-page-panel]:not([hidden])",
      )?.dataset.storyPagePanel,
      guardianView: document.querySelector("#guardianStage")?.dataset
        .guardianView,
      guardianPrompt: document
        .querySelector("#guardianViewPrompt")
        ?.textContent.trim(),
      yardState: canvas.dataset.yardState,
      eventState: canvas.dataset.yardEventState,
      triggerCount: Number(canvas.dataset.yardTriggerCount || 0),
      emotionState: canvas.dataset.emotionState,
      departureState: canvas.dataset.departureState,
      audioState: canvas.dataset.audioState,
      soundToggle: document
        .querySelector("#storySoundToggle")
        ?.textContent.trim(),
      ribbonDisabled: ribbon.disabled,
      ribbonConsumed: ribbon.classList.contains("is-consumed"),
      closeupHidden:
        document.querySelector("#yardCloseupLayer")?.hidden,
      departureHidden:
        document.querySelector("#yardDepartureEnding")?.hidden,
      animationClasses: {
        shaking: canvas.classList.contains("is-shaking"),
        smoking: canvas.classList.contains("is-smoking"),
        frozen: canvas.classList.contains("is-emotion-frozen"),
      },
    };
  });
  check(
    "restartClearsChapterStateAndReturnsToFirstView",
    restarted.activePanel === "guardian" &&
      restarted.guardianView === "blackhead" &&
      restarted.guardianPrompt === "陌生的脚步越来越近……" &&
      restarted.yardState === "follow" &&
      restarted.eventState === "idle" &&
      restarted.triggerCount === 0 &&
      restarted.emotionState === "idle" &&
      restarted.departureState === "idle" &&
      restarted.audioState === "idle" &&
      restarted.soundToggle === "声音：关" &&
      !restarted.ribbonDisabled &&
      !restarted.ribbonConsumed &&
      restarted.closeupHidden &&
      restarted.departureHidden &&
      !restarted.animationClasses.shaking &&
      !restarted.animationClasses.smoking &&
      !restarted.animationClasses.frozen,
    restarted,
  );

  await page
    .locator(".story-step-nav [data-story-page='courtyard']")
    .click();
  await waitForPhase(page, "follow");

  await page.locator("[data-yard-state='accepted']").click();
  await waitForPhase(page, "accepted-1");
  await page.waitForTimeout(420);
  await page.evaluate(() => window.setYardState("guard"));
  await waitForPhase(page, "guard");
  await page.waitForTimeout(3500);
  const quickSwitch = await snapshot(page);
  check(
    "quickSwitchCancelsStaleAcceptedTimer",
    quickSwitch.state === "guard" &&
      !quickSwitch.pressedState &&
      quickSwitch.currentSource === expectedSources.guard,
    quickSwitch,
  );

  await page
    .locator(".story-step-nav [data-story-page='ending']")
    .click();
  await page.waitForFunction(
    () => document.querySelector("#storyPageEnding")?.hidden === false,
  );
  await page
    .locator(".story-step-nav [data-story-page='courtyard']")
    .click();
  const reentry = await waitForPhase(page, "follow");
  check(
    "reentryRestoresDefaultStage",
    reentry.activePanel === "courtyard" &&
      reentry.state === "follow" &&
      reentry.currentSource === expectedSources.follow &&
      reentry.eventState === "idle" &&
      reentry.triggerCount === 0,
    reentry,
  );
  check(
    "desktopSceneUsesNoUnexpectedOverflow",
    reentry.horizontalOverflow <= 1,
    { horizontalOverflow: reentry.horizontalOverflow },
  );

  await page.evaluate(() => window.setYardState("guard"));
  await waitForPhase(page, "guard");
  await page.locator("#yardRibbonHotspot").click();
  await page.waitForTimeout(420);
  await page
    .locator(".story-step-nav [data-story-page='ending']")
    .click();
  await page.waitForFunction(
    () => document.querySelector("#storyPageEnding")?.hidden === false,
  );
  const interrupted = await snapshot(page);
  check(
    "leavingSceneCleansRushAndSoundState",
    interrupted.eventState === "cancelled" &&
      interrupted.triggerCount === 1 &&
      !interrupted.animationClasses.shaking &&
      !interrupted.animationClasses.smoking &&
      !interrupted.animationClasses.rush &&
      !interrupted.animationClasses.veil,
    interrupted,
  );
  await page
    .locator(".story-step-nav [data-story-page='courtyard']")
    .click();
  await waitForPhase(page, "follow");

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const mobile = await mobileContext.newPage();
  observe(mobile);
  await mobile.goto(`${ORIGIN}/#heitou/courtyard`, {
    waitUntil: "networkidle",
  });
  const mobileFollow = await waitForPhase(mobile, "follow");
  check(
    "mobileKeepsCompleteSceneAspect",
    Math.abs(mobileFollow.canvas.ratio - 1672 / 941) < 0.02 &&
      mobileFollow.currentSource === expectedSources.follow &&
      mobileFollow.horizontalOverflow <= 1,
    mobileFollow.canvas,
  );
  check(
    "mobileSceneSitsBelowNavigation",
    mobileFollow.canvas.top >= mobileFollow.navigationBottom &&
      mobileFollow.canvas.bottom <= 844,
    {
      canvasTop: mobileFollow.canvas.top,
      canvasBottom: mobileFollow.canvas.bottom,
      navigationBottom: mobileFollow.navigationBottom,
    },
  );
  const mobileFollowFile = path.join(
    ROOT,
    "heitou-courtyard-follow-mobile-390.png",
  );
  await mobile.screenshot({ path: mobileFollowFile, fullPage: false });
  captures.push({ name: "mobile-follow", file: mobileFollowFile });

  await mobile.locator("[data-yard-state='accepted']").tap();
  const mobileWelcome = await waitForPhase(mobile, "accepted-2");
  check(
    "mobileAcceptedSequenceCompletes",
    mobileWelcome.state === "accepted" &&
      mobileWelcome.currentSource === expectedSources.acceptedWelcome &&
      mobileWelcome.horizontalOverflow <= 1,
    mobileWelcome,
  );
  const mobileWelcomeFile = path.join(
    ROOT,
    "heitou-courtyard-welcome-mobile-390.png",
  );
  await mobile.screenshot({ path: mobileWelcomeFile, fullPage: false });
  captures.push({ name: "mobile-welcome", file: mobileWelcomeFile });

  await mobile.evaluate(() => window.setYardState("guard"));
  const mobileGuard = await waitForPhase(mobile, "guard");
  check(
    "mobileRibbonHotspotIsTouchReady",
    mobileGuard.ribbon.visible &&
      mobileGuard.ribbon.width > 80 &&
      mobileGuard.eventState === "idle" &&
      mobileGuard.horizontalOverflow <= 1,
    mobileGuard.ribbon,
  );
  const mobileGuardFile = path.join(
    ROOT,
    "heitou-courtyard-guard-mobile-390.png",
  );
  await mobile.screenshot({ path: mobileGuardFile, fullPage: false });
  captures.push({ name: "mobile-guard", file: mobileGuardFile });

  await mobile.locator("#yardRibbonHotspot").tap();
  const mobileAccident = await waitForPhase(mobile, "accident", false);
  check(
    "mobileTouchReachesAccidentScene",
    mobileAccident.state === "accident" &&
      mobileAccident.triggerCount === 1 &&
      mobileAccident.currentSource === expectedSources.accident,
    mobileAccident,
  );
  const mobileAccidentFile = path.join(
    ROOT,
    "heitou-courtyard-accident-mobile-390.png",
  );
  await mobile.screenshot({ path: mobileAccidentFile, fullPage: false });
  captures.push({ name: "mobile-accident", file: mobileAccidentFile });

  const mobileConflict = await waitForPhase(mobile, "conflict");
  check(
    "mobileTouchSequenceCompletes",
    mobileConflict.state === "conflict" &&
      mobileConflict.eventState === "complete" &&
      mobileConflict.currentSource === expectedSources.conflict &&
      mobileConflict.horizontalOverflow <= 1,
    mobileConflict,
  );
  const mobileConflictFile = path.join(
    ROOT,
    "heitou-courtyard-conflict-mobile-390.png",
  );
  await mobile.screenshot({ path: mobileConflictFile, fullPage: false });
  captures.push({ name: "mobile-conflict", file: mobileConflictFile });

  await mobile.waitForFunction(
    () => document.querySelector("#yardCanvas")?.dataset.emotionState === "ready",
    { timeout: 3000 },
  );
  const mobileGazeReady = await snapshot(mobile);
  check(
    "mobileGazePromptAndContinueAreTouchReady",
    mobileGazeReady.motionOff &&
      !mobileGazeReady.gaze.hotspotHidden &&
      mobileGazeReady.gaze.hotspotWidth > 80 &&
      mobileGazeReady.gaze.prompt === "看看黑头。" &&
      !mobileGazeReady.gaze.continueHidden &&
      mobileGazeReady.gaze.continueWidth >= 32 &&
      mobileGazeReady.horizontalOverflow <= 1,
    mobileGazeReady.gaze,
  );

  await mobile.locator("#yardGazeContinueButton").tap();
  await mobile.waitForFunction(
    () =>
      document.querySelector("#yardCanvas")?.dataset.emotionState ===
      "revealed",
    { timeout: 4000 },
  );
  const mobileGazeRevealed = await snapshot(mobile);
  check(
    "mobileTouchReachesReducedMotionCloseup",
    mobileGazeRevealed.emotionState === "revealed" &&
      mobileGazeRevealed.motionOff &&
      mobileGazeRevealed.gaze.closeupVisible &&
      mobileGazeRevealed.gaze.imageLoaded &&
      mobileGazeRevealed.gaze.text ===
        mobileGazeRevealed.gaze.expectedText &&
      mobileGazeRevealed.gaze.sourceVerified === "true" &&
      !mobileGazeRevealed.gaze.finishHidden,
    mobileGazeRevealed.gaze,
  );
  const mobileGazeFile = path.join(
    ROOT,
    "heitou-courtyard-gaze-closeup-mobile-390.png",
  );
  await mobile.screenshot({ path: mobileGazeFile, fullPage: false });
  captures.push({ name: "mobile-gaze-closeup", file: mobileGazeFile });

  await mobile.locator("#yardGazeFinishButton").tap();
  await waitForPhase(mobile, "leave");
  await mobile.waitForFunction(
    () =>
      document.querySelector("#yardCanvas")?.dataset.departureState ===
      "ready",
    { timeout: 3000 },
  );
  const mobileLeave = await snapshot(mobile);
  check(
    "mobileDepartureOffersNextChapterAndRestart",
    mobileLeave.state === "leave" &&
      mobileLeave.currentSource === expectedSources.leave &&
      mobileLeave.emotionState === "complete" &&
      mobileLeave.departure.visible &&
      mobileLeave.departure.continueText === "继续故事" &&
      mobileLeave.departure.restartText === "重新体验" &&
      mobileLeave.departure.continueWidth >= 45 &&
      mobileLeave.departure.restartWidth >= 45 &&
      mobileLeave.horizontalOverflow <= 1,
    mobileLeave,
  );
  const mobileDepartureFile = path.join(
    ROOT,
    "heitou-courtyard-departure-mobile-390.png",
  );
  await mobile.screenshot({ path: mobileDepartureFile, fullPage: false });
  captures.push({
    name: "mobile-departure",
    file: mobileDepartureFile,
  });

  await mobile.locator("#yardDepartureContinue").tap();
  await mobile.waitForFunction(
    () => document.querySelector("#storyPageGuardian")?.hidden === false,
  );
  check(
    "mobileDepartureContinuesToNextChapter",
    await mobile.evaluate(
      () =>
        document.querySelector(
          "[data-story-page-panel]:not([hidden])",
        )?.dataset.storyPagePanel === "guardian",
    ),
  );

  await desktopContext.close();
  await mobileContext.close();
  await browser.close();

  check("runtimeErrors", errors.length === 0, errors);
  const passed = Object.values(checks).every((entry) => entry.passed);
  const report = {
    passed,
    checkCount: Object.keys(checks).length,
    checks,
    errors,
    captures,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify({
      passed,
      checkCount: report.checkCount,
      failed: Object.entries(checks)
        .filter(([, entry]) => !entry.passed)
        .map(([name]) => name),
      errors,
      report: REPORT,
    }),
  );
  if (!passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
