const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ORIGIN = process.argv[2] || "http://127.0.0.1:4180/web/";
const PREFIX = process.argv[3] || "before";
const ROOT = path.resolve(__dirname, "..");
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

async function prepare(page, hash) {
  await page.goto(`${ORIGIN}index.html${hash}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(260);
}

async function capture(page, name) {
  const filename = `paper-background-${PREFIX}-${name}-1440x900.png`;
  await page.screenshot({
    path: path.join(ROOT, filename),
    fullPage: false,
  });
  return filename;
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
  const screenshots = [];
  try {
    {
      const page = await context.newPage();
      await prepare(page, "#ni-ren-zhang/observe");
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
      await page.waitForTimeout(450);
      screenshots.push(await capture(page, "haizhangwu-viewer"));
      await page.close();
    }

    {
      const page = await context.newPage();
      await prepare(page, "#ni-ren-zhang/craft");
      await page.locator("#nrOpenClayStudio").click();
      await page.waitForFunction(
        () => document.querySelector("#nrClayWelcome")?.hidden === false,
      );
      await page.waitForTimeout(250);
      screenshots.push(await capture(page, "clay-welcome"));
      await page.close();
    }

    {
      const page = await context.newPage();
      await prepare(page, "#ni-ren-zhang/ending");
      await page.locator("#nrPageEnding [data-nr-original]").click();
      await page.waitForFunction(
        () => document.querySelector("#sharedOriginalReader")?.open === true,
      );
      await page.waitForTimeout(300);
      screenshots.push(await capture(page, "original-reader"));
      await page.close();
    }

    {
      const page = await context.newPage();
      await prepare(page, "#street");
      await page.evaluate(() => {
        const modal = document.querySelector("#characterModal");
        modal.hidden = false;
        modal.querySelector(".modal-card")?.setAttribute(
          "data-character",
          "clay",
        );
      });
      await page.waitForTimeout(180);
      screenshots.push(await capture(page, "character-modal"));
      await page.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }
  console.log(JSON.stringify({ prefix: PREFIX, screenshots }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
