const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-reading-navigation.json");
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const readingKicker = "《俗世奇人》· 原文阅读";
const stories = [
  {
    id: "goubuli",
    route: `${ORIGIN}#gou-bu-li/street`,
    title: "狗不理",
    chapterSelector: ".dog-step-nav [data-dog-page]",
    labels: ["巷口", "铺子", "制作", "经营", "名字", "远播", "读后"],
    lastIndex: "07",
    reflectionPanel: "#dogPageReflection",
    minimumActions: 4,
    originalAction: "dogOriginalButton",
    originalClose: ".shared-original-reader__close",
  },
  {
    id: "nirenzhang",
    route: `${ORIGIN}#ni-ren-zhang/theatre`,
    title: "泥人张",
    chapterSelector: ".nr-step-nav [data-nr-page]",
    labels: ["天庆馆", "识人", "捏泥", "亮相", "估衣街", "结局", "读后"],
    lastIndex: "07",
    reflectionPanel: "#nrPageReflection",
    minimumActions: 3,
    originalAction: "niRenZhangOriginalButton",
    originalClose: ".shared-original-reader__close",
  },
  {
    id: "heitou",
    route: `${ORIGIN}#heitou/street`,
    title: "黑头",
    chapterSelector: ".story-step-nav [data-story-page]",
    labels: ["老街", "鱼头", "跟随", "院落", "守护", "尾声", "读后"],
    lastIndex: "07",
    reflectionPanel: "#storyPageReflection",
    minimumActions: 3,
    originalAction: "heitouNavOriginal",
    originalClose: ".shared-original-reader__close",
  },
  {
    id: "sishibayang",
    route: `${ORIGIN}si-shi-ba-yang/index.html#sishi/chapter1`,
    title: "四十八样",
    chapterSelector:
      "#sishiChapterNav [data-sishi-page]",
    labels: [
      "卖糖人",
      "二爷指点",
      "二龙戏珠",
      "走八字",
      "再创新",
      "六句词",
      "读后",
    ],
    lastIndex: "07",
    reflectionPanel: "#sishiChapter7",
    minimumActions: 5,
    originalAction: "readingEntry",
    originalClose: "#readingClose",
  },
];

function findBrowser() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

function observe(page, label, errors) {
  page.on("pageerror", (error) => {
    errors.push(`${label}: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${label}: console: ${message.text()}`);
    }
  });
}

