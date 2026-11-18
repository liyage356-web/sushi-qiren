const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const OUTPUT_DIR = path.resolve(__dirname, "..");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "output", "qa-original-readers.json");
const BROWSER_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const EXPECTED = {
  "hei-tou": {
    count: 24,
    first: "这儿说的黑头",
    last: "死还是要死在自己家里",
  },
  "ni-ren-zhang": {
    count: 12,
    first: "手艺道上的人",
    last: "传了一百多年",
  },
  "gou-bu-li": {
    count: 14,
    first: "天津人讲吃讲玩不讲穿",
    last: "名满四海，直贯当今",
  },
  "si-shi-ba-yang": {
    count: 34,
    first: "天津人灵",
    last: "长年吃俞六的药糖",
  },
};

function browserExecutable() {
  const executable = BROWSER_CANDIDATES.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

async function readParagraphs(container) {
  return container.locator("p").evaluateAll((paragraphs) =>
    paragraphs.map((paragraph) => ({
      id: paragraph.id,
      text: paragraph.textContent.trim(),
      sceneIds: paragraph.dataset.sceneIds?.split(" ").filter(Boolean) || [],
      sourceVerified: paragraph.dataset.sourceVerified === "true",
    })),
  );
}

function validateStory(storyId, paragraphs) {
  const expected = EXPECTED[storyId];
  return {
    count: paragraphs.length === expected.count,
    firstParagraph: paragraphs[0]?.text.includes(expected.first),
    lastParagraph: paragraphs.at(-1)?.text.includes(expected.last),
    stableIds: paragraphs.every(
      (paragraph, index) =>
        paragraph.id === `${storyId}-p${String(index + 1).padStart(2, "0")}`,
    ),
    sourceVerified: paragraphs.every((paragraph) => paragraph.sourceVerified),
    uniqueContent:
      new Set(paragraphs.map((paragraph) => paragraph.text)).size ===
      paragraphs.length,
  };
}

async function collectLayout(locator) {
  return locator.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowY: getComputedStyle(element).overflowY,
  }));
}

async function verifyHeiTou(page, viewportName) {
  await page.goto(`${PAGE_ORIGIN}index.html#street`, {
    waitUntil: "networkidle",
  });
  await page.locator('.scene-hotspot[data-character="heitou"]').click();
  await page.waitForFunction(
    () => !document.querySelector("#heiTouExperience")?.hidden,
  );
  await page.locator("#heitouNavOriginal").click();
  const reader = page.locator("#sharedOriginalReader");
  const paragraphs = await readParagraphs(
    page.locator(".shared-original-reader__text"),
  );
  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      `original-reader-hei-tou-${viewportName}-top.png`,
    ),
  });
  await page
    .locator(".shared-original-reader__text p")
    .last()
    .scrollIntoViewIfNeeded();
  const layout = await collectLayout(reader);
  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      `original-reader-hei-tou-${viewportName}-end.png`,
    ),
  });
  await page.locator(".shared-original-reader__close").click();
  return {
    ...validateStory("hei-tou", paragraphs),
    layout,
    lastParagraphReachable:
      (await page
        .locator(".shared-original-reader__text p")
        .last()
        .isVisible()) &&
      (await page
        .locator(".shared-original-reader__text p")
        .last()
        .boundingBox()) !== null,
    closedBackToStory:
      (await page.locator("#sharedOriginalReader").isHidden()) &&
      (await page.locator("#heiTouExperience").isVisible()),
  };
}

async function verifyNiRenZhang(page, viewportName) {
  await page.goto(`${PAGE_ORIGIN}index.html`, { waitUntil: "networkidle" });
  await page.evaluate(() =>
    window.niRenZhangStory.open("restaurant", false),
  );
  await page.locator("#niRenZhangOriginalButton").click();
  const sheet = page.locator("#sharedOriginalReader");
  const paragraphs = await readParagraphs(
    page.locator(".shared-original-reader__text"),
  );
  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      `original-reader-ni-ren-zhang-${viewportName}-top.png`,
    ),
  });
  await page
    .locator(".shared-original-reader__text p")
    .last()
    .scrollIntoViewIfNeeded();
  const layout = await collectLayout(sheet);
  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      `original-reader-ni-ren-zhang-${viewportName}-end.png`,
    ),
  });
  await page.locator(".shared-original-reader__close").click();
  return {
    ...validateStory("ni-ren-zhang", paragraphs),
    layout,
    closedBackToStory:
      (await page.locator("#sharedOriginalReader").isHidden()) &&
      (await page.locator("#niRenZhangExperience").isVisible()),
  };
}

