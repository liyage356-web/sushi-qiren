import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = "http://127.0.0.1:4173";
const OUTPUT_DIR = join(process.cwd(), "output");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BACKGROUND =
  "/images/hei-tou/reflection/morning-street-following.png";

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1720, height: 967 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const browserErrors = [];
const checks = {};

page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});
page.on("pageerror", (error) => browserErrors.push(error.message));

function check(name, passed, detail = "") {
  checks[name] = { passed: Boolean(passed), detail };
}

async function openReflection(width = 1720, height = 967) {
  await page.setViewportSize({ width, height });
  await page.goto(`${ROOT}/?qa=${Date.now()}#heitou/reflection`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () =>
      document.querySelector("#heiTouExperience")?.hidden === false &&
      document.querySelector("#storyPageReflection")?.hidden === false &&
      document.querySelector("#readingNoteLayer")?.hidden === false,
  );
}

async function snapshot() {
  return page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
        visible:
          box.width > 0 &&
          box.height > 0 &&
          getComputedStyle(element).visibility !== "hidden",
      };
    };
    const reflection = document.querySelector("#storyPageReflection");
    const style = getComputedStyle(reflection);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      route: location.hash,
      page: rect("#storyPageReflection"),
      backgroundImage: style.backgroundImage,
      backgroundColor: style.backgroundColor,
      backgroundSize: style.backgroundSize,
      backgroundPosition: style.backgroundPosition,
      backgroundRepeat: style.backgroundRepeat,
      pageZIndex: Number(style.zIndex),
      toolbar: rect(".story-toolbar"),
      navigation: rect(".story-step-nav"),
      toolbarZIndex: Number(
        getComputedStyle(document.querySelector(".story-toolbar")).zIndex,
      ),
      navigationZIndex: Number(
        getComputedStyle(document.querySelector(".story-step-nav")).zIndex,
      ),
      backVisible: rect("#storyBackButton")?.visible,
      titleVisible: rect("#heiTouExperienceTitle")?.visible,
      originalVisible: rect("#heitouNavOriginal")?.visible,
      motionVisible: rect("#storyMotionToggle")?.visible,
      soundVisible: rect("#storySoundToggle")?.visible,
      sevenChapterButtons: [
        ...document.querySelectorAll(".story-step-nav button"),
      ].map((button) => ({
        text: button.textContent.trim(),
        visible: button.getBoundingClientRect().width > 0,
      })),
      noteOpen: document.querySelector("#readingNoteLayer")?.hidden === false,
      launcherVisible:
        document.querySelector("#readingNoteLauncher")?.hidden === false,
      launcher: rect("#readingNoteLauncher"),
      launcherZIndex:
        Number(getComputedStyle(document.querySelector("#readingNoteLauncher")).zIndex) ||
        null,
      streetBackground:
        getComputedStyle(document.querySelector("#storyPageStreet"))
          .backgroundImage,
      courtyardBackground:
        getComputedStyle(document.querySelector("#storyPageCourtyard"))
          .backgroundImage,
      otherPageBackgrounds: [
        ...document.querySelectorAll("[data-story-page-panel]"),
      ]
        .filter((panel) => panel.id !== "storyPageReflection")
        .map((panel) => ({
          id: panel.id,
          backgroundImage: getComputedStyle(panel).backgroundImage,
        })),
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

async function screenshot(name) {
  await page.screenshot({
    path: join(OUTPUT_DIR, name),
    fullPage: false,
    animations: "disabled",
  });
}

await openReflection();

const imageMetadata = await page.evaluate(async (source) => {
  const image = new Image();
  image.src = source;
  await image.decode();
  return {
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    ratio: image.naturalWidth / image.naturalHeight,
  };
}, BACKGROUND);
const desktopOpen = await snapshot();

check(
  "reflectionUsesExactMorningStreetImage",
  desktopOpen.backgroundImage.includes(BACKGROUND),
  JSON.stringify(desktopOpen),
);
check(
  "backgroundCoversWithoutDistortionOrRepeat",
  desktopOpen.backgroundSize === "cover" &&
    desktopOpen.backgroundRepeat === "no-repeat" &&
    imageMetadata.naturalWidth === 1671 &&
    imageMetadata.naturalHeight === 941 &&
    Math.abs(imageMetadata.ratio - 16 / 9) < 0.01,
  JSON.stringify({ desktopOpen, imageMetadata }),
);
check(
  "backgroundFillsEntireViewport",
  Math.abs(desktopOpen.page.width - desktopOpen.viewport.width) <= 1 &&
    Math.abs(desktopOpen.page.height - desktopOpen.viewport.height) <= 1 &&
    desktopOpen.page.left === 0 &&
    desktopOpen.page.top === 0,
  JSON.stringify(desktopOpen.page),
);
check(
  "backgroundSitsBelowAllControls",
  desktopOpen.pageZIndex === 0 &&
    desktopOpen.toolbarZIndex >= 10 &&
    desktopOpen.navigationZIndex >= 10,
  JSON.stringify({
    page: desktopOpen.pageZIndex,
    toolbar: desktopOpen.toolbarZIndex,
    navigation: desktopOpen.navigationZIndex,
  }),
);
check(
  "allExistingToolbarAndSevenChapterControlsRemain",
  desktopOpen.backVisible &&
    desktopOpen.titleVisible &&
    desktopOpen.originalVisible &&
    desktopOpen.motionVisible &&
    desktopOpen.soundVisible &&
    desktopOpen.sevenChapterButtons.length === 7 &&
    desktopOpen.sevenChapterButtons.every((button) => button.visible),
  JSON.stringify(desktopOpen),
);
check(
  "onlyReflectionPageReceivesStreetBackground",
  desktopOpen.streetBackground === "none" &&
    desktopOpen.courtyardBackground === "none" &&
    desktopOpen.otherPageBackgrounds.every(
      (page) => !page.backgroundImage.includes(BACKGROUND),
    ),
  JSON.stringify(desktopOpen.otherPageBackgrounds),
);