async function inspectNavigation(page, story) {
  return page.evaluate(
    ({ storyId, labels, readingKickerText }) => {
      const storyRoot = {
        goubuli: "#dogBuLiExperience",
        nirenzhang: "#niRenZhangExperience",
        heitou: "#heiTouExperience",
        sishibayang: "body",
      }[storyId];
      const root = document.querySelector(storyRoot);
      const toolbar = root.querySelector(".reading-global-nav");
      const title = root.querySelector(".reading-nav-title");
      const titleKicker = title?.querySelector("span");
      const titleName = title?.querySelector("strong");
      const back = root.querySelector(".reading-nav-back");
      const actions = [
        ...root.querySelectorAll(".reading-nav-actions > button, .reading-nav-actions > a"),
      ].filter((button) => button.offsetParent !== null);
      const chapters = [
        ...root.querySelectorAll(".reading-chapter-link"),
      ];
      const chapterNav = chapters[0]?.closest(".reading-chapter-nav");
      const current = chapters.find(
        (button) => button.getAttribute("aria-current") === "page",
      );
      const toolbarRect = toolbar.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const backRect = back.getBoundingClientRect();
      const chapterRect = chapterNav.getBoundingClientRect();
      const actionRects = actions.map((button) =>
        button.getBoundingClientRect(),
      );
      const actionHeights = actionRects.map((rect) => rect.height);
      return {
        storyRoot,
        toolbarHeight: toolbarRect.height,
        toolbarTop: toolbarRect.top,
        titleKicker: titleKicker?.textContent.trim(),
        titleName: titleName?.textContent.trim(),
        expectedKicker: readingKickerText,
        titleCenter: titleRect.left + titleRect.width / 2,
        viewportCenter: window.innerWidth / 2,
        backText: back.textContent.replace(/\s+/g, "").trim(),
        backLeft: backRect.left,
        actions: actions.map((button) => ({
          text: button.textContent.replace(/\s+/g, " ").trim(),
          height: button.getBoundingClientRect().height,
          disabled: button.disabled,
        })),
        actionMinHeight: Math.min(...actionHeights),
        actionMaxHeight: Math.max(...actionHeights),
        chapters: chapters.map((button) => ({
          number: button.querySelector(".reading-chapter-number")?.textContent,
          label: button.querySelector("strong")?.textContent.trim(),
          ariaCurrent: button.getAttribute("aria-current"),
          disabled: button.disabled,
          index: button.dataset.readingChapterIndex,
          clipped:
            button.querySelector("strong").scrollWidth >
            button.querySelector("strong").clientWidth + 1,
        })),
        expectedLabels: labels,
        chapterCount: chapters.length,
        chapterTop: chapterRect.top,
        chapterHeight: chapterRect.height,
        chapterWidth: chapterRect.width,
        chapterOverflow:
          chapterNav.scrollWidth > chapterNav.clientWidth + 2,
        currentNumber: current
          ?.querySelector(".reading-chapter-number")
          ?.textContent,
        currentLine: current
          ? getComputedStyle(current, "::after").backgroundColor
          : "",
        pageOverflow:
          document.documentElement.scrollWidth > window.innerWidth + 1,
        titleFont: getComputedStyle(titleName).fontFamily,
        chapterFont: getComputedStyle(
          chapters[0].querySelector("strong"),
        ).fontFamily,
        actionTransition: getComputedStyle(actions[0]).transitionDuration,
        navBackground: getComputedStyle(chapterNav).backgroundColor,
      };
    },
    {
      storyId: story.id,
      labels: story.labels,
      readingKickerText: readingKicker,
    },
  );
}

async function openStory(page, story) {
  await page.goto(story.route, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    (id) => {
      const rootSelector = {
        goubuli: "#dogBuLiExperience",
        nirenzhang: "#niRenZhangExperience",
        heitou: "#heiTouExperience",
        sishibayang: "body",
      }[id];
      return document
        .querySelector(rootSelector)
        ?.querySelector(".reading-global-nav");
    },
    story.id,
  );
  await page.waitForTimeout(350);
}

async function clickNextEnabledChapter(page, chapters, story) {
  const count = await chapters.count();
  for (let index = 0; index < count; index += 1) {
    const button = chapters.nth(index);
    if (
      !(await button.isDisabled()) &&
      (await button.getAttribute("aria-current")) !== "page"
    ) {
      await button.click();
      await page.waitForFunction(
        ({ storyId, position }) => {
          const root = document.querySelector(
            {
              goubuli: "#dogBuLiExperience",
              nirenzhang: "#niRenZhangExperience",
              heitou: "#heiTouExperience",
              sishibayang: "body",
            }[storyId],
          );
          const current = root.querySelector(
            ".reading-chapter-link[aria-current='page']",
          );
          return (
            current?.dataset.readingChapterIndex ===
            `${position + 1}`.padStart(2, "0")
          );
        },
        { storyId: story.id, position: index },
      );
      return `${index + 1}`.padStart(2, "0");
    }
  }
  throw new Error("No enabled target chapter was available.");
}

