const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-heitou-guardian.json");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const prompts = {
  blackhead: "陌生的脚步越来越近……",
  child: "院子里那只大狗，正盯着这边……",
  shopkeeper: "院里人多，得留神些……",
};
const storyTitle = "黑头惹了祸，而且是大祸";
const storyCopies = {
  1:
    "黑头没见过场面，如临大敌，浑身的毛全竖起来。鞭炮响起，黑头以为出了事，突然腾身蹿跃出来，孩子们一见这黑头花身、张牙舞爪、凶神恶煞般的怪物，吓得转身就跑。一个邻居家的男孩儿被挤倒，脑袋撞上石头门墩，开了口子冒出血来。",
  2:
    "商大爷是讲礼讲面的人，自己缺理，人家话不好听，也得受着。一边叫家里人陪着孩子去瞧大夫，一边回到院里安顿受了惊扰的修房的人。这时，扭头一眼瞧见黑头，心火冒起，拾起一根竿子两步过去，给黑头狠狠一竿子，骂道：“畜生就是畜生，我一辈子和人好礼好面，你把我面子丢尽了！” 黑头挨了重重一击，本能地蹿起，龇牙大叫一声，那样子真凶。商大爷正在火头上，并不怕它，朝它怒吼：“干嘛！你还敢咬我？”",
  3:
    "黑头站那儿没动，两眼直对商大爷看着，忽然转身夺门而去，一溜烟儿就跑没了。商大爷把竿子一扔说：“滚吧，打今儿别再回来，原本不就是条丧家犬吗？”",
};

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
  return { context, page, errors };
}

