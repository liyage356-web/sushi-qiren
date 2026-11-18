const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  "C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright",
);

const ORIGIN = process.argv[2] || "http://127.0.0.1:4180/web/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "output", "qa-ni-ren-zhang-mockery.json");
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "844x390", width: 844, height: 390, hasTouch: true },
  { name: "390x844", width: 390, height: 844, hasTouch: true },
];
const EXPECTED_TEXT =
  "有个细嗓门的说：“人家台下一边看戏，一边手在袖子里捏泥人。" +
  "捏完拿出来一瞧，台上的嘛样，他捏的嘛样。”跟着就是海张五的大粗嗓门说：" +
  "“在哪儿捏？在袖子里捏？在裤裆里捏吧！”随后一阵笑，拿泥人张找乐子。";

function browserExecutable() {
  const executable = BROWSERS.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

function compact(text) {
  return text.replace(/\s+/g, "");
}

function rectOf(value) {
  return {
    left: value.left,
    top: value.top,
    right: value.right,
    bottom: value.bottom,
    width: value.width,
    height: value.height,
  };
}

async function openObserve(page) {
  await page.goto(`${ORIGIN}index.html#ni-ren-zhang/observe`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "observe",
  );
  await page.waitForFunction(() => {
    const images = [
      ...document.querySelectorAll("#nrPageObserve .nr-observe-background"),
    ];
    return images.length === 2 && images.every((image) => image.complete && image.naturalWidth);
  });
  await page.waitForTimeout(120);
}

async function readState(page) {
  return page.evaluate(() => {
    const elementRect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        left: value.left,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
      };
    };
    const observe = document.querySelector("#nrPageObserve");
    const appearance = observe.querySelector(
      ".nr-observe-background-appearance",
    );
    const mockery = observe.querySelector(
      ".nr-observe-background-mockery",
    );
    const card = observe.querySelector(".nr-center-heading");
    const description = observe.querySelector("#nrObserveDescription");
    const hint = observe.querySelector("#nrObserveReadingHint");
    const button = observe.querySelector("#nrObserveNextButton");
    const hotspot = observe.querySelector("#nrSeaHotspot");
    const hitBounds = observe.querySelector("#nrSeaHitBounds");
    const nav = document.querySelector(
      ".nr-step-nav [aria-current='page']",
    );
    const cardStyle = getComputedStyle(card);
    const hintStyle = getComputedStyle(hint);
    const buttonStyle = getComputedStyle(button);
    const appearanceStyle = getComputedStyle(appearance);
    const mockeryStyle = getComputedStyle(mockery);
    const pageRect = elementRect(observe);
    const cardRect = elementRect(card);
    const buttonRect = elementRect(button);

    return {
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      observeScene: window.niRenZhangStory?.getObserveScene(),
      dataScene: observe.dataset.nrObserveScene,
      pageBusy: observe.getAttribute("aria-busy"),
      activeNav: nav?.dataset.nrPage || null,
      activeNavLabel: nav?.querySelector("strong")?.textContent.trim() || null,
      title: observe.querySelector("#nrObserveTitle").textContent.trim(),
      description: description.textContent.trim(),
      buttonText: button.textContent.replace(/\s+/g, " ").trim(),
      buttonDisabled: button.disabled,
      buttonBackground: buttonStyle.backgroundColor,
      hint: {
        text: hint.textContent.trim(),
        hidden: hint.hidden || getComputedStyle(hint).display === "none",
        color: hintStyle.color,
        fontSize: Number.parseFloat(hintStyle.fontSize),
        marginTop: Number.parseFloat(hintStyle.marginTop),
      },
      card: {
        rect: cardRect,
        backgroundColor: cardStyle.backgroundColor,
        scrollHeight: card.scrollHeight,
        clientHeight: card.clientHeight,
        overflowY: cardStyle.overflowY,
      },
      buttonRect,
      backgrounds: [appearance, mockery].map((image) => ({
        source: image.getAttribute("src"),
        loaded: Boolean(image.complete) && image.naturalWidth > 0,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        objectFit: getComputedStyle(image).objectFit,
        objectPosition: getComputedStyle(image).objectPosition,
        opacity: Number.parseFloat(getComputedStyle(image).opacity),
      })),
      appearanceFilter: appearanceStyle.filter,
      mockeryFilter: mockeryStyle.filter,
      transitionDuration: mockeryStyle.transitionDuration,
      hotspot: {
        opacity: Number.parseFloat(getComputedStyle(hotspot).opacity),
        parentPointerEvents: getComputedStyle(hotspot).pointerEvents,
        boundsPointerEvents: getComputedStyle(hitBounds).pointerEvents,
      },
      page: pageRect,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      cardInsidePage:
        cardRect.left >= pageRect.left - 1 &&
        cardRect.right <= pageRect.right + 1 &&
        cardRect.top >= pageRect.top - 1 &&
        cardRect.bottom <= pageRect.bottom + 1,
      buttonInsidePage:
        buttonRect.left >= pageRect.left - 1 &&
        buttonRect.right <= pageRect.right + 1 &&
        buttonRect.top >= pageRect.top - 1 &&
        buttonRect.bottom <= pageRect.bottom + 1,
    };
  });
}