async function testStory(page, story, desktop, errors) {
  observe(page, `${story.id}-${desktop ? "desktop" : "mobile"}`, errors);
  await openStory(page, story);
  const initial = await inspectNavigation(page, story);

  assert.equal(initial.titleKicker, readingKicker, `${story.id} kicker`);
  assert.equal(initial.titleName, story.title, `${story.id} title`);
  assert.ok(
    Math.abs(initial.titleCenter - initial.viewportCenter) <= 3,
    `${story.id} title is not viewport-centered`,
  );
  assert.ok(
    initial.backText.includes("回到老街"),
    `${story.id} back label`,
  );
  assert.ok(initial.backLeft <= (desktop ? 50 : 20), `${story.id} back left`);
  assert.ok(
    initial.actions.length >= story.minimumActions,
    `${story.id} actions`,
  );
  assert.ok(
    initial.actionMaxHeight - initial.actionMinHeight <= 2,
    `${story.id} action heights`,
  );
  assert.equal(
    initial.chapterCount,
    story.labels.length,
    `${story.id} chapter count`,
  );
  assert.deepEqual(
    initial.chapters.map((chapter) => chapter.number),
    [
      ...story.labels
        .slice(0, -1)
        .map((_, index) => `${index + 1}`.padStart(2, "0")),
      "笺",
    ],
    `${story.id} chapter numbers`,
  );
  assert.deepEqual(
    initial.chapters.map((chapter) => chapter.label),
    story.labels,
    `${story.id} chapter labels`,
  );
  assert.ok(
    initial.chapters.every((chapter) => !chapter.clipped),
    `${story.id} chapter labels are clipped`,
  );
  assert.equal(
    initial.chapters.at(-1).index,
    story.lastIndex,
    `${story.id} reflection internal index`,
  );
  assert.equal(
    initial.chapters.filter((chapter) => chapter.ariaCurrent === "page")
      .length,
    1,
    `${story.id} active chapter`,
  );
  assert.equal(initial.currentNumber, "01", `${story.id} initial number`);
  assert.match(
    initial.currentLine,
    /150,\s*59,\s*44|149,\s*58,\s*43/,
    `${story.id} current line`,
  );
  assert.equal(initial.pageOverflow, false, `${story.id} page overflow`);
  assert.ok(
    initial.actionTransition.includes("0.18s"),
    `${story.id} hover transition`,
  );
  assert.ok(
    initial.toolbarHeight === (desktop ? 72 : 108),
    `${story.id} toolbar height ${initial.toolbarHeight}`,
  );
  assert.ok(
    initial.chapterHeight === (desktop ? 64 : 56),
    `${story.id} chapter height ${initial.chapterHeight}`,
  );
  if (desktop) {
    assert.ok(
      initial.chapterWidth <= 961,
      `${story.id} desktop chapter width`,
    );
    assert.equal(
      initial.chapterOverflow,
      false,
      `${story.id} desktop chapter overflow`,
    );
  } else {
    assert.equal(
      initial.chapterOverflow,
      true,
      `${story.id} mobile chapter overflow`,
    );
  }

  const chapters = page.locator(story.chapterSelector);
  const switchedTo = await clickNextEnabledChapter(
    page,
    chapters,
    story,
  );
  const switched = await inspectNavigation(page, story);
  assert.equal(
    switched.currentNumber,
    switchedTo,
    `${story.id} active state after switch`,
  );
  assert.ok(
    Math.abs(switched.titleCenter - switched.viewportCenter) <= 3,
    `${story.id} centered title after switch`,
  );

  const hoverIndex = await page.evaluate((selector) => {
    const buttons = [...document.querySelectorAll(selector)];
    const nav = buttons[0]?.closest(".reading-chapter-nav");
    const navRect = nav.getBoundingClientRect();
    return buttons.findIndex((button) => {
      const rect = button.getBoundingClientRect();
      return (
        !button.disabled &&
        button.getAttribute("aria-current") !== "page" &&
        rect.left >= navRect.left - 1 &&
        rect.right <= navRect.right + 1
      );
    });
  }, story.chapterSelector);
  assert.ok(hoverIndex >= 0, `${story.id} visible hover target`);
  const hoverTarget = page.locator(story.chapterSelector).nth(hoverIndex);
  const hoverBefore = await hoverTarget.evaluate(
    (button) => getComputedStyle(button).backgroundColor,
  );
  await hoverTarget.hover();
  await page.waitForTimeout(220);
  const hoverAfter = await hoverTarget.evaluate(
    (button) => getComputedStyle(button).backgroundColor,
  );
  assert.notEqual(hoverAfter, hoverBefore, `${story.id} hover state`);

  const screenshot = path.join(
    ROOT,
    "output",
    `reading-navigation-${story.id}-${desktop ? "desktop" : "mobile"}.png`,
  );
  await page.screenshot({ path: screenshot });

  if (story.originalHash) {
    await page.locator(`#${story.originalAction}`).click();
    await page.waitForFunction(
      (hash) => window.location.hash === hash,
      story.originalHash,
    );
  } else {
    await page.locator(`#${story.originalAction}`).click();
    await page.locator(story.originalClose).first().waitFor({
      state: "visible",
    });
    await page.locator(story.originalClose).first().click();
  }

  const lastChapter = chapters.last();
  const markerSnapshot = await lastChapter.evaluate((button) => {
    const marker = button.querySelector(".reading-chapter-number");
    const markerRect = marker.getBoundingClientRect();
    const markerStyle = getComputedStyle(marker);
    const navButtons = [
      ...button
        .closest(".reading-chapter-nav")
        .querySelectorAll(".reading-chapter-link"),
    ];
    const buttonRects = navButtons.map((item) =>
      item.getBoundingClientRect(),
    );
    return {
      text: button.textContent.replace(/\s+/g, "").trim(),
      marker: marker.textContent.trim(),
      label: button.querySelector("strong").textContent.trim(),
      ariaLabel: button.getAttribute("aria-label"),
      internalIndex: button.dataset.readingChapterIndex,
      markerWidth: markerRect.width,
      markerHeight: markerRect.height,
      markerFontFamily: markerStyle.fontFamily,
      markerFontSize: markerStyle.fontSize,
      markerFontWeight: markerStyle.fontWeight,
      markerColor: markerStyle.color,
      buttonWidth: button.getBoundingClientRect().width,
      buttonHeight: button.getBoundingClientRect().height,
      buttonWidthSpread:
        Math.max(...buttonRects.map((rect) => rect.width)) -
        Math.min(...buttonRects.map((rect) => rect.width)),
      buttonHeightSpread:
        Math.max(...buttonRects.map((rect) => rect.height)) -
        Math.min(...buttonRects.map((rect) => rect.height)),
    };
  });
  assert.equal(markerSnapshot.text, "笺读后", `${story.id} last label`);
  assert.equal(markerSnapshot.marker, "笺", `${story.id} last marker`);
  assert.equal(markerSnapshot.label, "读后", `${story.id} last title`);
  assert.equal(markerSnapshot.ariaLabel, "读后", `${story.id} last aria`);
  assert.equal(
    markerSnapshot.internalIndex,
    story.lastIndex,
    `${story.id} last data index`,
  );
  assert.ok(
    markerSnapshot.markerWidth === markerSnapshot.markerHeight &&
      markerSnapshot.markerWidth === (desktop ? 25 : 23),
    `${story.id} note marker geometry`,
  );
  assert.match(
    markerSnapshot.markerFontFamily,
    /KaiTi|STKaiti|Kaiti SC|FangSong/,
    `${story.id} note marker font`,
  );
  assert.equal(
    markerSnapshot.markerColor,
    "rgb(154, 81, 64)",
    `${story.id} note marker color`,
  );
  assert.ok(
    markerSnapshot.buttonWidthSpread <= 1 &&
      markerSnapshot.buttonHeightSpread <= 1,
    `${story.id} last button dimensions`,
  );

  const lastHoverBefore = await lastChapter.evaluate(
    (button) => getComputedStyle(button).backgroundColor,
  );
  await lastChapter.hover();
  await page.waitForTimeout(220);
  const lastHoverAfter = await lastChapter.evaluate(
    (button) => getComputedStyle(button).backgroundColor,
  );
  assert.notEqual(
    lastHoverAfter,
    lastHoverBefore,
    `${story.id} note hover state`,
  );

  await lastChapter.click();
  await page.waitForFunction(
    ({ storyId, panelSelector, expectedIndex }) => {
      const root = document.querySelector(
        {
          goubuli: "#dogBuLiExperience",
          nirenzhang: "#niRenZhangExperience",
          heitou: "#heiTouExperience",
          sishibayang: "body",
        }[storyId],
      );
      const current = root.querySelector(
        ".reading-chapter-link[aria-current='page']",
      );
      const panel = document.querySelector(panelSelector);
      const snapshot = window.ReadingReflectionModal?.getSnapshot();
      return (
        current?.dataset.readingChapterIndex === expectedIndex &&
        current?.querySelector(".reading-chapter-number")?.textContent ===
          "笺" &&
        panel?.hidden !== true &&
        snapshot?.open === true &&
        snapshot?.activeStoryId === storyId
      );
    },
    {
      storyId: story.id,
      panelSelector: story.reflectionPanel,
      expectedIndex: story.lastIndex,
    },
    { timeout: 8000 },
  );
  const lastActivated = await lastChapter.evaluate((button) => ({
    current: button.getAttribute("aria-current") === "page",
    focusLabel: button.getAttribute("aria-label"),
  }));
  assert.equal(lastActivated.current, true, `${story.id} last selected`);

  const modeLabel = desktop ? "Desktop" : "Mobile";
  const storyLabel =
    story.id[0].toUpperCase() + story.id.slice(1);
  const checks = Object.fromEntries(
    [
      "TitleAndCentering",
      "BackToStreet",
      "ActionBar",
      "ChapterData",
      "ActiveIndicator",
      "ResponsiveGeometry",
      "ChapterSwitch",
      "HoverState",
      "OriginalAction",
      "ReflectionNavigation",
      "ReflectionHover",
      "NoPageOverflow",
    ].map((name) => [`${storyLabel}${modeLabel}${name}`, true]),
  );
  return { initial, switched, screenshot, checks };
}