async function verifyGouBuLi(page, viewportName) {
  await page.goto(`${PAGE_ORIGIN}index.html`, { waitUntil: "networkidle" });
  await page.evaluate(() => window.dogBuLiStory.open("street", false));
  await page.locator("#dogOriginalButton").click();
  const sheet = page.locator("#sharedOriginalReader");
  const paragraphs = await readParagraphs(
    page.locator(".shared-original-reader__text"),
  );
  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      `original-reader-gou-bu-li-${viewportName}-top.png`,
    ),
  });
  await page
    .locator(".shared-original-reader__text p")
    .last()
    .scrollIntoViewIfNeeded();
  const layout = await collectLayout(sheet);
  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      `original-reader-gou-bu-li-${viewportName}-end.png`,
    ),
  });
  await page.locator(".shared-original-reader__close").click();
  await page.evaluate(() =>
    window.dogBuLiStory.openOriginal({ stageId: "mixing" }),
  );
  const stageHeading = await page
    .locator(
      '.shared-original-reader__chapters button[aria-current="page"]',
    )
    .textContent();
  const stageAnchor = await page
    .locator(".shared-original-reader__text p[data-scene-ids~='craft']")
    .first()
    .getAttribute("id");
  await page.locator(".shared-original-reader__close").click();
  return {
    ...validateStory("gou-bu-li", paragraphs),
    layout,
    craftContextTitle: stageHeading.includes("制作"),
    craftAnchor: stageAnchor === "gou-bu-li-p05",
    closedBackToStory:
      (await page.locator("#sharedOriginalReader").isHidden()) &&
      (await page.locator("#dogBuLiExperience").isVisible()),
  };
}

async function verifySiShiBaYang(page, viewportName) {
  await page.goto(`${PAGE_ORIGIN}si-shi-ba-yang/index.html`, {
    waitUntil: "networkidle",
  });
  await page.locator("#readingEntry").click();
  const dialog = page.locator("#readingDialog");
  const paragraphs = await readParagraphs(page.locator("#readingText"));
  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      `original-reader-si-shi-ba-yang-${viewportName}-top.png`,
    ),
  });
  await page.locator("#readingText p").last().scrollIntoViewIfNeeded();
  const layout = await collectLayout(dialog);
  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      `original-reader-si-shi-ba-yang-${viewportName}-end.png`,
    ),
  });
  await page.locator("#readingDialogConfirm").click();
  return {
    ...validateStory("si-shi-ba-yang", paragraphs),
    layout,
    closedBackToStory: await dialog.evaluate((element) => !element.open),
  };
}

async function runViewport(browser, name, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: name === "mobile" ? 2 : 1,
    isMobile: name === "mobile",
    hasTouch: name === "mobile",
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const results = {
    heiTou: await verifyHeiTou(page, name),
    niRenZhang: await verifyNiRenZhang(page, name),
    gouBuLi: await verifyGouBuLi(page, name),
    siShiBaYang: await verifySiShiBaYang(page, name),
  };
  const noHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= innerWidth + 1,
  );
  await context.close();
  return { results, noHorizontalOverflow, pageErrors, consoleErrors };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const desktop = await runViewport(browser, "desktop", {
    width: 2474,
    height: 1367,
  });
  const mobile = await runViewport(browser, "mobile", {
    width: 390,
    height: 844,
  });
  await browser.close();

  const allResults = [desktop, mobile];
  const checks = {};
  for (const [storyName, storyKey] of [
    ["黑头", "heiTou"],
    ["泥人张", "niRenZhang"],
    ["狗不理", "gouBuLi"],
    ["四十八样", "siShiBaYang"],
  ]) {
    const storyChecks = allResults.map((result) => result.results[storyKey]);
    checks[storyName] = {
      paragraphCount: storyChecks.every((item) => item.count),
      correctFirstParagraph: storyChecks.every(
        (item) => item.firstParagraph,
      ),
      correctLastParagraph: storyChecks.every(
        (item) => item.lastParagraph,
      ),
      stableParagraphIds: storyChecks.every((item) => item.stableIds),
      sourceVerified: storyChecks.every((item) => item.sourceVerified),
      noDuplicateContent: storyChecks.every((item) => item.uniqueContent),
      readableLayout: storyChecks.every(
        (item) =>
          item.layout.scrollHeight <= item.layout.clientHeight ||
          ["auto", "scroll"].includes(item.layout.overflowY),
      ),
      noHorizontalTextOverflow: storyChecks.every(
        (item) => item.layout.scrollWidth <= item.layout.clientWidth + 1,
      ),
      closeReturnsToStory: storyChecks.every(
        (item) => item.closedBackToStory !== false,
      ),
    };
  }
  checks.craftContextUsesMixingParagraph = allResults.every(
    (result) =>
      result.results.gouBuLi.craftContextTitle &&
      result.results.gouBuLi.craftAnchor,
  );
  checks.noHorizontalPageOverflow = allResults.every(
    (result) => result.noHorizontalOverflow,
  );
  checks.noBrowserErrors = allResults.every(
    (result) =>
      result.pageErrors.length === 0 && result.consoleErrors.length === 0,
  );

  const output = {
    generatedAt: new Date().toISOString(),
    pageOrigin: PAGE_ORIGIN,
    checks,
    desktop,
    mobile,
  };
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2));
  console.log(JSON.stringify({ checks }, null, 2));
  if (
    Object.values(checks).some((value) =>
      typeof value === "object"
        ? Object.values(value).some((item) => !item)
        : !value,
    )
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
