const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-original-reading-windows.json");
const SOURCE_NOTE = "摘自冯骥才著《俗世奇人》原文片段";
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const context = { window: {} };
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(
    path.join(ROOT, "web", "data", "original-text.js"),
    "utf8",
  ),
  context,
);
const source = context.window.SUSHI_QIREN_ORIGINAL_TEXT;

const stories = [
  {
    id: "goubuli",
    sourceId: "gou-bu-li",
    title: "狗不理",
    route: `${ORIGIN}#gou-bu-li/street`,
    trigger: "#dogOriginalButton",
    chapters: ["巷口", "铺子", "制作", "经营", "名字", "远播"],
  },
  {
    id: "nirenzhang",
    sourceId: "ni-ren-zhang",
    title: "泥人张",
    route: `${ORIGIN}#ni-ren-zhang/theatre`,
    trigger: "#niRenZhangOriginalButton",
    chapters: ["天庆馆", "识人", "捏泥", "亮相", "估衣街", "结局"],
  },
  {
    id: "heitou",
    sourceId: "hei-tou",
    title: "黑头",
    route: `${ORIGIN}#heitou/street`,
    trigger: "#heitouNavOriginal",
    chapters: ["老街", "鱼头", "院落", "尾声"],
  },
];

const chineseNumbers = [
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
];

function findBrowser() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
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

async function waitForReader(page, storyId) {
  await page.waitForFunction(
    (id) => {
      const snapshot = window.OriginalReadingModal?.getSnapshot();
      return snapshot?.open === true && snapshot.activeStory === id;
    },
    storyId,
    { timeout: 8000 },
  );
  await page.waitForTimeout(320);
}

async function inspectReader(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector("#sharedOriginalReader");
    const close = dialog.querySelector(".shared-original-reader__close");
    const eyebrow = dialog.querySelector(".shared-original-reader__eyebrow");
    const title = dialog.querySelector(".shared-original-reader__title");
    const tools = dialog.querySelector(".shared-original-reader__tools");
    const progress = dialog.querySelector(".shared-original-reader__progress");
    const chapters = dialog.querySelector(".shared-original-reader__chapters");
    const text = dialog.querySelector(".shared-original-reader__text");
    const meta = dialog.querySelector(".shared-original-reader__meta");
    const returnButton = dialog.querySelector(
      ".shared-original-reader__return",
    );
    const footer = returnButton.parentElement;
    const previous = tools.querySelectorAll("button")[0];
    const next = tools.querySelectorAll("button")[1];
    const triggerBefore =
      document.querySelector("[aria-haspopup='dialog']") || null;
    const rect = dialog.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    const closeRect = close.getBoundingClientRect();
    const metaRect = meta.getBoundingClientRect();
    const returnRect = returnButton.getBoundingClientRect();
    const dialogStyle = getComputedStyle(dialog);
    const textStyle = getComputedStyle(text);
    const titleStyle = getComputedStyle(title);
    const returnStyle = getComputedStyle(returnButton);
    const sourceStyle = getComputedStyle(meta.querySelector("strong"));
    return {
      open: dialog.open,
      hash: window.location.hash,
      eyebrow: eyebrow.textContent.trim(),
      eyebrowDashWidth: getComputedStyle(eyebrow, "::before").width,
      title: title.textContent.trim(),
      titleFontFamily: titleStyle.fontFamily,
      titleFontSize: titleStyle.fontSize,
      titleLineHeight: titleStyle.lineHeight,
      dialog: {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        bottom: rect.bottom,
        padding: dialogStyle.padding,
        background: dialogStyle.backgroundColor,
        border: dialogStyle.border,
        scrollHeight: dialog.scrollHeight,
        clientHeight: dialog.clientHeight,
      },
      close: {
        width: closeRect.width,
        height: closeRect.height,
        text: close.textContent.trim(),
        border: getComputedStyle(close).border,
      },
      progress: progress.textContent.trim(),
      previousDisabled: previous.disabled,
      nextDisabled: next.disabled,
      chapters: [...chapters.querySelectorAll("button")].map((button) => ({
        text: button.textContent.trim(),
        current: button.getAttribute("aria-current") === "page",
        visible: button.offsetParent !== null,
      })),
      chaptersWrap: chapters.scrollWidth <= chapters.clientWidth + 1,
      text: {
        width: textRect.width,
        fontFamily: textStyle.fontFamily,
        fontSize: textStyle.fontSize,
        lineHeight: textStyle.lineHeight,
        textAlign: textStyle.textAlign,
        paragraphs: [...text.querySelectorAll("p")].map((paragraph) => ({
          order: Number(paragraph.dataset.originalOrder),
          text: paragraph.textContent,
          marginBottom: getComputedStyle(paragraph).marginBottom,
        })),
      },
      viewport: {
        width: innerWidth,
        height: innerHeight,
      },
      documentOverflow:
        document.documentElement.scrollWidth > innerWidth + 1,
      sourceMeta:
        dialog.querySelector(".shared-original-reader__meta strong")
          ?.textContent || "",
      sourceMetaStyle: {
        fontSize: sourceStyle.fontSize,
        fontFamily: sourceStyle.fontFamily,
        color: sourceStyle.color,
        fontWeight: sourceStyle.fontWeight,
        textAlign: sourceStyle.textAlign,
      },
      returnButton: {
        text: returnButton.textContent.trim(),
        right: returnRect.right,
        top: returnRect.top,
        width: returnRect.width,
        height: returnRect.height,
        minHeight: returnStyle.minHeight,
        padding: returnStyle.padding,
        border: returnStyle.border,
        fontFamily: returnStyle.fontFamily,
        background: returnStyle.backgroundColor,
      },
      footer: {
        display: getComputedStyle(footer).display,
        justifyContent: getComputedStyle(footer).justifyContent,
      },
      meta: {
        bottom: metaRect.bottom,
        padding: getComputedStyle(meta).padding,
        margin: getComputedStyle(meta).margin,
        borderTop: getComputedStyle(meta).borderTop,
        borderBottom: getComputedStyle(meta).borderBottom,
      },
      textRight: textRect.right,
      triggerBefore: Boolean(triggerBefore),
    };
  });
}

