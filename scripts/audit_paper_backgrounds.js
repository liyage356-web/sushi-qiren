const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ORIGIN = process.argv[2] || "http://127.0.0.1:4180/web/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "output", "audit-paper-backgrounds.json");
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function browserExecutable() {
  const executable = BROWSERS.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

async function waitForApp(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(250);
}

async function collect(page, scenario) {
  return page.evaluate((scenarioName) => {
    const pseudo = (element, name) =>
      getComputedStyle(element, name).backgroundImage;
    const matchesTexture = (value) =>
      String(value || "").includes("paper-fibers.png");
    const selectorFor = (element) => {
      if (element.id) return `#${element.id}`;
      const classes = [...element.classList].slice(0, 4);
      return `${element.tagName.toLowerCase()}${
        classes.length ? `.${classes.join(".")}` : ""
      }`;
    };
    const elements = [document.documentElement, ...document.querySelectorAll("*")];
    const matches = [];
    for (const element of elements) {
      const style = getComputedStyle(element);
      if (
        element.hidden ||
        style.display === "none" ||
        style.visibility === "hidden"
      ) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const hit = [];
      if (matchesTexture(style.backgroundImage)) hit.push("element");
      if (matchesTexture(pseudo(element, "::before"))) hit.push("before");
      if (matchesTexture(pseudo(element, "::after"))) hit.push("after");
      if (!hit.length) continue;
      matches.push({
        selector: selectorFor(element),
        id: element.id || null,
        classes: [...element.classList],
        tag: element.tagName.toLowerCase(),
        pseudo: hit,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        areaRatio:
          Math.round(
            ((rect.width * rect.height) / (innerWidth * innerHeight)) * 1000,
          ) / 1000,
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        backgroundBlendMode: style.backgroundBlendMode,
        zIndex: style.zIndex,
        position: style.position,
      });
    }
    return {
      scenario: scenarioName,
      url: location.href,
      viewport: { width: innerWidth, height: innerHeight },
      matches,
    };
  }, scenario);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const results = [];
  const scenarios = [
    { name: "niren-observe", hash: "#ni-ren-zhang/observe" },
    { name: "niren-craft", hash: "#ni-ren-zhang/craft" },
    { name: "niren-market", hash: "#ni-ren-zhang/market" },
    { name: "niren-ending", hash: "#ni-ren-zhang/ending" },
    { name: "goubuli-street", hash: "#gou-bu-li/street" },
    { name: "goubuli-shop", hash: "#gou-bu-li/shop" },
    { name: "goubuli-craft", hash: "#gou-bu-li/craft" },
    { name: "goubuli-market", hash: "#gou-bu-li/market" },
    { name: "goubuli-name", hash: "#gou-bu-li/name" },
    { name: "goubuli-fame", hash: "#gou-bu-li/fame" },
    { name: "goubuli-reflection", hash: "#gou-bu-li/reflection" },
    { name: "archive", hash: "#archive" },
  ];

  try {
    for (const scenario of scenarios) {
      const page = await context.newPage();
      await page.goto(`${ORIGIN}index.html${scenario.hash}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForApp(page);
      results.push(await collect(page, scenario.name));
      await page.close();
    }

    const modalScenarios = [
      {
        name: "haizhangwu-viewer",
        hash: "#ni-ren-zhang/observe",
        action: async (page) => {
          const point = await page.evaluate(() => {
            const hotspot = document.querySelector("#nrSeaHotspot");
            const shape = document.querySelector("#nrSeaHotspotShape");
            const config = window.HAIZHANGWU_OVERLAY_CONFIG;
            const matrix = shape.getScreenCTM();
            const point = hotspot.createSVGPoint();
            point.x =
              config.transform.left +
              config.keypoints.find((item) => item.id === "eye").x *
                config.transform.scale;
            point.y =
              config.transform.top +
              config.keypoints.find((item) => item.id === "eye").y *
                config.transform.scale;
            const result = point.matrixTransform(matrix);
            return { x: result.x, y: result.y };
          });
          await page.mouse.click(point.x, point.y);
          await page.waitForFunction(
            () => document.querySelector("#haizhangwuViewer")?.hidden === false,
          );
        },
      },
      {
        name: "niren-original",
        hash: "#ni-ren-zhang/ending",
        action: async (page) => {
          await page.locator("#nrPageEnding [data-nr-original]").click();
          await page.waitForFunction(
            () =>
              document.querySelector("#sharedOriginalReader")?.open === true,
          );
        },
      },
      {
        name: "goubuli-original",
        hash: "#gou-bu-li/street",
        action: async (page) => {
          await page.locator("#dogPageStreet [data-dog-original]").click();
          await page.waitForFunction(
            () => document.querySelector("#sharedOriginalReader")?.open === true,
          );
        },
      },
      {
        name: "niren-clay-workshop",
        hash: "#ni-ren-zhang/craft",
        action: async (page) => {
          await page.locator("#nrOpenClayStudio").click();
          await page.waitForFunction(
            () => document.querySelector("#nrClayWorkshop")?.hidden === false,
          );
        },
      },
      {
        name: "character-modal",
        hash: "#street",
        action: async (page) => {
          await page.evaluate(() => {
            const modal = document.querySelector("#characterModal");
            modal.hidden = false;
            modal.querySelector(".modal-card")?.setAttribute(
              "data-character",
              "clay",
            );
          });
        },
      },
    ];

    for (const scenario of modalScenarios) {
      const page = await context.newPage();
      await page.goto(`${ORIGIN}index.html${scenario.hash}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForApp(page);
      await scenario.action(page);
      await page.waitForTimeout(250);
      results.push(await collect(page, scenario.name));
      await page.close();
    }

    const legacy = await context.newPage();
    await legacy.goto(`${ORIGIN}mi-ren-zhang.html`, {
      waitUntil: "domcontentloaded",
    });
    await waitForApp(legacy);
    await legacy.locator('[data-scene-go="craft"]').first().click();
    await legacy.waitForTimeout(250);
    results.push(await collect(legacy, "legacy-niren-craft"));
    await legacy.close();
  } finally {
    await context.close();
    await browser.close();
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      results.map((result) => ({
        scenario: result.scenario,
        matches: result.matches.map((match) => ({
          selector: match.selector,
          rect: match.rect,
          areaRatio: match.areaRatio,
          pseudo: match.pseudo,
        })),
      })),
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
