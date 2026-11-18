const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 960 },
  { name: "wide-1920", width: 1920, height: 1080 },
  { name: "mobile-390", width: 390, height: 844 },
];
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

async function openFollow(page) {
  await page.goto(`${ORIGIN}#heitou/follow`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#storyPageFollow")?.hidden === false &&
      window.heiTouFollow?.getSnapshot().active === true,
  );
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("#heiTouFollow img")].every(
        (image) => image.complete,
      ),
    { timeout: 30000 },
  );
  await page.waitForFunction(
    () => window.heiTouFollow?.getSnapshot().ready === true,
    { timeout: 4000 },
  );
  await page.waitForTimeout(850);
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge/Chrome executable found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const captures = [];

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.name.startsWith("mobile"),
      hasTouch: viewport.name.startsWith("mobile"),
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await openFollow(page);

    for (const percent of [0, 25, 50, 75]) {
      const state = await page.evaluate((targetPercent) => {
        const endZ = 56.5;
        const playerZ = endZ * (targetPercent / 100);
        window.heiTouFollow.setProgress(playerZ);
        return window.heiTouFollow.getSnapshot();
      }, percent);
      await page.waitForTimeout(180);
      if (percent > 0) {
        await page.evaluate(() => {
          document.querySelector("#followCanvas")?.classList.add("has-started");
          document
            .querySelector("#followIntro")
            ?.classList.remove("is-visible");
          document
            .querySelector("#followNarration")
            ?.classList.remove("is-visible");
        });
        await page.waitForTimeout(850);
      }
      const file = path.join(
        ROOT,
        `heitou-follow-${viewport.name}-${String(percent).padStart(3, "0")}.png`,
      );
      await page.screenshot({ path: file, fullPage: false });
      captures.push({ viewport: viewport.name, percent, file, state });
    }

    await page.evaluate(() => window.heiTouFollow.complete());
    await page.waitForTimeout(1080);
    await page.addStyleTag({
      content: `
        .follow-arrival {
          visibility: visible !important;
          opacity: 1 !important;
          animation: none !important;
        }
        .follow-camera {
          opacity: 0 !important;
          animation: none !important;
        }
      `,
    });
    await page.waitForTimeout(120);
    const arrivalFile = path.join(
      ROOT,
      `heitou-follow-${viewport.name}-100.png`,
    );
    const arrival = await page.evaluate(() => {
      const scene = document.querySelector(".follow-arrival-scene");
      const background = document.querySelector(".follow-arrival-bg");
      const person = document.querySelector(".follow-arrival-shang");
      const gate = document.querySelector("#followArrival");
      return {
        visible:
          gate?.getAttribute("aria-hidden") === "false" &&
          getComputedStyle(gate).visibility !== "hidden",
        viewport: {
          width: innerWidth,
          height: innerHeight,
        },
        scene: scene
          ? {
              width: scene.getBoundingClientRect().width,
              height: scene.getBoundingClientRect().height,
            }
          : null,
        background: background
          ? {
              naturalWidth: background.naturalWidth,
              naturalHeight: background.naturalHeight,
            }
          : null,
        person: person
          ? {
              width: person.getBoundingClientRect().width,
              height: person.getBoundingClientRect().height,
            }
          : null,
      };
    });
    await page.screenshot({ path: arrivalFile, fullPage: false });
    captures.push({
      viewport: viewport.name,
      percent: 100,
      file: arrivalFile,
      state: arrival,
    });
    await context.close();
  }

  await browser.close();
  const reportFile = path.join(
    ROOT,
    "output",
    "heitou-follow-progress-captures.json",
  );
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(
    reportFile,
    `${JSON.stringify({ captures }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ captures, report: reportFile }));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