await screenshot("heitou-reflection-note-1720.png");
await page.locator(".reading-note-close").click();
await page.waitForFunction(
  () => document.querySelector("#readingNoteLauncher")?.hidden === false,
);
const desktopClosed = await snapshot();
check(
  "closingNoteRevealsFullBackgroundAndLauncher",
  desktopClosed.noteOpen === false &&
    desktopClosed.launcherVisible &&
    desktopClosed.launcher.right <= desktopClosed.viewport.width &&
    desktopClosed.launcher.bottom <= desktopClosed.viewport.height,
  JSON.stringify(desktopClosed),
);
await screenshot("heitou-reflection-background-1720.png");

await page.locator("#heitouNavOriginal").click();
await page.waitForFunction(
  () => document.querySelector("#sharedOriginalReader")?.open === true,
);
check(
  "originalReaderStillOpensOverBackground",
  await page.evaluate(
    () =>
      document.querySelector("#sharedOriginalReader")?.open === true &&
      document.querySelector("#storyPageReflection")?.hidden === false,
  ),
);
await page.locator(".shared-original-reader__close").click();

await page.locator("#storyMotionToggle").click();
const motionOff = await page
  .locator("#storyMotionToggle")
  .getAttribute("aria-pressed");
await page.locator("#storyMotionToggle").click();
check(
  "motionToggleStillWorksWithoutLosingBackground",
  motionOff === "false" &&
    (await snapshot()).backgroundImage.includes(BACKGROUND),
);

await page.locator("#readingNoteLauncher").click();
await page.waitForFunction(
  () => document.querySelector("#readingNoteLayer")?.hidden === false,
);
await page.locator("#readingNoteText").fill("我记住了黑头站在老街里的那个背影。");
await page.locator(".reading-note-close").click();
await page.locator("#readingNoteLauncher").click();
const draftValue = await page.locator("#readingNoteText").inputValue();
check(
  "launcherReopensExistingNoteWithInputState",
  draftValue === "我记住了黑头站在老街里的那个背影。",
  draftValue,
);

await page.locator(".reading-note-close").click();
await page.locator(".story-step-nav [data-story-page='street']").click();
await page.waitForFunction(
  () => document.querySelector("#storyPageStreet")?.hidden === false,
);
const streetState = await snapshot();
check(
  "chapterSwitchLeavesOtherPagesUnchanged",
  streetState.route === "#heitou/street" &&
    streetState.streetBackground === "none" &&
    streetState.horizontalOverflow <= 1,
  JSON.stringify(streetState),
);
await page.locator(".story-step-nav [data-story-page='reflection']").click();
await page.waitForFunction(
  () => document.querySelector("#readingNoteLayer")?.hidden === false,
);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(250);
let mobileState = await snapshot();
await screenshot("heitou-reflection-note-mobile-390.png");
await page.locator(".reading-note-close").click();
await page.waitForFunction(
  () => document.querySelector("#readingNoteLauncher")?.hidden === false,
);
mobileState = await snapshot();
check(
  "mobileBackgroundAndLauncherStayWithinViewport",
  mobileState.backgroundSize === "cover" &&
    mobileState.backgroundRepeat === "no-repeat" &&
    mobileState.backgroundPosition.includes("44%") &&
    mobileState.horizontalOverflow <= 1 &&
    mobileState.launcher.right <= mobileState.viewport.width &&
    mobileState.launcher.bottom <= mobileState.viewport.height,
  JSON.stringify(mobileState),
);
await screenshot("heitou-reflection-background-mobile-390.png");

check("runtimeErrors", browserErrors.length === 0, browserErrors.join("\n"));

const failed = Object.entries(checks)
  .filter(([, result]) => !result.passed)
  .map(([name]) => name);
const report = {
  passed: failed.length === 0,
  checkCount: Object.keys(checks).length,
  failed,
  checks,
  imageMetadata,
  browserErrors,
};

await writeFile(
  join(OUTPUT_DIR, "qa-heitou-reflection-background.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    passed: report.passed,
    checkCount: report.checkCount,
    failed,
    errors: browserErrors,
    report: join(OUTPUT_DIR, "qa-heitou-reflection-background.json"),
  }),
);

await browser.close();
if (!report.passed) process.exitCode = 1;
