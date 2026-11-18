import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = "http://127.0.0.1:4173";
const OUTPUT = process.cwd();
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 1720, height: 967 },
  deviceScaleFactor: 1,
  hasTouch: true,
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

const browserErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});
page.on("pageerror", (error) => browserErrors.push(error.message));

async function openFish(width, height, mobile = false) {
  await page.setViewportSize({ width, height });
  await page.goto(`${ROOT}/?qa=${Date.now()}#heitou/fish`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () =>
      document.querySelector("#heiTouExperience")?.hidden === false &&
      document.querySelector("#fishCanvas")?.dataset.feedCount === "0",
  );
  if (mobile) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
}

async function screenshot(name) {
  await page.screenshot({
    path: join(OUTPUT, name),
    animations: "disabled",
    fullPage: false,
  });
}

async function center(selector) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
}

async function snapshot() {
  return page.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      };
    };
    const canvas = read("#fishCanvas");
    const dog = read("#fishDog");
    const merchant = read("#fishMerchant");
    const hand = read("#fishHandAnchor");
    const mouth = read("#fishMouthAnchor");
    const fish = read("#fishTarget");
    const drop = read("#fishDropTarget");
    const narrative = read(".fish-narrative");
    const response = read(".fish-response-sheet");
    const percentX = (value) => ((value - canvas.left) / canvas.width) * 100;
    const percentY = (value) => ((value - canvas.top) / canvas.height) * 100;
    const fishImage = document.querySelector("#fishTarget img");
    return {
      viewport: { width: innerWidth, height: innerHeight },
      canvas,
      dog,
      merchant,
      hand,
      mouth,
      fish,
      drop,
      narrative,
      response,
      dogCenter: { x: percentX(dog.centerX), y: percentY(dog.centerY) },
      merchantCenter: {
        x: percentX(merchant.centerX),
        y: percentY(merchant.centerY),
      },
      handCenter: { x: percentX(hand.centerX), y: percentY(hand.centerY) },
      mouthCenter: { x: percentX(mouth.centerX), y: percentY(mouth.centerY) },
      fishCenter: { x: percentX(fish.centerX), y: percentY(fish.centerY) },
      visibleFishWidth: fishImage.getBoundingClientRect().width,
      fishToHandDistance: Math.hypot(
        fish.centerX - hand.centerX,
        fish.centerY - hand.centerY,
      ),
      fishToMouthDistance: Math.hypot(
        fish.centerX - mouth.centerX,
        fish.centerY - mouth.centerY,
      ),
      dropToMouthDistance: Math.hypot(
        drop.centerX - mouth.centerX,
        drop.centerY - mouth.centerY,
      ),
      fishTransform: {
        x: Number(gsap.getProperty("#fishTarget", "x")),
        y: Number(gsap.getProperty("#fishTarget", "y")),
      },
      count: Number(document.querySelector("#fishCanvas").dataset.feedCount),
      countLabel: document.querySelector("#fishStepCount").textContent.trim(),
      dogState: document.querySelector("#fishCanvas").dataset.dogState,
      prompt: document.querySelector("#fishPrompt").textContent.trim(),
      response: document.querySelector("#fishResponse").textContent.trim(),
      documentOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
    };
  });
}

async function drag(from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

async function touchDrag(from, to) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: from.x, y: from.y, id: 1, radiusX: 2, radiusY: 2 },
    ],
  });
  for (let index = 1; index <= 12; index += 1) {
    const progress = index / 12;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
          id: 1,
          radiusX: 2,
          radiusY: 2,
        },
      ],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

await openFish(1720, 967);
const reference1720 = await snapshot();
await screenshot("heitou-chapter2-aligned-1720.png");

await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForTimeout(200);
const reference1366 = await snapshot();
await screenshot("heitou-chapter2-aligned-1366.png");

const fish1366 = await center("#fishTarget");
const mouth1366 = await center("#fishMouthAnchor");
await drag(fish1366, mouth1366);
await page.waitForFunction(
  () => document.querySelector("#fishCanvas")?.dataset.attemptPhase === "eating",
  null,
  { timeout: 5000 },
);
const firstFeed = await snapshot();
await page.waitForFunction(
  () => document.querySelector("#fishCanvas")?.dataset.feedCount === "1",
  null,
  { timeout: 5000 },
);

await page.waitForFunction(
  () => Math.abs(Number(gsap.getProperty("#fishTarget", "x"))) < 1,
  null,
  { timeout: 5000 },
);
const fishAgain = await center("#fishTarget");
await drag(fishAgain, { x: 30, y: 300 });
await page.waitForTimeout(550);
const missed = await snapshot();

