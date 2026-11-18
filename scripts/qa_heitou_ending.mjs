import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = "http://127.0.0.1:4173";
const OUTPUT_DIR = join(process.cwd(), "output");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const expected = [
  {
    source: "/images/hei-tou/epilogue/hei-tou-returns.png",
    title: "尾声",
    description:
      "又过两天，西边的房顶已经铺好苇耙，开始上泥铺瓦。院门敞着，黑头忽然出现在门口。这时候，商大爷去隆昌上班了，工人都盯着手里的活，谁也没注意到它。",
  },
  {
    source: "/images/hei-tou/epilogue/hei-tou-in-mud.png",
    title: "尾声",
    description:
      "黑头两眼扫一下院子，看见中间有一堆和好的稀泥，突然它腿一使劲，朝那堆稀泥猛冲过去，“噗”地一头扎进泥里，用劲过猛，只剩下后腿和尾巴留在外边。这一切没人瞧见。",
  },
  {
    source: "/images/hei-tou/epilogue/hei-tou-found.png",
    title: "尾声",
    description:
      "待商大爷下晌回来，工人收工时，有人发现这泥里毛糊糊的东西是嘛呢，拉出来一看，大惊失色，原来是黑头，早断了气，身子都有点发硬了。它怎么死在这儿，嘛时候死的，是邻居那家弄死后塞在这儿的吗？",
  },
  {
    source: "/images/hei-tou/epilogue/hei-tou-found.png",
    title: "面子，归属",
    description:
      "大伙猜了半天说了半天，谁也说不清楚。半天没说话的商大爷的一句话，把这事说明白了：“我明白它，它比我还要面子，它这是自我了结。”随后又感慨地说，“唉，死还是要死在自己家里。”",
  },
];

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

async function openEnding(width = 1720, height = 967) {
  await page.setViewportSize({ width, height });
  await page.goto(`${ROOT}/?qa=${Date.now()}#heitou/ending`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () =>
      document.querySelector("#heiTouExperience")?.hidden === false &&
      document.querySelector("#storyPageEnding")?.hidden === false &&
      document.querySelector("#epilogueScene")?.dataset.epilogueStep === "0",
  );
}

async function snapshot() {
  return page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };
    const scene = document.querySelector("#epilogueScene");
    const card = document.querySelector("#epilogueCopy");
    const cardStyle = getComputedStyle(card);
    const images = [...document.querySelectorAll(".epilogue-background")].map(
      (image) => {
        const style = getComputedStyle(image);
        return {
          source: image.src ? decodeURIComponent(new URL(image.src).pathname) : "",
          current: image.classList.contains("is-current"),
          opacity: Number(style.opacity),
          objectFit: style.objectFit,
          objectPosition: style.objectPosition,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        };
      },
    );
    const currentImage = images.find((image) => image.current);
    const nav = rect(".story-step-nav");
    const sceneRect = rect("#epilogueScene");
    const cardRect = rect("#epilogueCopy");
    const actionRects = [
      ...document.querySelectorAll("#epilogueActions button"),
    ].map((button) => {
      const box = button.getBoundingClientRect();
      return {
        text: button.textContent.trim(),
        hidden: button.closest("[hidden]") !== null,
        width: box.width,
        height: box.height,
      };
    });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      route: location.hash,
      step: Number(scene.dataset.epilogueStep),
      busy: scene.classList.contains("is-busy"),
      title: document.querySelector("#endingPageTitle")?.textContent.trim(),
      description: document
        .querySelector("#epilogueDescription")
        ?.textContent.trim(),
      eyebrow: document.querySelector("#epilogueEyebrow")?.textContent.trim(),
      actionsHidden: document.querySelector("#epilogueActions")?.hidden,
      promptHidden: document.querySelector("#epiloguePrompt")?.hidden,
      scene: sceneRect,
      nav,
      card: cardRect,
      cardRatio: cardRect.width / sceneRect.width,
      cardBackground: cardStyle.backgroundColor,
      cardColor: cardStyle.color,
      images,
      currentImage,
      actionRects,
      originalReaderRemoved: !document.querySelector(
        "#storyPageEnding .original-text, #storyPageEnding .reading-sheet",
      ),
      currentNav: document
        .querySelector(".story-step-nav [aria-current='page'] strong")
        ?.textContent.trim(),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

async function clickScene() {
  const box = await page.locator("#epilogueScene").boundingBox();
  await page.mouse.click(
    box.x + box.width * 0.82,
    box.y + Math.min(box.height * 0.2, 110),
  );
}