async function run() {
  const executablePath = findBrowser();
  assert.ok(executablePath, "No supported Chromium browser was found.");
  const browser = await chromium.launch({ executablePath, headless: true });
  const errors = [];
  const checks = {};
  const detail = {};

  try {
    for (const viewport of [
      { desktop: true, width: 1920, height: 1053 },
      { desktop: false, width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({
        viewport: {
          width: viewport.width,
          height: viewport.height,
        },
        reducedMotion: "no-preference",
      });
      for (const story of stories) {
        const page = await context.newPage();
        const result = await testStory(
          page,
          story,
          viewport.desktop,
          errors,
        );
        const mode = viewport.desktop ? "desktop" : "mobile";
        Object.assign(checks, result.checks);
        detail[`${story.id}-${mode}`] = result;
        await page.close();
      }
      await context.close();
    }

    checks.SharedComponentLoaded = await browser
      .newPage()
      .then(async (page) => {
        await page.goto(`${ORIGIN}#gou-bu-li/street`, {
          waitUntil: "domcontentloaded",
        });
        const loaded = await page.evaluate(
          () =>
            window.StoryReadingNavigation?.readingKicker ===
            "《俗世奇人》· 原文阅读",
        );
        await page.close();
        return loaded;
      });
    checks.RuntimeErrors = errors.length === 0;
  } finally {
    await browser.close();
  }

  const report = {
    passed: Object.values(checks).every(Boolean),
    checkCount: Object.keys(checks).length,
    checks,
    errors,
    detail,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      passed: report.passed,
      checkCount: report.checkCount,
      errors,
      report: REPORT,
    }),
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
