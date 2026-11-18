const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-walk8-sidebar-entry.json");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const STORAGE_KEY = "sishi-qiren:walk8-route:v1";

async function createPage(browser, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    hasTouch: Boolean(options.hasTouch),
    isMobile: Boolean(options.isMobile),
    deviceScaleFactor: options.deviceScaleFactor || 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    errors.push(`request failed: ${request.url()}`);
  });
  return { context, page, errors };
}

async function openChapterFour(page) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter4`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () =>
      document.body.dataset.sishiPage === "chapter4" &&
      document.querySelector("[data-walk8-reset-open]") !== null,
  );
  await page
    .locator(
      "#sishiOriginal-chapter4 .sishi-original-footer button.is-primary",
    )
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("#walkStage")?.offsetParent !== null &&
      document.querySelector("[data-walk8-reset-open]")?.offsetParent !== null,
  );
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(120);
}

async function buttonSnapshot(page) {
  return page.evaluate(() => {
    const current = document.querySelector("[data-walk8-reset-open]");
    const controls = current.closest(".walk-control-actions");
    const aside = current.closest("aside");
    const gallery = controls.querySelector(".text-link-button");
    const currentRect = current.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const asideRect = aside.getBoundingClientRect();
    const galleryRect = gallery.getBoundingClientRect();
    const style = (element) => {
      const computed = getComputedStyle(element);
      return {
        text: element.textContent.replace(/\s+/g, " ").trim(),
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        borderRadius: computed.borderRadius,
        border: computed.border,
        padding: computed.padding,
        lineHeight: computed.lineHeight,
      };
    };
    return {
      currentStyle: style(current),
      currentHeight: currentRect.height,
      readerGuideCardCount: document.querySelectorAll(".walk8-reader-entry")
        .length,
      oldReaderEntryCount: document.querySelectorAll("[data-walk8-open]")
        .length,
      currentInsideAside:
        currentRect.left >= asideRect.left &&
        currentRect.right <= asideRect.right &&
        currentRect.top >= asideRect.top &&
        currentRect.bottom <= asideRect.bottom,
      currentInsideControls:
        currentRect.top >= controlsRect.top &&
        currentRect.bottom <= controlsRect.bottom,
      galleryInsideControls:
        galleryRect.top >= controlsRect.top &&
        galleryRect.bottom <= controlsRect.bottom,
      overlapsGallery: !(
        currentRect.right <= galleryRect.left ||
        currentRect.left >= galleryRect.right ||
        currentRect.bottom <= galleryRect.top ||
        currentRect.top >= galleryRect.bottom
      ),
      oldResetClassPresent: current.classList.contains("walk-reset"),
      oldResetTextPresent: [...document.querySelectorAll("button")].some(
        (button) => button.textContent.trim() === "重新摆步",
      ),
      route: location.hash,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

async function stageSnapshot(page) {
  return page.evaluate(() => {
    const controller = window.walk8StageController?.getSnapshot?.();
    const model = window.walk8StageModel;
    const stage = document.querySelector("#walk8Stage");
    const dialog = document.querySelector("#walk8Experience");
    const buckets = [...document.querySelectorAll(".walk8-bucket-slot")];
    const stored = JSON.parse(
      localStorage.getItem("sishi-qiren:walk8-route:v1") || "{}",
    );
    return {
      dialogOpen: dialog.open,
      bodyModalOpen: document.body.classList.contains("walk8-modal-open"),
      routeHash: location.hash,
      readingDialogOpen:
        document.querySelector("#readingEntryDialog")?.open === true ||
        document.querySelector("#appReadingDialog")?.open === true,
      controller,
      actor: {
        x: Number(stage.dataset.actorX),
        y: Number(stage.dataset.actorY),
        start: model.actorStart,
        pose: stage.querySelector(".walk8-yu-liu")?.dataset.pose,
      },
      buckets: {
        count: buckets.length,
        visible: buckets.every((bucket) => bucket.offsetParent !== null),
        model: model.bucketPositions,
      },
      routeData: {
        path: model.routePath,
        length: model.routeLength,
        nodes: model.routeNodes.length,
      },
      mainGame: {
        step: Number(document.querySelector("#walkStage")?.dataset.walkStep),
        progress: document.querySelector("#walkProgress")?.textContent.trim(),
        instruction: document
          .querySelector("#walkInstruction")
          ?.textContent.trim(),
      },
      firstPrompt: document
        .querySelector("#walk8StageStatus")
        ?.textContent.trim(),
      startLabel: document
        .querySelector("#walk8Start .walk8-start__label")
        ?.textContent.trim(),
      storedProgress: Number(stored.progress),
    };
  });
}

async function run() {
  const browser = await chromium.launch({
    executablePath: EDGE,
    headless: true,
  });
  const checks = {};
  const errors = [];
  const screenshots = [];

  function check(name, condition, detail = "") {
    checks[name] = { passed: Boolean(condition), detail };
  }

  const desktopSession = await createPage(browser, {
    width: 1720,
    height: 1000,
  });
  const desktop = desktopSession.page;
  errors.push(...desktopSession.errors);
  await openChapterFour(desktop);

  const initialButton = await buttonSnapshot(desktop);
  check(
    "standaloneGreenButtonReplacesOldResetControl",
    initialButton.currentStyle.text === "体验走八字 →" &&
      !initialButton.oldResetClassPresent &&
      !initialButton.oldResetTextPresent &&
      initialButton.currentStyle.text.includes("→"),
    initialButton,
  );
  check(
    "greenButtonKeepsSharedReferenceVisualStyle",
    initialButton.currentStyle.backgroundColor === "rgb(64, 91, 78)" &&
      initialButton.currentStyle.color === "rgb(251, 247, 236)" &&
      initialButton.currentStyle.fontSize === "16px" &&
      initialButton.currentStyle.fontWeight === "400" &&
      initialButton.currentStyle.borderRadius === "0px" &&
      initialButton.currentStyle.padding === "9px 18px" &&
      initialButton.currentHeight === 48 &&
      initialButton.readerGuideCardCount === 0 &&
      initialButton.oldReaderEntryCount === 0,
    initialButton,
  );
  check(
    "newButtonStaysAtCardLowerLeftWithoutOverlap",
    initialButton.currentInsideAside &&
      initialButton.currentInsideControls &&
      initialButton.galleryInsideControls &&
      !initialButton.overlapsGallery &&
      initialButton.horizontalOverflow <= 1,
    initialButton,
  );

  const asideScreenshot = path.join(
    ROOT,
    "walk8-sidebar-entry-desktop-1720.png",
  );
  await desktop
    .locator("[data-sishi-interaction-for='chapter4'] .walk-controls")
    .screenshot({ path: asideScreenshot });
  screenshots.push(asideScreenshot);

  await desktop.evaluate(() => {
    ["left", "left", "left", "switch", "right", "right", "right"].forEach(
      (action) => {
        document
          .querySelector(`[data-walk-action="${action}"]`)
          ?.click();
      },
    );
    localStorage.setItem(
      "sishi-qiren:walk8-route:v1",
      JSON.stringify({
        progress: 0.65,
        routeProgress: 0.65,
        activeHand: "left",
        switchCompleted: true,
        interactionCompleted: false,
        routeCompleted: false,
        manualCompleted: false,
      }),
    );
  });
  await desktop.waitForTimeout(80);
  const beforeOpen = await desktop.evaluate(() => ({
    mainStep: Number(document.querySelector("#walkStage")?.dataset.walkStep),
    mainProgress: document.querySelector("#walkProgress")?.textContent.trim(),
    storedProgress: JSON.parse(
      localStorage.getItem("sishi-qiren:walk8-route:v1") || "{}",
    ).progress,
  }));
  await desktop.locator("[data-walk8-reset-open]").click();
  await desktop.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === true,
  );
  await desktop.waitForTimeout(220);
  const opened = await stageSnapshot(desktop);
  check(
    "fixtureStartsFromExistingSeventhStep",
    beforeOpen.mainStep === 7 &&
      beforeOpen.mainProgress === "7" &&
      beforeOpen.storedProgress === 0.65,
    beforeOpen,
  );
  check(
    "newButtonOpensTheExistingWalk8Experience",
    opened.dialogOpen &&
      opened.bodyModalOpen &&
      opened.routeHash === "#sishi/chapter4" &&
      !opened.readingDialogOpen,
    opened,
  );
  check(
    "newButtonResetsMainAndImmersiveRoutesToStart",
    opened.mainGame.step === 0 &&
      opened.mainGame.progress === "0" &&
      opened.controller.progress === 0 &&
      opened.controller.routeProgress === 0 &&
      opened.storedProgress === 0 &&
      opened.controller.active === false &&
      opened.controller.switchCompleted === false &&
      opened.controller.routeCompleted === false &&
      opened.controller.manualCompleted === false,
    opened,
  );
  check(
    "actorBucketsAndFirstPromptRestoreAtStart",
    opened.actor.x === opened.actor.start.x &&
      opened.actor.y === opened.actor.start.y &&
      opened.actor.pose === "idle" &&
      opened.buckets.count === 2 &&
      opened.buckets.visible &&
      opened.routeData.path &&
      opened.routeData.length > 0 &&
      opened.routeData.nodes >= 6 &&
      opened.startLabel === "开始引导" &&
      opened.firstPrompt.includes("点击“开始引导”"),
    opened,
  );

  const stageScreenshot = path.join(ROOT, "walk8-sidebar-entry-stage-1720.png");
  await desktop.screenshot({ path: stageScreenshot });
  screenshots.push(stageScreenshot);

  await desktop.locator("#walk8Close").click();
  await desktop.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === false,
  );
  await desktop.evaluate(() => {
    const button = document.querySelector("[data-walk8-reset-open]");
    button.removeAttribute("data-walk8-reset-open");
    button.setAttribute("data-walk8-open", "true");
    button.click();
    button.removeAttribute("data-walk8-open");
    button.setAttribute("data-walk8-reset-open", "");
  });
  await desktop.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === true,
  );
  await desktop.waitForTimeout(160);
  const removedCardState = await desktop.evaluate(() => ({
    readerGuideCardCount:
      document.querySelectorAll(".walk8-reader-entry").length,
    removedCopyText:
      document.body.innerText.includes("按住路线，带俞六绕过两只桶"),
    modalOpen: document.querySelector("#walk8Experience")?.open === true,
  }));
  check(
    "removedReadingCardDoesNotRemoveSharedInteraction",
    removedCardState.readerGuideCardCount === 0 &&
      removedCardState.removedCopyText === false &&
      removedCardState.modalOpen,
    removedCardState,
  );

  await desktopSession.context.close();

  const mobileSession = await createPage(
    browser,
    { width: 390, height: 844 },
    { hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  );
  const mobile = mobileSession.page;
  errors.push(...mobileSession.errors);
  await openChapterFour(mobile);
  const mobileButton = await buttonSnapshot(mobile);
  check(
    "mobileButtonRemainsVisibleAndInsideCard",
    mobileButton.currentStyle.text === "体验走八字 →" &&
      mobileButton.currentHeight >= 48 &&
      mobileButton.currentInsideAside &&
      mobileButton.currentInsideControls &&
      !mobileButton.overlapsGallery &&
      mobileButton.horizontalOverflow <= 1,
    mobileButton,
  );
  const mobileScreenshot = path.join(
    ROOT,
    "walk8-sidebar-entry-mobile-390.png",
  );
  await mobile
    .locator("[data-sishi-interaction-for='chapter4'] .walk-controls")
    .screenshot({ path: mobileScreenshot });
  screenshots.push(mobileScreenshot);

  await mobile.locator("[data-walk8-reset-open]").tap();
  await mobile.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === true,
  );
  const mobileStage = await stageSnapshot(mobile);
  check(
    "mobileTouchUsesSameResetEntry",
    mobileStage.dialogOpen &&
      mobileStage.controller.progress === 0 &&
      mobileStage.mainGame.step === 0 &&
      mobileStage.buckets.count === 2,
    mobileStage,
  );
  await mobileSession.context.close();

  check(
    "noBrokenImageOrReadingNavigationErrors",
    errors.length === 0,
    errors.join("\n"),
  );

  await browser.close();
  const passed = Object.values(checks).every((entry) => entry.passed);
  const report = {
    passed,
    checkCount: Object.keys(checks).length,
    checks,
    errors,
    screenshots,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        passed,
        checkCount: report.checkCount,
        failed: Object.entries(checks)
          .filter(([, entry]) => !entry.passed)
          .map(([name]) => name),
        errors,
        report: REPORT,
      },
      null,
      2,
    ),
  );
  if (!passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
