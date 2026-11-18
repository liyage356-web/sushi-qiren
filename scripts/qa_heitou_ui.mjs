import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";


const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = "http://127.0.0.1:4173";
const OUTPUT_DIR = join(process.cwd(), "output");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
});

const page = await browser.newPage({
  viewport: { width: 1366, height: 900 },
  deviceScaleFactor: 1,
});

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

async function openStreet(viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${ROOT}/#heitou/street`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector("#streetExplore");
}

async function assertVisible(selector) {
  const element = page.locator(selector);
  if (!(await element.isVisible())) {
    throw new Error(`Expected ${selector} to be visible`);
  }
}

async function screenshot(name) {
  await page.screenshot({
    path: join(OUTPUT_DIR, name),
    fullPage: true,
  });
}

async function reportOverflow(label) {
  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  if (overflow.document > 1 || overflow.body > 1) {
    throw new Error(`${label} has horizontal overflow: ${JSON.stringify(overflow)}`);
  }
}

await openStreet({ width: 1366, height: 900 });
await screenshot("heitou-street-1366.png");
await reportOverflow("desktop street");

await page.locator('[data-street-object="cargo"]').click();
await assertVisible("#streetObjectNote.is-visible");
const clueCount = await page.locator("#streetClueCount").textContent();
if (!clueCount?.includes("1")) {
  throw new Error(`Expected one discovered clue, received ${clueCount}`);
}

await page.locator("#streetDogHotspot").click();
await assertVisible("#streetFocusCard");
if ((await page.locator("#streetExplore").getAttribute("data-state")) !== "focused") {
  throw new Error("Street scene did not enter focused state");
}
await screenshot("heitou-appearance-1366.png");

await page.locator("#streetFollowButton").click();
await assertVisible("#fishCanvas");
await screenshot("heitou-fish-1366.png");
await reportOverflow("desktop fish");

await page.locator("#fishTarget").click();
await page.locator("#fishTarget").click();
if ((await page.locator("#fishCanvas").getAttribute("data-fish-level")) !== "2") {
  throw new Error("Fish interaction did not advance to level 2");
}
await screenshot("heitou-fish-level2-1366.png");

await openStreet({ width: 390, height: 844 });
await screenshot("heitou-street-mobile.png");
await reportOverflow("mobile street");

await page.locator("#streetDogHotspot").click();
await assertVisible("#streetFocusCard");
await screenshot("heitou-appearance-mobile.png");
await reportOverflow("mobile appearance");

await page.locator("#streetFollowButton").click();
await assertVisible("#fishCanvas");
await screenshot("heitou-fish-mobile.png");
await reportOverflow("mobile fish");

await page.locator("#fishTarget").click();
await page.locator("#fishTarget").click();
await screenshot("heitou-fish-level2-mobile.png");
await reportOverflow("mobile fish level 2");

console.log(
  JSON.stringify(
    {
      consoleErrors,
      screenshots: [
        "heitou-street-1366.png",
        "heitou-appearance-1366.png",
        "heitou-fish-1366.png",
        "heitou-fish-level2-1366.png",
        "heitou-street-mobile.png",
        "heitou-appearance-mobile.png",
        "heitou-fish-mobile.png",
        "heitou-fish-level2-mobile.png",
      ],
    },
    null,
    2,
  ),
);

await browser.close();