async function waitForStep(step) {
  await page.waitForFunction(
    (expectedStep) =>
      document.querySelector("#epilogueScene")?.dataset.epilogueStep ===
        String(expectedStep) &&
      !document.querySelector("#epilogueScene")?.classList.contains("is-busy"),
    step,
    { timeout: 4000 },
  );
}

async function screenshot(name) {
  await page.screenshot({
    path: join(OUTPUT_DIR, name),
    fullPage: false,
    animations: "disabled",
  });
}

await context.addInitScript(() => localStorage.clear());
await openEnding();

const stage0 = await snapshot();
check(
  "entersDirectlyAtStageOneWithReturnScene",
  stage0.step === 0 &&
    stage0.title === expected[0].title &&
    stage0.description === expected[0].description &&
    stage0.currentImage?.source === expected[0].source,
  JSON.stringify(stage0),
);
check(
  "sceneStartsBelowChapterNavigation",
  stage0.scene.top >= stage0.nav.bottom,
  JSON.stringify({ scene: stage0.scene, nav: stage0.nav }),
);
check(
  "warmPaperNarrativeCardUsesAboutOneThird",
  stage0.cardRatio >= 0.3 &&
    stage0.cardRatio <= 0.34 &&
    stage0.cardBackground.includes("243, 238, 228"),
  JSON.stringify({
    ratio: stage0.cardRatio,
    background: stage0.cardBackground,
  }),
);
check(
  "longOriginalReadingPanelRemoved",
  stage0.originalReaderRemoved,
  String(stage0.originalReaderRemoved),
);
check(
  "firstThreeStagesShowReadingPrompt",
  stage0.promptHidden === false,
);
check(
  "imagesRemainSixteenByNine",
  stage0.images
    .filter((image) => image.naturalWidth)
    .every(
      (image) =>
        Math.abs(image.naturalWidth / image.naturalHeight - 16 / 9) < 0.01 &&
        image.objectFit === "cover",
    ),
  JSON.stringify(stage0.images),
);
await screenshot("heitou-ending-stage1-1720.png");

await page.locator("#epilogueCopyContent").click();
await page.waitForTimeout(850);
check(
  "clickingNarrativeCardDoesNotAdvance",
  (await snapshot()).step === 0,
);

await page.locator(".story-step-nav [data-story-page='ending']").click();
await page.waitForTimeout(850);
check(
  "clickingChapterNavigationDoesNotAdvance",
  (await snapshot()).step === 0,
);

await page.locator("#heitouNavOriginal").click();
await page.waitForFunction(
  () => document.querySelector("#sharedOriginalReader")?.open === true,
);
const stageAfterReader = await snapshot();
const originalReaderParagraphs = await page
  .locator(".shared-original-reader__text > p")
  .count();
check(
  "topOriginalReaderKeepsAllParagraphsWithoutAdvancing",
  stageAfterReader.step === 0 && originalReaderParagraphs === 24,
  JSON.stringify({ stageAfterReader, originalReaderParagraphs }),
);
await page.locator(".shared-original-reader__close").click();

await page.locator("#storyMotionToggle").click();
const motionStep = (await snapshot()).step;
await page.locator("#storyMotionToggle").click();
await page.locator("#storySoundToggle").click();
const toolbarStep = (await snapshot()).step;
await page.locator("#storySoundToggle").click();
check(
  "toolbarTogglesDoNotAdvanceStory",
  motionStep === 0 && toolbarStep === 0,
);

await clickScene();
await page.waitForTimeout(80);
await clickScene();
await clickScene();
await waitForStep(1);
const stage1 = await snapshot();
check(
  "rapidClicksCannotSkipFirstTransition",
  stage1.step === 1,
);
check(
  "firstClickShowsDogInMud",
  stage1.currentImage?.source === expected[1].source &&
    stage1.description === expected[1].description,
  JSON.stringify(stage1),
);

await clickScene();
await waitForStep(2);
const stage2 = await snapshot();
check(
  "secondClickShowsDiscovery",
  stage2.currentImage?.source === expected[2].source &&
    stage2.description === expected[2].description,
  JSON.stringify(stage2),
);

await clickScene();
await waitForStep(3);
const stage3 = await snapshot();
check(
  "thirdClickShowsFinaleOnSameDiscoveryScene",
  stage3.currentImage?.source === expected[3].source &&
    stage3.description === expected[3].description,
  JSON.stringify(stage3),
);