async function openGuardian(page) {
  await page.goto(`${ORIGIN}#heitou/guardian`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      document.querySelector("#storyPageGuardian")?.hidden === false &&
      document.querySelector("#guardianBackdrop")?.complete === true,
  );
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(180);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const panel = document.querySelector("#storyPageGuardian");
    const stage = document.querySelector("#guardianStage");
    const image = document.querySelector("#guardianBackdrop");
    const stageRect = stage.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const toolbarRect = document
      .querySelector(".story-toolbar")
      .getBoundingClientRect();
    const navRect = document
      .querySelector(".story-step-nav")
      .getBoundingClientRect();
    const activeButton = document.querySelector(
      "[data-guardian-view-option][aria-pressed='true']",
    );
    const viewButtons = [
      ...document.querySelectorAll("[data-guardian-view-option]"),
    ];
    const imageStyle = getComputedStyle(image);
    const stageStyle = getComputedStyle(stage);
    const nextButton = document.querySelector("#guardianNextButton");
    const nextButtonRect = nextButton.getBoundingClientRect();
    const storyContent = document.querySelector("#guardianStoryContent");
    const storyStyle = getComputedStyle(storyContent);
    const picker = document.querySelector(".guardian-view-picker");
    const viewCard = document.querySelector(".guardian-view-card");
    const secondaryAction = document.querySelector(
      "#storyPageGuardian .story-actions [data-story-page='courtyard']",
    );
    const toolbarButtons = [
      ...document.querySelectorAll(".story-toolbar button"),
    ];

    return {
      route: location.hash,
      activePanel: document.querySelector(
        "[data-story-page-panel]:not([hidden])",
      )?.dataset.storyPagePanel,
      navLabels: [
        ...document.querySelectorAll(
          ".story-step-nav [data-story-page] strong",
        ),
      ].map((label) => label.textContent.trim()),
      activeNav: document
        .querySelector(".story-step-nav [aria-current='page'] strong")
        ?.textContent.trim(),
      panel: {
        left: panelRect.left,
        top: panelRect.top,
        width: panelRect.width,
        height: panelRect.height,
      },
      stage: {
        left: stageRect.left,
        top: stageRect.top,
        bottom: stageRect.bottom,
        width: stageRect.width,
        height: stageRect.height,
        ratio: stageRect.width / stageRect.height,
      },
      toolbarBottom: toolbarRect.bottom,
      navigationBottom: navRect.bottom,
      image: {
        loaded: image.complete && image.naturalWidth > 0,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        source: new URL(image.src).pathname,
        objectFit: imageStyle.objectFit,
        opacity: Number(imageStyle.opacity),
        transform: imageStyle.transform,
        transformOrigin: imageStyle.transformOrigin,
        transitionDuration: imageStyle.transitionDuration,
      },
      storyStep: Number(stage.dataset.storyStep || 0),
      story: {
        title: document
          .querySelector("#guardianPageTitle")
          ?.textContent.trim(),
        copy: document.querySelector("#guardianCopy")?.textContent.trim(),
        opacity: Number(storyStyle.opacity),
        overflowY: storyStyle.overflowY,
        clientHeight: storyContent.clientHeight,
        scrollHeight: storyContent.scrollHeight,
      },
      nextButton: {
        text: nextButton.textContent.trim(),
        disabled: nextButton.disabled,
        visible: nextButton.offsetParent !== null,
        top: nextButtonRect.top,
        bottom: nextButtonRect.bottom,
      },
      storyClasses: [...stage.classList],
      contentClasses: [...storyContent.classList],
      viewPickerVisible: picker.offsetParent !== null,
      viewCardVisible: viewCard.offsetParent !== null,
      secondaryActionVisible: secondaryAction.offsetParent !== null,
      toolbarButtonsVisible:
        toolbarButtons.length > 0 &&
        toolbarButtons.every((button) => button.offsetParent !== null),
      busy: stage.getAttribute("aria-busy") === "true",
      view: stage.dataset.guardianView,
      scale: stageStyle.getPropertyValue("--guardian-scale").trim(),
      focusX: stageStyle.getPropertyValue("--guardian-focus-x").trim(),
      focusY: stageStyle.getPropertyValue("--guardian-focus-y").trim(),
      label: document.querySelector("#guardianViewLabel")?.textContent.trim(),
      prompt: document.querySelector("#guardianViewPrompt")?.textContent.trim(),
      note: document.querySelector("#guardianViewNote")?.textContent.trim(),
      activeOption: activeButton?.dataset.guardianViewOption,
      buttonStates: viewButtons.map((button) => ({
        text: button.textContent.trim(),
        pressed: button.getAttribute("aria-pressed"),
        height: button.getBoundingClientRect().height,
        visible: button.offsetParent !== null,
      })),
      fallbackHidden:
        document.querySelector("#guardianImageFallback")?.hidden,
      layoutScrollTop:
        document.querySelector(".guardian-layout")?.scrollTop || 0,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

async function chooseView(page, viewName, { tap = false } = {}) {
  const button = page.locator(
    `[data-guardian-view-option="${viewName}"]`,
  );
  if (tap) await button.tap();
  else await button.click();
  await page.waitForFunction(
    (expected) =>
      document.querySelector("#guardianStage")?.dataset.guardianView ===
        expected &&
      document
        .querySelector(
          `[data-guardian-view-option="${expected}"]`,
        )
        ?.getAttribute("aria-pressed") === "true",
    viewName,
  );
  await page.waitForTimeout(560);
  return snapshot(page);
}

async function waitForStoryStep(page, step) {
  await page.waitForFunction(
    (expected) =>
      Number(
        document.querySelector("#guardianStage")?.dataset.storyStep,
      ) === expected &&
      document.querySelector("#guardianStage")?.getAttribute("aria-busy") !==
        "true" &&
      document.querySelector("#guardianNextButton")?.disabled === false,
    step,
  );
  await page.waitForTimeout(40);
}

async function continueStory(page, { tap = false } = {}) {
  const button = page.locator("#guardianNextButton");
  if (tap) await button.tap();
  else await button.click();
  const nextStep = await page.evaluate(
    () =>
      Number(
        document.querySelector("#guardianStage")?.dataset.storyStep || 0,
      ) + 1,
  );
  await waitForStoryStep(page, nextStep);
  return snapshot(page);
}

async function run() {
  const browser = await chromium.launch({
    executablePath: EDGE,
    headless: true,
  });
  const checks = {};
  const errors = [];

  function check(name, condition, detail = "") {
    checks[name] = { passed: Boolean(condition), detail };
  }

  const desktopSession = await createPage(browser, {
    width: 1720,
    height: 1000,
  });
  const page = desktopSession.page;
  errors.push(...desktopSession.errors);
  await openGuardian(page);

  const initial = await snapshot(page);
  check(
    "guardianRoutesBetweenCourtyardAndEnding",
    initial.activePanel === "guardian" &&
      initial.route === "#heitou/guardian" &&
      JSON.stringify(initial.navLabels) ===
        JSON.stringify([
          "老街",
          "鱼头",
          "跟随",
          "院落",
          "守护",
          "尾声",
          "读后",
        ]) &&
      initial.activeNav === "守护",
    initial,
  );
  check(
    "guardianUsesSceneGuardAtSixteenByNine",
    initial.image.loaded &&
      initial.image.source ===
        "/images/hei-tou/courtyard/scene-guard.png" &&
      initial.image.naturalWidth === 1672 &&
      initial.image.naturalHeight === 941 &&
      Math.abs(initial.stage.ratio - 16 / 9) < 0.012 &&
      Math.abs(initial.panel.width - 1720) < 1 &&
      Math.abs(initial.panel.height - 1000) < 1 &&
      initial.stage.top >= initial.navigationBottom &&
      initial.stage.bottom <= 1000,
    initial.stage,
  );
  check(
    "blackheadIsDefaultPerspective",
    initial.view === "blackhead" &&
      initial.activeOption === "blackhead" &&
      initial.label === "黑头视角" &&
      initial.prompt === prompts.blackhead &&
      initial.fallbackHidden === true,
    initial,
  );
  check(
    "softFocusTransitionIsConfigured",
    initial.image.transitionDuration.includes("0.52s") &&
      initial.buttonStates.length === 3 &&
      initial.buttonStates.every(
        (button) => button.visible && button.height >= 38,
      ),
    {
      transitionDuration: initial.image.transitionDuration,
      buttonStates: initial.buttonStates,
    },
  );
  check(
    "guardianStartsAtPreservedThreeViewOpening",
    initial.storyStep === 0 &&
      initial.nextButton.text === "继续阅读" &&
      initial.nextButton.visible &&
      !initial.nextButton.disabled &&
      initial.viewPickerVisible &&
      initial.viewCardVisible &&
      initial.secondaryActionVisible &&
      initial.toolbarButtonsVisible &&
      initial.story.title === "院里的人，各有各的慌张" &&
      initial.story.overflowY === "auto",
    initial,
  );

  const blackheadScreenshot = path.join(
    ROOT,
    "heitou-guardian-blackhead-1720.png",
  );
  await page.screenshot({ path: blackheadScreenshot });

  const child = await chooseView(page, "child");
  check(
    "childPerspectiveFocusesLowerCourtyard",
    child.view === "child" &&
      child.activeOption === "child" &&
      child.label === "孩子视角" &&
      child.prompt === prompts.child &&
      child.focusX === "66%" &&
      child.focusY === "76%" &&
      child.image.transform !== initial.image.transform,
    child,
  );
  const childScreenshot = path.join(
    ROOT,
    "heitou-guardian-child-1720.png",
  );
  await page.screenshot({ path: childScreenshot });

  const shopkeeper = await chooseView(page, "shopkeeper");
  check(
    "shopkeeperPerspectiveRestoresWholeYard",
    shopkeeper.view === "shopkeeper" &&
      shopkeeper.activeOption === "shopkeeper" &&
      shopkeeper.label === "商大爷视角" &&
      shopkeeper.prompt === prompts.shopkeeper &&
      shopkeeper.focusX === "47%" &&
      shopkeeper.focusY === "43%" &&
      shopkeeper.image.transform !== child.image.transform,
    shopkeeper,
  );
  const shopkeeperScreenshot = path.join(
    ROOT,
    "heitou-guardian-shopkeeper-1720.png",
  );
  await page.screenshot({ path: shopkeeperScreenshot });

  await page
    .locator(".story-step-nav [data-story-page='courtyard']")
    .click();
  await page.waitForFunction(
    () => document.querySelector("#storyPageCourtyard")?.hidden === false,
  );
  const courtyard = await page.evaluate(() => ({
    visible: document.querySelector("#storyPageCourtyard")?.hidden === false,
    state: document.querySelector("#yardCanvas")?.dataset.yardState,
    hasRibbon: Boolean(document.querySelector("#yardRibbonHotspot")),
  }));
  await page
    .locator(
      "#storyPageCourtyard .story-actions [data-story-page='guardian']",
    )
    .click();
  await page.waitForFunction(
    () => document.querySelector("#storyPageGuardian")?.hidden === false,
  );
  const reentry = await snapshot(page);
  check(
    "existingCourtyardRemainsAndGuardianResets",
    courtyard.visible &&
      courtyard.state === "follow" &&
      courtyard.hasRibbon &&
      reentry.storyStep === 0 &&
      reentry.view === "blackhead" &&
      reentry.prompt === prompts.blackhead &&
      reentry.nextButton.text === "继续阅读",
    { courtyard, reentry },
  );

  await page.evaluate(() => {
    const button = document.querySelector("#guardianNextButton");
    button.click();
    button.click();
  });
  await page.waitForTimeout(90);
  const midFade = await snapshot(page);
  check(
    "storyCrossfadeSynchronisesImageAndText",
    midFade.storyStep === 0 &&
      midFade.busy &&
      midFade.nextButton.disabled &&
      midFade.storyClasses.includes("is-story-fading") &&
      midFade.contentClasses.includes("is-story-fading") &&
      midFade.image.opacity < 0.9 &&
      midFade.story.opacity < 0.9,
    midFade,
  );
  await waitForStoryStep(page, 1);
  const trouble = await snapshot(page);
  check(
    "firstStoryStepShowsChildScareAndPreventsDoubleAdvance",
    trouble.storyStep === 1 &&
      trouble.image.source ===
        "/images/hei-tou/guardian/scene-trouble.png" &&
      trouble.image.naturalWidth === 1672 &&
      trouble.image.naturalHeight === 941 &&
      trouble.image.objectFit === "cover" &&
      Math.abs(trouble.stage.ratio - 16 / 9) < 0.012 &&
      trouble.label === "第二幕 · 惊扰孩子" &&
      trouble.story.title === storyTitle &&
      trouble.story.copy === storyCopies[1] &&
      trouble.nextButton.text === "继续阅读" &&
      !trouble.viewPickerVisible &&
      !trouble.viewCardVisible &&
      trouble.horizontalOverflow <= 1,
    trouble,
  );
  const troubleScreenshot = path.join(
    ROOT,
    "heitou-guardian-story-trouble-1720.png",
  );
  await page.screenshot({ path: troubleScreenshot });

  const conflict = await continueStory(page);
  check(
    "secondStoryStepShowsReprimandWithFullCopy",
    conflict.storyStep === 2 &&
      conflict.image.source ===
        "/images/hei-tou/courtyard/scene-conflict.png" &&
      conflict.label === "第三幕 · 责打黑头" &&
      conflict.story.title === storyTitle &&
      conflict.story.copy === storyCopies[2] &&
      conflict.story.overflowY === "auto" &&
      conflict.nextButton.text === "继续阅读" &&
      conflict.nextButton.bottom <= conflict.panel.top + conflict.panel.height &&
      conflict.secondaryActionVisible &&
      !conflict.viewPickerVisible,
    conflict,
  );
  const conflictScreenshot = path.join(
    ROOT,
    "heitou-guardian-story-conflict-1720.png",
  );
  await page.screenshot({ path: conflictScreenshot });

  const departure = await continueStory(page);
  check(
    "thirdStoryStepShowsDepartureAndEpilogueAction",
    departure.storyStep === 3 &&
      departure.image.source ===
        "/images/hei-tou/courtyard/scene-departure.png" &&
      departure.label === "第四幕 · 负气离去" &&
      departure.story.title === storyTitle &&
      departure.story.copy === storyCopies[3] &&
      departure.nextButton.text === "继续 · 去尾声" &&
      !departure.viewPickerVisible &&
      !departure.viewCardVisible,
    departure,
  );
  const departureScreenshot = path.join(
    ROOT,
    "heitou-guardian-story-departure-1720.png",
  );
  await page.screenshot({ path: departureScreenshot });

  await page.locator("#guardianNextButton").click();
  await page.waitForFunction(
    () => document.querySelector("#storyPageEnding")?.hidden === false,
  );
  const ending = await page.evaluate(() => ({
    visible: document.querySelector("#storyPageEnding")?.hidden === false,
    epilogueStep: Number(
      document.querySelector("#epilogueScene")?.dataset.epilogueStep || 0,
    ),
    epilogueTitle: document
      .querySelector("#endingPageTitle")
      ?.textContent.trim(),
    activeNav: document
      .querySelector(".story-step-nav [aria-current='page'] strong")
      ?.textContent.trim(),
  }));
  check(
    "guardianContinuesToEpilogue",
    ending.visible &&
      ending.epilogueStep === 0 &&
      ending.epilogueTitle === "尾声" &&
      ending.activeNav === "尾声",
    ending,
  );

  await page
    .locator(".story-step-nav [data-story-page='guardian']")
    .click();
  await page.waitForFunction(
    () => document.querySelector("#storyPageGuardian")?.hidden === false,
  );
  const storyReentry = await snapshot(page);
  check(
    "reenteringGuardianRestoresFirstStoryStepAndThreeViews",
    storyReentry.storyStep === 0 &&
      storyReentry.view === "blackhead" &&
      storyReentry.nextButton.text === "继续阅读" &&
      storyReentry.viewPickerVisible &&
      storyReentry.viewCardVisible,
    storyReentry,
  );
  await desktopSession.context.close();

  const compactSession = await createPage(browser, {
    width: 1366,
    height: 768,
  });
  const compact = compactSession.page;
  errors.push(...compactSession.errors);
  await openGuardian(compact);
  await continueStory(compact);
  const compactConflict = await continueStory(compact);
  check(
    "compactDesktopKeepsLongStoryInsideScrollableCopyPanel",
    compactConflict.storyStep === 2 &&
      Math.abs(compactConflict.stage.ratio - 16 / 9) < 0.012 &&
      compactConflict.story.copy === storyCopies[2] &&
      compactConflict.story.overflowY === "auto" &&
      compactConflict.nextButton.visible &&
      compactConflict.nextButton.bottom <= 768 &&
      compactConflict.secondaryActionVisible &&
      compactConflict.horizontalOverflow <= 1,
    compactConflict,
  );
  const compactScreenshot = path.join(
    ROOT,
    "heitou-guardian-story-compact-1366.png",
  );
  await compact.screenshot({ path: compactScreenshot });
  await compactSession.context.close();

  const mobileSession = await createPage(
    browser,
    { width: 390, height: 844 },
    { hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  );
  const mobile = mobileSession.page;
  errors.push(...mobileSession.errors);
  await openGuardian(mobile);
  const mobileInitial = await snapshot(mobile);
  check(
    "mobileSceneStaysSixteenByNineBelowNavigation",
    Math.abs(mobileInitial.stage.ratio - 16 / 9) < 0.015 &&
      Math.abs(mobileInitial.panel.width - 390) < 1 &&
      Math.abs(mobileInitial.panel.height - 844) < 1 &&
      mobileInitial.stage.top >= mobileInitial.navigationBottom &&
      mobileInitial.horizontalOverflow <= 1 &&
      mobileInitial.buttonStates.every(
        (button) => button.visible && button.height >= 35,
      ),
    mobileInitial,
  );
  const mobileInitialScreenshot = path.join(
    ROOT,
    "heitou-guardian-mobile-390.png",
  );
  await mobile.screenshot({ path: mobileInitialScreenshot });

  const mobileChild = await chooseView(mobile, "child", { tap: true });
  const mobileShopkeeper = await chooseView(mobile, "shopkeeper", {
    tap: true,
  });
  check(
    "mobileTouchSwitchesAllThreePerspectives",
    mobileInitial.prompt === prompts.blackhead &&
      mobileChild.prompt === prompts.child &&
      mobileShopkeeper.prompt === prompts.shopkeeper &&
      mobileChild.focusY === "76%" &&
      mobileShopkeeper.focusY === "43%" &&
      mobileShopkeeper.horizontalOverflow <= 1,
    {
      blackhead: mobileInitial.prompt,
      child: mobileChild.prompt,
      shopkeeper: mobileShopkeeper.prompt,
    },
  );
  await mobile.locator("#guardianNextButton").tap();
  await waitForStoryStep(mobile, 1);
  await mobile.locator("#guardianNextButton").tap();
  await waitForStoryStep(mobile, 2);
  const mobileConflict = await snapshot(mobile);
  await mobile.locator("#guardianNextButton").tap();
  await waitForStoryStep(mobile, 3);
  const mobileDeparture = await snapshot(mobile);
  check(
    "mobileStoryReadingKeepsAllCopyAndActionReachable",
    mobileConflict.storyStep === 2 &&
      mobileConflict.story.copy === storyCopies[2] &&
      mobileConflict.story.overflowY === "auto" &&
      mobileDeparture.storyStep === 3 &&
      mobileDeparture.story.copy === storyCopies[3] &&
      mobileDeparture.nextButton.text === "继续 · 去尾声" &&
      mobileDeparture.nextButton.visible &&
      mobileDeparture.viewPickerVisible === false &&
      mobileDeparture.layoutScrollTop <= 1 &&
      mobileDeparture.stage.top >= mobileDeparture.navigationBottom &&
      mobileDeparture.stage.bottom <= 844 &&
      mobileDeparture.horizontalOverflow <= 1,
    { mobileConflict, mobileDeparture },
  );
  const mobileStoryScreenshot = path.join(
    ROOT,
    "heitou-guardian-story-mobile-390.png",
  );
  await mobile.screenshot({ path: mobileStoryScreenshot });
  await mobile.locator("#guardianNextButton").tap();
  await mobile.waitForFunction(
    () => document.querySelector("#storyPageEnding")?.hidden === false,
  );
  check(
    "mobileStoryContinuesFromThirdStepToEpilogue",
    await mobile.evaluate(
      () =>
        document.querySelector(
          "[data-story-page-panel]:not([hidden])",
        )?.dataset.storyPagePanel === "ending",
    ),
  );
  await mobileSession.context.close();

  check("runtimeErrors", errors.length === 0, errors.join("\n"));

  const passed = Object.values(checks).every((entry) => entry.passed);
  const report = {
    passed,
    checkCount: Object.keys(checks).length,
    checks,
    errors,
    screenshots: [
      blackheadScreenshot,
      childScreenshot,
      shopkeeperScreenshot,
      troubleScreenshot,
      conflictScreenshot,
      departureScreenshot,
      compactScreenshot,
      mobileInitialScreenshot,
      mobileStoryScreenshot,
    ],
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
  await browser.close();
  if (!passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