async function opaquePoint(page) {
  return page.evaluate(() => {
    const image = document.querySelector("#nrSeaFigureOverlay");
    const matrix = image.getScreenCTM();
    const candidates = window.HAIZHANGWU_OVERLAY_CONFIG.keypoints.map(
      (keypoint) => {
        const point = new DOMPoint(keypoint.x, keypoint.y).matrixTransform(
          matrix,
        );
        const target = document.elementFromPoint(point.x, point.y);
        return {
          x: point.x,
          y: point.y,
          label: keypoint.label,
          alphaHit: window.HaizhangwuOverlayCalibrator?.isFigurePoint?.(
            point.x,
            point.y,
          ),
          clickable: Boolean(target?.closest?.("#nrSeaHotspot")),
          topElement:
            target?.id ||
            target?.className?.baseVal ||
            target?.className ||
            target?.tagName,
        };
      },
    );
    const point =
      candidates.find((candidate) => candidate.alphaHit && candidate.clickable) ||
      candidates.find((candidate) => candidate.alphaHit) ||
      candidates[0];
    return {
      ...point,
      candidates,
    };
  });
}

const requestedViewport = process.env.QA_VIEWPORT;
const activeViewports = requestedViewport
  ? VIEWPORTS.filter((viewport) => viewport.name === requestedViewport)
  : VIEWPORTS;

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const checks = [];
  const errors = [];
  const screenshots = [];
  const add = (name, passed, detail = null) =>
    checks.push({ name, passed: Boolean(passed), detail });

  try {
    for (const viewport of activeViewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        hasTouch: Boolean(viewport.hasTouch),
      });
      const page = await context.newPage();
      page.on("pageerror", (error) =>
        errors.push(`${viewport.name}: ${error.message}`),
      );
      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(`${viewport.name}: ${message.text()}`);
        }
      });

      try {
        await openObserve(page);
        const initial = await readState(page);
        add(
          `${viewport.name}: opens in appearance scene`,
          initial.currentPage === "observe" &&
            initial.observeScene === "appearance" &&
            initial.dataScene === "appearance",
          initial,
        );
        add(
          `${viewport.name}: second chapter remains selected`,
          initial.activeNav === "observe" && initial.activeNavLabel === "识人",
          { nav: initial.activeNav, label: initial.activeNavLabel },
        );
        add(
          `${viewport.name}: original appearance remains the visible background`,
          initial.backgrounds[0].loaded &&
            initial.backgrounds[0].opacity === 1 &&
            initial.backgrounds[1].loaded &&
            initial.backgrounds[1].opacity === 0,
          initial.backgrounds,
        );
        add(
          `${viewport.name}: both backgrounds use responsive cover`,
          initial.backgrounds.every((background) => background.objectFit === "cover"),
          initial.backgrounds,
        );
        add(
          `${viewport.name}: original title and copy are preserved`,
          initial.title === "谁在看戏，谁在看人？" &&
            compact(initial.description) ===
              "海张五横冲直撞，众人停筷观看；泥人张仍坐着喝酒。两种姿态放在一起，故事真正的较量才慢慢显露。",
          { title: initial.title, description: initial.description },
        );
        add(
          `${viewport.name}: reading hint matches the brief`,
          !initial.hint.hidden &&
            initial.hint.text === "点击图中人物可进行观察" &&
            initial.hint.color === "rgb(166, 90, 72)" &&
            initial.hint.fontSize >= 12.8 &&
            initial.hint.fontSize <= 13.5 &&
            initial.hint.marginTop >= 11,
          initial.hint,
        );
        add(
          `${viewport.name}: appearance button reads Continue Reading`,
          initial.buttonText === "继续阅读 →" && !initial.buttonDisabled,
          { text: initial.buttonText, disabled: initial.buttonDisabled },
        );
        add(
          `${viewport.name}: card and button stay inside the scene`,
          initial.cardInsidePage &&
            initial.buttonInsidePage &&
            initial.horizontalOverflow === 0,
          {
            card: initial.card,
            button: initial.buttonRect,
            page: initial.page,
            overflow: initial.horizontalOverflow,
          },
        );

        const point = await opaquePoint(page);
        console.log(`${viewport.name}: opaque point`, point);
        await page.mouse.click(point.x, point.y);
        await page.waitForFunction(
          () =>
            !document.querySelector("#haizhangwuViewer").hidden &&
            document
              .querySelector("#haizhangwuViewer")
              .classList.contains("is-open"),
        );
        add(
          `${viewport.name}: opaque figure click still opens the viewer`,
          true,
          point,
        );
        await page.locator(".hzw-close").click();
        await page.waitForFunction(
          () => document.querySelector("#haizhangwuViewer").hidden,
        );
        add(
          `${viewport.name}: viewer closes back to the same scene`,
          (await readState(page)).observeScene === "appearance",
        );

        const button = page.locator("#nrObserveNextButton");
        if (viewport.hasTouch) {
          await button.tap();
        } else {
          await button.click();
        }
        const immediate = await readState(page);
        add(
          `${viewport.name}: Continue Reading does not jump to craft`,
          immediate.currentPage === "observe" &&
            immediate.observeScene === "mockery" &&
            immediate.buttonDisabled &&
            immediate.pageBusy === "true",
          immediate,
        );
        await page.waitForTimeout(310);
        const middle = await readState(page);
        add(
          `${viewport.name}: backgrounds crossfade after the click`,
          middle.backgrounds.every((background) => background.loaded) &&
            middle.backgrounds[0].opacity > 0 &&
            middle.backgrounds[0].opacity < 1 &&
            middle.backgrounds[1].opacity > 0 &&
            middle.backgrounds[1].opacity < 1,
          middle.backgrounds,
        );

        await page.waitForFunction(
          () =>
            document.querySelector("#nrPageObserve").getAttribute("aria-busy") ===
            "false",
        );
        const mockery = await readState(page);
        add(
          `${viewport.name}: mockery scene is fully visible`,
          mockery.observeScene === "mockery" &&
            mockery.dataScene === "mockery" &&
            mockery.backgrounds[0].opacity === 0 &&
            mockery.backgrounds[1].opacity === 1 &&
            mockery.backgrounds[1].source.endsWith(
              "assets/ni-ren-zhang/mockery-banquet.png",
            ) &&
            mockery.backgrounds[1].naturalWidth === 1672 &&
            mockery.backgrounds[1].naturalHeight === 941,
          mockery.backgrounds,
        );
        add(
          `${viewport.name}: mockery title is exact`,
          mockery.title === "泥人张遭冷嘲热讽",
          mockery.title,
        );
        add(
          `${viewport.name}: full mockery copy is preserved`,
          compact(mockery.description) === EXPECTED_TEXT,
          mockery.description,
        );
        add(
          `${viewport.name}: mockery button continues to craft`,
          mockery.buttonText === "开始袖中捏泥 →" &&
            !mockery.buttonDisabled &&
            mockery.hint.hidden,
          mockery,
        );
        add(
          `${viewport.name}: mockery card uses the translucent paper tone`,
          mockery.card.backgroundColor === "rgba(245, 240, 228, 0.88)",
          mockery.card.backgroundColor,
        );
        add(
          `${viewport.name}: mockery layout remains inside the viewport`,
          mockery.cardInsidePage &&
            mockery.buttonInsidePage &&
            mockery.horizontalOverflow === 0,
          {
            card: mockery.card,
            button: mockery.buttonRect,
            page: mockery.page,
            overflow: mockery.horizontalOverflow,
          },
        );
        add(
          `${viewport.name}: appearance hotspot is disabled in mockery`,
          mockery.hotspot.opacity === 0 &&
            mockery.hotspot.parentPointerEvents === "none" &&
            mockery.hotspot.boundsPointerEvents === "none",
          mockery.hotspot,
        );
        add(
          `${viewport.name}: button keeps its original placement`,
          Math.abs(initial.buttonRect.left - mockery.buttonRect.left) < 1 &&
            Math.abs(initial.buttonRect.width - mockery.buttonRect.width) < 1 &&
            Math.abs(initial.buttonRect.height - mockery.buttonRect.height) < 1 &&
            mockery.buttonRect.top >= mockery.card.rect.bottom + 7.5 &&
            mockery.buttonRect.top <= mockery.card.rect.bottom + 16.5,
          {
            appearance: initial.buttonRect,
            mockery: mockery.buttonRect,
          },
        );

        if (viewport.name === "1440x900" || viewport.name === "390x844") {
          const filename = path.join(
            ROOT,
            `ni-ren-zhang-mockery-${viewport.name}.png`,
          );
          await page.screenshot({ path: filename, fullPage: true });
          screenshots.push(filename);
        }

        await page.goBack();
        await page.waitForFunction(
          () =>
            window.niRenZhangStory?.getCurrentPage() === "observe" &&
            window.niRenZhangStory?.getObserveScene() === "appearance",
        );
        add(
          `${viewport.name}: browser Back restores appearance`,
          (await readState(page)).title === "谁在看戏，谁在看人？",
        );

        await page.locator("#nrObserveNextButton").click();
        await page.waitForFunction(
          () =>
            document.querySelector("#nrPageObserve").getAttribute("aria-busy") ===
            "false",
        );
        await page.locator("#nrObserveNextButton").click();
        await page.waitForFunction(
          () => window.ClayStoryTransition?.getState() === "shoe-clay",
        );
        await page.locator("#clayStoryTransitionSkip").click();
        await page.waitForFunction(
          () => window.niRenZhangStory?.getCurrentPage() === "craft",
        );
        add(
          `${viewport.name}: mockery button enters the existing craft chapter`,
          (await page.locator("#nrPageCraft").isVisible()) &&
            (await page.locator("#nrPageObserve").isHidden()),
        );

        await page.locator(".nr-step-nav [data-nr-page='observe']").click();
        await page.waitForFunction(
          () =>
            window.niRenZhangStory?.getCurrentPage() === "observe" &&
            window.niRenZhangStory?.getObserveScene() === "appearance",
        );
        add(
          `${viewport.name}: top navigation resets to appearance`,
          (await readState(page)).title === "谁在看戏，谁在看人？",
        );
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const failed = checks.filter((check) => !check.passed);
  const report = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    assertionCount: checks.length,
    passed: failed.length === 0 && errors.length === 0,
    failed,
    errors,
    screenshots,
    checks,
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      passed: report.passed,
      assertions: report.assertionCount,
      failed: failed.length,
      errors: errors.length,
      report: OUTPUT,
    }),
  );
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