await clickScene();
await page.waitForTimeout(900);
const stage4 = await snapshot();
check(
  "fourthStepKeepsDiscoveryAndShowsFinale",
  stage4.step === 3 &&
    stage4.currentImage?.source === expected[3].source &&
    stage4.title === expected[3].title &&
    stage4.description === expected[3].description &&
    stage4.actionsHidden === false &&
    stage4.promptHidden === true,
  JSON.stringify(stage4),
);
check(
  "allFourNarrativesAreExact",
  [stage0, stage1, stage2, stage4].every(
    (stage, index) => stage.description === expected[index].description,
  ),
);
check(
  "finalActionsAreUsable",
  stage4.actionRects.length === 2 &&
    stage4.actionRects.every(
      (action) =>
        !action.hidden && action.width >= 120 && action.height >= 44,
    ),
  JSON.stringify(stage4.actionRects),
);
await clickScene();
await page.waitForTimeout(900);
check(
  "finalStageIgnoresFurtherSceneClicks",
  (await snapshot()).step === 3,
);
await screenshot("heitou-ending-stage4-1720.png");

await page.locator("#epilogueActions [data-story-page='reflection']").click();
await page.waitForFunction(
  () =>
    document.querySelector("#storyPageReflection")?.hidden === false &&
    document.querySelector("#readingNoteLayer")?.hidden === false,
);
check(
  "readingNoteActionOpensExistingReflection",
  await page.evaluate(
    () =>
      window.ReadingReflectionModal.getSnapshot().activeStoryId === "heitou" &&
      window.ReadingReflectionModal.getSnapshot().open === true,
  ),
);
await page.getByRole("button", { name: "返回上一章节" }).click();
await page.waitForFunction(
  () =>
    document.querySelector("#storyPageEnding")?.hidden === false &&
    document.querySelector("#epilogueScene")?.dataset.epilogueStep === "0",
);
check(
  "reenteringEndingResetsToStageOne",
  (await snapshot()).step === 0,
);

await clickScene();
await waitForStep(1);
await clickScene();
await waitForStep(2);
await clickScene();
await waitForStep(3);
await clickScene();
await page.waitForTimeout(900);
await page.locator("#epilogueActions [data-story-page='courtyard']").click();
await page.waitForFunction(
  () =>
    document.querySelector("#storyPageCourtyard")?.hidden === false &&
    document.querySelector("#yardCanvas")?.dataset.yardState === "follow",
);
check(
  "returnCourtyardActionRestoresStartingScene",
  await page.evaluate(
    () =>
      document.querySelector("#yardCanvas")?.dataset.yardState === "follow" &&
      document.querySelector("#yardSceneStack")?.getAttribute("aria-label")
        .includes("院门紧闭"),
  ),
);

await page.locator(".story-step-nav [data-story-page='ending']").click();
await page.waitForFunction(
  () => document.querySelector("#epilogueScene")?.dataset.epilogueStep === "0",
);
await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForTimeout(250);
const desktop1366 = await snapshot();
check(
  "laptopUsesNoHorizontalOverflow",
  desktop1366.horizontalOverflow <= 1 &&
    desktop1366.card.bottom <= desktop1366.scene.bottom + 1,
  JSON.stringify(desktop1366),
);
await screenshot("heitou-ending-stage1-1366.png");

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(
  () => document.querySelector("#epilogueScene")?.dataset.epilogueStep === "0",
);
const mobileStage0 = await snapshot();
await screenshot("heitou-ending-stage1-mobile-390.png");
await clickScene();
await waitForStep(1);
await clickScene();
await waitForStep(2);
await clickScene();
await waitForStep(3);
await clickScene();
await page.waitForTimeout(900);
const mobileStage4 = await snapshot();
check(
  "mobileCardAndFinalButtonsStayInsideScene",
  mobileStage0.horizontalOverflow <= 1 &&
    mobileStage4.horizontalOverflow <= 1 &&
    mobileStage4.card.right <= mobileStage4.scene.right + 1 &&
    mobileStage4.actionRects.every(
      (action) =>
        !action.hidden && action.width >= 110 && action.height >= 44,
    ),
  JSON.stringify({ mobileStage0, mobileStage4 }),
);
await screenshot("heitou-ending-stage4-mobile-390.png");

check("runtimeErrors", browserErrors.length === 0, browserErrors.join("\n"));

const failed = Object.entries(checks)
  .filter(([, result]) => !result.passed)
  .map(([name]) => name);
const report = {
  passed: failed.length === 0,
  checkCount: Object.keys(checks).length,
  failed,
  checks,
  browserErrors,
};

await writeFile(
  join(OUTPUT_DIR, "qa-heitou-ending.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    passed: report.passed,
    checkCount: report.checkCount,
    failed,
    errors: browserErrors,
    report: join(OUTPUT_DIR, "qa-heitou-ending.json"),
  }),
);

await browser.close();
if (!report.passed) process.exitCode = 1;
