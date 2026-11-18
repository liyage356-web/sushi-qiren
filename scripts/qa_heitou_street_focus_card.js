const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-heitou-street-focus-card.json");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function overlapArea(first, second) {
  if (!first || !second) return 0;
  const width = Math.max(
    0,
    Math.min(first.right, second.right) - Math.max(first.left, second.left),
  );
  const height = Math.max(
    0,
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
  );
  return width * height;
}

async function openStreet(page) {
  await page.goto(`${ORIGIN}#heitou/street`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      document.querySelector("#storyPageStreet")?.hidden === false &&
      document.querySelector("#streetDogHotspot img")?.complete === true &&
      document.querySelector("#streetDogHotspot img")?.naturalWidth > 0,
  );
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(180);
}

async function focusDog(page) {
  await page.locator("#streetDogHotspot").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#streetExplore")?.dataset.state === "focused" &&
      document.querySelector("#streetFocusCard")?.hidden === false,
  );
  await page.waitForTimeout(560);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const card = document.querySelector("#streetFocusCard");
    const nav = document.querySelector(".story-step-nav");
    const hotspot = document.querySelector("#streetDogHotspot");
    const fishFood = document.querySelector("#streetFeedFood");
    const feedTarget = document.querySelector("#streetFeedTarget");
    const wildImage = document.querySelector("#streetWildDogEncounter img");
    const closeButton = document.querySelector("#streetFocusClose");
    const followButton = document.querySelector("#streetFollowButton");
    const originalButton = card.querySelector('[data-original-reader="heitou"]');

    const rect = (element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        width: bounds.width,
        height: bounds.height,
      };
    };

    function alphaBounds(image) {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      let left = canvas.width;
      let top = canvas.height;
      let right = 0;
      let bottom = 0;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (data[(y * canvas.width + x) * 4 + 3] < 8) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x + 1);
          bottom = Math.max(bottom, y + 1);
        }
      }
      return {
        left: left / canvas.width,
        top: top / canvas.height,
        right: right / canvas.width,
        bottom: bottom / canvas.height,
      };
    }

    function visibleContainedImageBounds(image) {
      const style = getComputedStyle(image);
      const transformed = image.getBoundingClientRect();
      const matrix = new DOMMatrixReadOnly(style.transform);
      const scaleX = Math.hypot(matrix.a, matrix.b);
      const scaleY = Math.hypot(matrix.c, matrix.d);
      const boxWidth = transformed.width / scaleX;
      const boxHeight = transformed.height / scaleY;
      const containScale = Math.min(
        boxWidth / image.naturalWidth,
        boxHeight / image.naturalHeight,
      );
      const displayedWidth = image.naturalWidth * containScale;
      const displayedHeight = image.naturalHeight * containScale;
      const contentLeft = boxWidth - displayedWidth;
      const contentTop = boxHeight - displayedHeight;
      const alpha = alphaBounds(image);

      return {
        left:
          transformed.right -
          (boxWidth - (contentLeft + alpha.left * displayedWidth)) * scaleX,
        top:
          transformed.bottom -
          (boxHeight - (contentTop + alpha.top * displayedHeight)) * scaleY,
        right:
          transformed.right -
          (boxWidth -
            (contentLeft + alpha.right * displayedWidth)) *
            scaleX,
        bottom:
          transformed.bottom -
          (boxHeight -
            (contentTop + alpha.bottom * displayedHeight)) *
            scaleY,
        alpha,
        scaleX,
        scaleY,
      };
    }

    const cardRect = rect(card);
    const navRect = rect(nav);
    const style = getComputedStyle(card);
    const text = card.textContent.replace(/\s+/g, " ").trim();
    const wildVisible =
      getComputedStyle(document.querySelector("#streetWildDogEncounter"))
        .visibility === "visible";

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      card: cardRect,
      nav: navRect,
      cardStyle: {
        borderRadius: style.borderRadius,
        backgroundImage: style.backgroundImage,
        boxShadow: style.boxShadow,
        overflow: style.overflow,
      },
      cardText: text,
      contentVisible: [
        "#streetAppearanceEyebrow",
        "#streetAppearanceTitle",
        "#streetAppearanceExcerpt",
        "#streetAppearanceSource",
        "#streetFollowButton",
        "#streetFocusClose",
      ].every((selector) => {
        const element = document.querySelector(selector);
        return Boolean(element && element.getClientRects().length);
      }),
      tags: [
        ...document.querySelectorAll(".street-appearance-tags span"),
      ].map((element) => element.textContent.trim()),
      buttons: {
        close: closeButton.getBoundingClientRect().toJSON(),
        follow: followButton.getBoundingClientRect().toJSON(),
        original: originalButton.getBoundingClientRect().toJSON(),
        followDisabled: followButton.disabled,
      },
      scroll: {
        width: card.clientWidth,
        height: card.clientHeight,
        scrollWidth: card.scrollWidth,
        scrollHeight: card.scrollHeight,
      },
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      state: document.querySelector("#streetExplore").dataset.state,
      feedState: document.querySelector("#streetExplore").dataset.feedState,
      wildDog: {
        visible: wildVisible,
        imageLoaded: Boolean(wildImage.complete) && wildImage.naturalWidth > 0,
        visibleBounds: wildVisible
          ? visibleContainedImageBounds(wildImage)
          : null,
      },
      hotspot: rect(hotspot),
      fishFood: rect(fishFood),
      feedTarget: rect(feedTarget),
      pointOutsideCard: (() => {
        const point = { x: window.innerWidth * 0.48, y: window.innerHeight * 0.86 };
        const element = document.elementFromPoint(point.x, point.y);
        return {
          point,
          insideCard: Boolean(element && card.contains(element)),
          tag: element?.tagName || null,
          id: element?.id || null,
        };
      })(),
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
  const sessions = {};

  function check(name, condition, detail = "") {
    checks[name] = {
      passed: Boolean(condition),
      detail:
        typeof detail === "string" ? detail : JSON.stringify(detail),
    };
  }

  function observe(page) {
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
  }

  const configurations = [
    {
      name: "fullHd",
      viewport: { width: 1920, height: 1080 },
      screenshot: "heitou-street-focus-card-1920.png",
    },
    {
      name: "reference",
      viewport: { width: 1720, height: 963 },
      screenshot: "heitou-street-focus-card-1720.png",
    },
    {
      name: "laptop",
      viewport: { width: 1366, height: 768 },
      screenshot: "heitou-street-focus-card-1366.png",
    },
    {
      name: "mobile",
      viewport: { width: 390, height: 844 },
      screenshot: "heitou-street-focus-card-390.png",
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    },
  ];

  for (const configuration of configurations) {
    const context = await browser.newContext({
      viewport: configuration.viewport,
      hasTouch: Boolean(configuration.hasTouch),
      isMobile: Boolean(configuration.isMobile),
      deviceScaleFactor: configuration.deviceScaleFactor || 1,
    });
    const page = await context.newPage();
    observe(page);
    await openStreet(page);
    await focusDog(page);
    const focused = await snapshot(page);
    sessions[configuration.name] = { focused };

    const widthRatio =
      focused.card.width / Math.max(1, focused.viewport.width);
    const rightMargin = focused.viewport.width - focused.card.right;
    const navGap = focused.card.top - focused.nav.bottom;
    const insideViewport =
      focused.card.left >= 0 &&
      focused.card.top >= 0 &&
      focused.card.right <= focused.viewport.width + 1 &&
      focused.card.bottom <= focused.viewport.height + 1;
    const expectedText = [
      "黑头 · 人物初见",
      "它没有叫，只是警醒地看着",
      "黑白斑驳",
      "头脸乌黑",
      "卷毛蓬乱",
      "原文外貌描写",
      "图像转述",
      "完成两次投食",
      "阅读原文",
    ];

    check(
      `${configuration.name}CardSitsImmediatelyBelowNavigation`,
      navGap >= 4 && navGap <= 22,
      { cardTop: focused.card.top, navBottom: focused.nav.bottom, navGap },
    );
    check(
      `${configuration.name}CardStaysInsideViewport`,
      insideViewport && rightMargin >= 8 && focused.horizontalOverflow <= 1,
      {
        card: focused.card,
        viewport: focused.viewport,
        rightMargin,
        horizontalOverflow: focused.horizontalOverflow,
      },
    );
    check(
      `${configuration.name}CardUsesRequestedDesktopWidth`,
      configuration.name === "mobile"
        ? focused.card.width <= focused.viewport.width - 18
        : widthRatio >= 0.24 && widthRatio <= 0.31,
      { widthRatio, width: focused.card.width },
    );
    check(
      `${configuration.name}CardIsLandscapeAndContentSized`,
      configuration.name === "mobile"
        ? focused.card.height <= 470
        : focused.card.height < focused.card.width &&
            focused.scroll.scrollHeight <= focused.scroll.height + 1,
      {
        width: focused.card.width,
        height: focused.card.height,
        scrollHeight: focused.scroll.scrollHeight,
        clientHeight: focused.scroll.height,
      },
    );
    check(
      `${configuration.name}CardUsesFlatPalePaperStyle`,
      focused.cardStyle.borderRadius === "0px" &&
        focused.cardStyle.backgroundImage.includes("linear-gradient") &&
        focused.cardStyle.boxShadow !== "none",
      focused.cardStyle,
    );
    check(
      `${configuration.name}AllOriginalCardContentRemains`,
      focused.contentVisible &&
        expectedText.every((value) => focused.cardText.includes(value)) &&
        ["黑白斑驳", "头脸乌黑", "卷毛蓬乱"].every((value) =>
          focused.tags.includes(value),
        ),
      {
        contentVisible: focused.contentVisible,
        tags: focused.tags,
        cardText: focused.cardText,
      },
    );
    check(
      `${configuration.name}CardDoesNotBlockFishOrSceneDragArea`,
      overlapArea(focused.card, focused.fishFood) === 0 &&
        overlapArea(focused.card, focused.feedTarget) === 0 &&
        !focused.pointOutsideCard.insideCard,
      {
        card: focused.card,
        fishFood: focused.fishFood,
        feedTarget: focused.feedTarget,
        outsidePoint: focused.pointOutsideCard,
      },
    );
    check(
      `${configuration.name}CloseAndActionsRemainReachable`,
      focused.buttons.close.width > 0 &&
        focused.buttons.close.height >= 30 &&
        focused.buttons.follow.width > 0 &&
        focused.buttons.follow.height >= 30 &&
        focused.buttons.original.width > 0 &&
        focused.buttons.original.height >= 30,
      focused.buttons,
    );

    await page.screenshot({
      path: path.join(ROOT, configuration.screenshot),
      fullPage: false,
    });

    await page.locator("#streetFeedFood").click();
    await page.locator("#streetFeedTarget").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#streetExplore")?.dataset.feedState ===
        "blocked",
    );
    await page.waitForTimeout(860);
    const blocked = await snapshot(page);
    sessions[configuration.name].blocked = blocked;
    const wildOverlap =
      blocked.wildDog.visible && blocked.wildDog.visibleBounds
        ? overlapArea(blocked.card, {
            ...blocked.wildDog.visibleBounds,
            width:
              blocked.wildDog.visibleBounds.right -
              blocked.wildDog.visibleBounds.left,
            height:
              blocked.wildDog.visibleBounds.bottom -
              blocked.wildDog.visibleBounds.top,
          })
        : Number.POSITIVE_INFINITY;
    check(
      `${configuration.name}CardDoesNotCoverVisibleWildDog`,
      blocked.wildDog.visible &&
        blocked.wildDog.imageLoaded &&
        wildOverlap === 0,
      {
        card: blocked.card,
        wildBounds: blocked.wildDog.visibleBounds,
        wildOverlap,
      },
    );
    check(
      `${configuration.name}FeedingStatusAndBlackheadRemainVisible`,
      blocked.feedState === "blocked" &&
        blocked.cardText.includes("它仍没能靠近食物") &&
        blocked.hotspot.width > 0 &&
        blocked.hotspot.height > 0,
      {
        feedState: blocked.feedState,
        hotspot: blocked.hotspot,
      },
    );

    if (configuration.name === "reference") {
      await page.screenshot({
        path: path.join(ROOT, "heitou-street-focus-card-blocked-1720.png"),
        fullPage: false,
      });
    }

    await page.locator("#streetFeedFood").click();
    await page.locator("#streetFeedTarget").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#streetExplore")?.dataset.feedState ===
          "complete" &&
        document.querySelector("#streetFollowButton")?.disabled === false,
    );
    const complete = await snapshot(page);
    sessions[configuration.name].complete = complete;
    const completeWildOverlap =
      complete.wildDog.visible && complete.wildDog.visibleBounds
        ? overlapArea(complete.card, {
            ...complete.wildDog.visibleBounds,
            width:
              complete.wildDog.visibleBounds.right -
              complete.wildDog.visibleBounds.left,
            height:
              complete.wildDog.visibleBounds.bottom -
              complete.wildDog.visibleBounds.top,
          })
        : Number.POSITIVE_INFINITY;
    check(
      `${configuration.name}FollowActionUnlocksAndRemainsClickable`,
      !complete.buttons.followDisabled &&
        complete.cardText.includes("跟着它去鱼铺") &&
        complete.cardText.includes("下一章已解锁") &&
        overlapArea(complete.card, complete.fishFood) === 0,
      {
        followDisabled: complete.buttons.followDisabled,
        feedState: complete.feedState,
      },
    );
    check(
      `${configuration.name}CompletedCardStillAvoidsWildDog`,
      complete.wildDog.visible &&
        complete.wildDog.imageLoaded &&
        completeWildOverlap === 0,
      {
        card: complete.card,
        wildBounds: complete.wildDog.visibleBounds,
        wildOverlap: completeWildOverlap,
      },
    );

    if (configuration.name === "reference") {
      await page.screenshot({
        path: path.join(
          ROOT,
          "heitou-street-focus-card-complete-1720.png",
        ),
        fullPage: false,
      });
    }

    if (configuration.name === "mobile") {
      await page.screenshot({
        path: path.join(
          ROOT,
          "heitou-street-focus-card-complete-mobile-390.png",
        ),
        fullPage: false,
      });
    }

    await page.locator('#streetFocusCard [data-original-reader="heitou"]').click();
    await page.waitForFunction(
      () => document.querySelector("#sharedOriginalReader")?.open === true,
    );
    check(
      `${configuration.name}OriginalReaderStillOpensFromCard`,
      await page.evaluate(
        () =>
          document
            .querySelector("#sharedOriginalReader .shared-original-reader__text")
            ?.textContent.includes("这儿说的黑头") === true,
      ),
    );
    await page.locator(".shared-original-reader__close").click();
    await page.waitForFunction(
      () => document.querySelector("#sharedOriginalReader")?.open === false,
    );

    await page.locator("#streetFocusClose").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#streetExplore")?.dataset.state === "idle" &&
        document.querySelector("#streetFocusCard")?.hidden === true,
    );
    check(
      `${configuration.name}CloseReturnsToStreetWithoutHiddenPanel`,
      await page.evaluate(
        () =>
          document.querySelector("#streetExplore").dataset.state === "idle" &&
          document.querySelector("#streetFocusCard").hidden === true &&
          document.querySelector("#streetDogHotspot").getBoundingClientRect()
            .width > 0,
      ),
    );

    await page.locator("#streetDogHotspot").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#streetExplore")?.dataset.state === "focused" &&
        document.querySelector("#streetFollowButton")?.disabled === false,
    );
    await page.locator("#streetFollowButton").click();
    await page.waitForFunction(
      () => document.querySelector("#storyPageFish")?.hidden === false,
    );
    check(
      `${configuration.name}FollowStillNavigatesToFishChapter`,
      await page.evaluate(
        () =>
          document.querySelector("#storyPageStreet").hidden === true &&
          document.querySelector("#storyPageFish").hidden === false,
      ),
    );

    await context.close();
  }

  check("runtimeErrors", errors.length === 0, errors);

  await browser.close();
  const failed = Object.entries(checks)
    .filter(([, result]) => !result.passed)
    .map(([name]) => name);
  const report = {
    passed: failed.length === 0,
    checkCount: Object.keys(checks).length,
    failed,
    errors,
    checks,
    sessions,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      passed: report.passed,
      checkCount: report.checkCount,
      failed,
      errors,
      report: REPORT,
    }),
  );
  if (!report.passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