async function testStory(browser, story, viewport, errors, checks, detail) {
  const page = await browser.newPage({ viewport });
  observe(page, `${story.id}-${viewport.width}`, errors);
  await page.goto(story.route, { waitUntil: "networkidle" });
  const hashBefore = await page.evaluate(() => window.location.hash);
  await page.locator(story.trigger).click();
  await waitForReader(page, story.id);
  const initial = await inspectReader(page);
  const originalStory = source.stories[story.sourceId];
  const prefix = `${story.id}-${viewport.width}`;

  const checksForStory = {
    [`${prefix}-identity`]:
      initial.eyebrow === "冯骥才 · 原著阅读" &&
      initial.title === story.title,
    [`${prefix}-window`]:
      Math.abs(
        initial.dialog.width -
          Math.min(
            980,
            viewport.width - (viewport.width <= 620 ? 38 : 28),
          ),
      ) <= 1 &&
      initial.dialog.height <= viewport.height * 0.91 + 1,
    [`${prefix}-close`]:
      initial.close.text === "×" &&
      Math.abs(
        initial.close.width - (viewport.width > 620 ? 46 : 42),
      ) <= 1,
    [`${prefix}-chapters`]:
      initial.chapters.length === story.chapters.length &&
      initial.chapters.every(
        (chapter, index) =>
          chapter.text ===
          `第${chineseNumbers[index]}章 ${story.chapters[index]}`,
      ),
    [`${prefix}-paragraphs`]:
      initial.text.paragraphs.length === originalStory.paragraphs.length &&
      initial.text.paragraphs.every(
        (paragraph, index) =>
          paragraph.order === originalStory.paragraphs[index].order &&
          paragraph.text === originalStory.paragraphs[index].content,
      ),
    [`${prefix}-typography`]:
      initial.text.width <= 761 &&
      initial.text.fontFamily.includes("Noto Serif SC") &&
      initial.text.fontSize ===
        (viewport.width > 620 ? "15.04px" : "15.04px") &&
      initial.text.lineHeight ===
        (viewport.width > 620 ? "30.08px" : "30.08px") &&
      initial.text.paragraphs.slice(0, -1).every(
        (paragraph) => paragraph.marginBottom === "18.8px",
      ),
    [`${prefix}-initial-controls`]:
      initial.progress === "已读 0%" &&
      initial.previousDisabled === true &&
      initial.nextDisabled === false &&
      initial.chapters[0].current === true,
    [`${prefix}-same-story`]: initial.hash === hashBefore,
    [`${prefix}-no-overflow`]: initial.documentOverflow === false,
    [`${prefix}-footer-source`]: initial.sourceMeta === SOURCE_NOTE,
    [`${prefix}-footer-alignment`]:
      Math.abs(initial.returnButton.right - initial.textRight) <= 1 &&
      initial.footer.display === "flex" &&
      initial.footer.justifyContent === "flex-end",
    [`${prefix}-footer-spacing`]:
      Math.abs(
        initial.returnButton.top - initial.meta.bottom - 30,
      ) <= 0.1,
    [`${prefix}-return-style`]:
      initial.returnButton.text === "返回故事" &&
      initial.returnButton.minHeight === "48px" &&
      initial.returnButton.padding === "10px 20px" &&
      initial.returnButton.border === "1px solid rgb(85, 86, 76)" &&
      initial.returnButton.background === "rgba(0, 0, 0, 0)",
  };
  Object.assign(checks, checksForStory);
  Object.entries(checksForStory).forEach(([key, value]) =>
    assert.equal(value, true, `${key} assertion failed`),
  );

  const nextButton = page.locator(
    ".shared-original-reader__tools button",
  ).nth(1);
  await nextButton.click();
  await page.waitForTimeout(1000);
  const afterNext = await inspectReader(page);
  checks[`${prefix}-next`] =
    afterNext.chapters[1].current &&
    afterNext.progress !== "已读 0%" &&
    !afterNext.previousDisabled &&
    afterNext.hash === hashBefore;
  assert.equal(checks[`${prefix}-next`], true, `${prefix} next failed`);

  const chapterButtons = page.locator(
    ".shared-original-reader__chapters button",
  );
  await chapterButtons.last().click();
  await page.waitForTimeout(1000);
  const afterLast = await inspectReader(page);
  checks[`${prefix}-last-chapter`] =
    afterLast.chapters.at(-1).current &&
    afterLast.nextDisabled === true &&
    afterLast.hash === hashBefore;
  assert.equal(
    checks[`${prefix}-last-chapter`],
    true,
    `${prefix} last chapter failed`,
  );

  await page.locator("#sharedOriginalReader").evaluate((dialog) => {
    dialog.scrollTop = dialog.scrollHeight;
    dialog.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(120);
  const atEnd = await inspectReader(page);
  checks[`${prefix}-progress`] = atEnd.progress === "已读 100%";
  assert.equal(checks[`${prefix}-progress`], true, `${prefix} progress`);
  const footerScreenshot = path.join(
    ROOT,
    "output",
    `original-reader-${story.id}-${viewport.width}-footer.png`,
  );
  await page.screenshot({ path: footerScreenshot });

  await page.locator(".shared-original-reader__close").click();
  await page.waitForFunction(
    () => document.querySelector("#sharedOriginalReader")?.open === false,
  );
  const afterClose = await page.evaluate(() => ({
    hash: window.location.hash,
    active: document.activeElement?.id || "",
  }));
  checks[`${prefix}-close-return`] =
    afterClose.hash === hashBefore &&
    (story.id !== "heitou" || afterClose.active !== "");
  assert.equal(
    checks[`${prefix}-close-return`],
    true,
    `${prefix} close return`,
  );

  await page.locator(story.trigger).click();
  await waitForReader(page, story.id);
  const reopened = await inspectReader(page);
  checks[`${prefix}-reopen`] =
    reopened.progress === "已读 0%" &&
    reopened.chapters[0].current === true;
  assert.equal(checks[`${prefix}-reopen`], true, `${prefix} reopen`);
  await page.locator(".shared-original-reader__return").click();
  await page.waitForFunction(
    () => document.querySelector("#sharedOriginalReader")?.open === false,
  );
  const afterReturn = await page.evaluate((triggerSelector) => ({
    hash: window.location.hash,
    buttonVisible:
      document.querySelector(triggerSelector)?.offsetParent !== null,
  }), story.trigger);
  checks[`${prefix}-return-action`] =
    afterReturn.hash === hashBefore && afterReturn.buttonVisible;
  assert.equal(
    checks[`${prefix}-return-action`],
    true,
    `${prefix} return action`,
  );

  const screenshot = path.join(
    ROOT,
    "output",
    `original-reader-${story.id}-${viewport.width}.png`,
  );
  await page.screenshot({ path: screenshot });
  detail[`${story.id}-${viewport.width}`] = {
    initial,
    afterNext,
    afterLast,
    atEnd,
    afterClose,
    reopened,
    footerScreenshot,
    afterReturn,
    screenshot,
  };
  await page.close();
}

async function run() {
  const executablePath = findBrowser();
  assert.ok(executablePath, "No supported Chromium browser found.");
  const browser = await chromium.launch({ executablePath, headless: true });
  const errors = [];
  const checks = {};
  const detail = {};

  try {
    for (const viewport of [
      { width: 1440, height: 960 },
      { width: 390, height: 844 },
    ]) {
      for (const story of stories) {
        await testStory(browser, story, viewport, errors, checks, detail);
      }
    }

    const dogPage = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    });
    observe(dogPage, "goubuli-craft", errors);
    await dogPage.goto(`${ORIGIN}#gou-bu-li/craft`, {
      waitUntil: "networkidle",
    });
    await dogPage.evaluate(() => {
      window.dogBuLiStory.openOriginal({ stageId: "mixing" });
    });
    await waitForReader(dogPage, "goubuli");
    await dogPage.waitForTimeout(500);
    const craftReader = await inspectReader(dogPage);
    checks.CraftStageUsesSharedReader =
      craftReader.chapters[2].current &&
      craftReader.progress !== "已读 0%";
    assert.equal(checks.CraftStageUsesSharedReader, true);
    await dogPage.close();

    const sishiPage = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    });
    observe(sishiPage, "sishibayang", errors);
    await sishiPage.goto(
      `${ORIGIN}si-shi-ba-yang/index.html#sishi/chapter1`,
      { waitUntil: "networkidle" },
    );
    await sishiPage.locator("#readingEntry").click();
    await sishiPage.waitForFunction(
      () => document.querySelector("#readingDialog")?.open,
    );
    await sishiPage.waitForTimeout(320);
    const sishi = await sishiPage.evaluate(() => {
      const dialog = document.querySelector("#readingDialog");
      const text = dialog.querySelector("#readingText");
      const meta = dialog.querySelector(".reading-dialog__meta");
      const returnButton = dialog.querySelector(
        "#readingDialogConfirm",
      );
      const footer = returnButton.parentElement;
      const source = meta.querySelector("strong");
      const textRect = text.getBoundingClientRect();
      const metaRect = meta.getBoundingClientRect();
      const returnRect = returnButton.getBoundingClientRect();
      const sourceStyle = getComputedStyle(source);
      return {
        title: document.querySelector("#readingTitle").textContent.trim(),
        chapters: document.querySelectorAll(
          ".sishi-original-jumps button",
        ).length,
        paragraphs: document.querySelectorAll(
          "#readingText [data-sishi-order]",
        ).length,
        progress:
          document.querySelector(".sishi-original-dialog-tools strong")
            ?.textContent || "",
        width: dialog.getBoundingClientRect().width,
        source: source.textContent.trim(),
        sourceStyle: {
          fontSize: sourceStyle.fontSize,
          fontFamily: sourceStyle.fontFamily,
          color: sourceStyle.color,
          fontWeight: sourceStyle.fontWeight,
        },
        returnButton: {
          text: returnButton.textContent.trim(),
          right: returnRect.right,
          top: returnRect.top,
        },
        textRight: textRect.right,
        metaBottom: metaRect.bottom,
        footer: {
          display: getComputedStyle(footer).display,
          justifyContent: getComputedStyle(footer).justifyContent,
        },
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    await sishiPage.locator("#readingDialog").evaluate((dialog) => {
      dialog.scrollTop = dialog.scrollHeight;
    });
    await sishiPage.waitForTimeout(120);
    await sishiPage.screenshot({
      path: path.join(
        ROOT,
        "output",
        "original-reader-sishibayang-regression.png",
      ),
    });
    checks.SishiPreserved =
      sishi.title === "四十八样" &&
      sishi.chapters === 7 &&
      sishi.paragraphs === 34 &&
      sishi.progress === "已读 0%" &&
      Math.abs(sishi.width - 980) <= 1;
    assert.equal(checks.SishiPreserved, true);
    checks.SishiFooterUnified =
      sishi.source === SOURCE_NOTE &&
      sishi.returnButton.text === "返回故事" &&
      Math.abs(sishi.returnButton.right - sishi.textRight) <= 1 &&
      Math.abs(sishi.returnButton.top - sishi.metaBottom - 30) <= 0.1 &&
      sishi.footer.display === "flex" &&
      sishi.footer.justifyContent === "flex-end" &&
      sishi.horizontalOverflow <= 1;
    assert.equal(checks.SishiFooterUnified, true);
    const sishiHashBefore = await sishiPage.evaluate(
      () => window.location.hash,
    );
    await sishiPage.locator("#readingDialogConfirm").click();
    await sishiPage.waitForFunction(
      () => document.querySelector("#readingDialog")?.open === false,
    );
    checks.SishiReturnAction =
      (await sishiPage.evaluate(() => window.location.hash)) ===
        sishiHashBefore &&
      (await sishiPage.locator("#readingEntry").count()) === 1;
    assert.equal(checks.SishiReturnAction, true);
    await sishiPage.close();

    const protectedFiles = [
      [
        "web/si-shi-ba-yang/chapter-shell.css",
        "web__si-shi-ba-yang__chapter-shell.css",
      ],
      [
        "web/si-shi-ba-yang/chapter-shell.js",
        "web__si-shi-ba-yang__chapter-shell.js",
      ],
    ];
    checks.SishiFilesByteIdentical = protectedFiles.every(
      ([current, backup]) =>
        sha256(path.join(ROOT, current)) ===
        sha256(
          path.join(
            ROOT,
            "backups",
            "original-readers-20261116-before-unify",
            backup,
          ),
        ),
    );
    assert.equal(checks.SishiFilesByteIdentical, true);
    checks.RuntimeErrors = errors.length === 0;
    assert.equal(checks.RuntimeErrors, true);
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