await page.locator("#fishTarget").click();
await page.waitForFunction(
  () => document.querySelector("#fishCanvas")?.dataset.feedCount === "2",
  null,
  { timeout: 5000 },
);
await page.waitForFunction(
  () => Math.abs(Number(gsap.getProperty("#fishTarget", "x"))) < 1,
  null,
  { timeout: 5000 },
);
await page.locator("#fishTarget").click();
await page.waitForFunction(
  () => document.querySelector("#fishCanvas")?.dataset.feedCount === "3",
  null,
  { timeout: 5000 },
);
const completed = await snapshot();
await screenshot("heitou-chapter2-aligned-complete-1366.png");
await page.evaluate(() => {
  for (let index = 0; index < 5; index += 1) {
    document.querySelector("#fishTarget").click();
  }
});
await page.waitForTimeout(700);
const afterSpam = await snapshot();

await openFish(1920, 1080);
const reference1920 = await snapshot();
await screenshot("heitou-chapter2-aligned-1920.png");
const fish1920 = await center("#fishTarget");
const mouth1920 = await center("#fishMouthAnchor");
await drag(fish1920, mouth1920);
await page.waitForFunction(
  () => document.querySelector("#fishCanvas")?.dataset.feedCount === "1",
  null,
  { timeout: 5000 },
);
const fed1920 = await snapshot();

await openFish(390, 844, true);
const mobileBefore = await snapshot();
await screenshot("heitou-chapter2-aligned-mobile-390.png");
const mobileFish = await center("#fishTarget");
const mobileMouth = await center("#fishMouthAnchor");
await touchDrag(mobileFish, mobileMouth);
await page.waitForFunction(
  () => document.querySelector("#fishCanvas")?.dataset.feedCount === "1",
  null,
  { timeout: 5000 },
);
const mobileAfter = await snapshot();
await screenshot("heitou-chapter2-aligned-mobile-fed-390.png");

const sameAnchor = (snapshotValue) =>
  snapshotValue.fishToHandDistance <= 3 &&
  snapshotValue.dropToMouthDistance <= 3;
const responsiveAnchors = [reference1720, reference1366, reference1920, mobileBefore].every(
  sameAnchor,
);
const noLargeCharacterCardOverlap =
  reference1720.merchant.right - reference1720.narrative.left <=
  reference1720.narrative.width * 0.45;

const assertions = {
  merchantAtMiddleRight:
    Math.abs(reference1720.merchantCenter.x - 62) <= 1.2,
  dogAtLowerLeft:
    Math.abs(reference1720.dogCenter.x - 33) <= 1.2 &&
    reference1720.dogCenter.y >= 68 &&
    reference1720.dogCenter.y <= 86,
  dogUsesAbout65PercentScale:
    reference1720.dog.width >= 350 && reference1720.dog.width <= 370,
  merchantUsesAbout80PercentScale:
    reference1720.merchant.width >= 360 && reference1720.merchant.width <= 375,
  fishAnchoredToHand: sameAnchor(reference1720),
  mouthDropAnchoredToDog: sameAnchor(reference1720),
  anchorsSurviveViewportChanges: responsiveAnchors,
  dragWorksAt1080p: fed1920.count === 1,
  charactersHaveVisibleDragDistance:
    reference1720.fishToMouthDistance >= 70,
  storyCardAvoidsMostOfMerchant: noLargeCharacterCardOverlap,
  dragCompletesFirstFeed:
    firstFeed.dogState === "eating" && completed.count === 3,
  missReturnsSmoothlyWithoutCounting:
    missed.count === 1 &&
    Math.abs(missed.fishTransform.x) < 1 &&
    Math.abs(missed.fishTransform.y) < 1 &&
    missed.prompt.includes("回到摊上"),
  threeFeedsStillComplete:
    completed.count === 3 &&
    completed.countLabel === "3 / 3" &&
    completed.dogState === "familiar",
  completedFeedIgnoresRepeatedClicks:
    afterSpam.count === 3 && afterSpam.response === completed.response,
  mobileTouchDragStillWorks:
    mobileAfter.count === 1 && mobileAfter.documentOverflow <= 0,
  noHorizontalOverflow: [reference1720, reference1366, reference1920, mobileAfter].every(
    (state) => state.documentOverflow <= 0 && state.bodyOverflow <= 0,
  ),
  noBrowserErrors: browserErrors.length === 0,
};

const report = {
  assertions,
  reference1720,
  reference1366,
  firstFeed,
  missed,
  completed,
  afterSpam,
  reference1920,
  fed1920,
  mobileBefore,
  mobileAfter,
  browserErrors,
};

await writeFile(
  join(OUTPUT, "output", "qa-heitou-fish-alignment.json"),
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    {
      passed: Object.values(assertions).every(Boolean),
      assertions,
      browserErrors,
    },
    null,
    2,
  ),
);

await browser.close();

if (!Object.values(assertions).every(Boolean)) {
  process.exitCode = 1;
}
