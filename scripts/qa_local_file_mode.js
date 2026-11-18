const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const REPORT = path.join(ROOT, "output", "qa-local-file-mode.json");
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const ROUTES = [
  ["首页", "web/index.html"],
  ["黑头", "web/index.html#heitou/street"],
  ["狗不理", "web/index.html#gou-bu-li/street"],
  ["泥人张", "web/index.html#ni-ren-zhang/prelude"],
  ["四十八样", "web/si-shi-ba-yang/index.html#sishi/chapter1"],
  ["走八字", "web/si-shi-ba-yang/index.html#sishi/chapter4"],
  ["旧版泥人张", "web/mi-ren-zhang.html"],
  ["旧版狗不理", "web/gou-bu-li/index.html#street"],
];

async function run() {
  const executablePath = BROWSERS.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!executablePath) throw new Error("No installed Edge or Chrome found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const results = [];
  for (const [name, relativePath] of ROUTES) {
    const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
    });
    const requestFailures = [];
    const pageErrors = [];
    page.on("requestfailed", (request) =>
      requestFailures.push(request.url()),
    );
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const hashIndex = relativePath.indexOf("#");
    const filename =
      hashIndex >= 0 ? relativePath.slice(0, hashIndex) : relativePath;
    const hash = hashIndex >= 0 ? relativePath.slice(hashIndex) : "";
    const url = `${pathToFileURL(path.join(ROOT, filename)).href}${hash}`;
    let navigationError = null;
    try {
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(1000);
    } catch (error) {
      navigationError = error.message;
    }
    const state = await page
      .evaluate(() => ({
        title: document.title,
        fontsStatus: document.fonts?.status || "unavailable",
        brokenVisibleImages: [...document.images]
          .filter(
            (image) =>
              image.complete &&
              image.naturalWidth === 0 &&
              image.getBoundingClientRect().width > 0,
          )
          .map((image) => image.currentSrc || image.getAttribute("src")),
      }))
      .catch((error) => ({ evaluationError: error.message }));
    results.push({
      name,
      url,
      navigationError,
      requestFailures,
      pageErrors,
      state,
      passed:
        !navigationError &&
        !pageErrors.length &&
        !requestFailures.length &&
        !state.evaluationError &&
        !state.brokenVisibleImages?.length &&
        state.fontsStatus !== "loading",
    });
    await page.close();
  }
  await browser.close();

  const failed = results.filter((result) => !result.passed);
  const report = {
    passed: failed.length === 0,
    routeCount: results.length,
    failedCount: failed.length,
    failed,
    results,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        routeCount: report.routeCount,
        failedCount: report.failedCount,
        failed,
        report: REPORT,
      },
      null,
      2,
    ),
  );
  if (!report.passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
