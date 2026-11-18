const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-project-runtime-audit.json");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const routes = [
  ["首页", ""],
  ["天津老街", "#street"],
  ["人物档案", "#archive"],
  ["黑头-街景", "#heitou/street"],
  ["黑头-鱼铺", "#heitou/fish"],
  ["黑头-院落", "#heitou/courtyard"],
  ["黑头-守护", "#heitou/guardian"],
  ["黑头-原文", "#heitou/ending"],
  ["黑头-读后", "#heitou/reflection"],
  ["狗不理-巷口", "#gou-bu-li/street"],
  ["狗不理-铺子", "#gou-bu-li/shop"],
  ["狗不理-制作", "#gou-bu-li/craft"],
  ["狗不理-经营", "#gou-bu-li/market"],
  ["狗不理-名字", "#gou-bu-li/name"],
  ["狗不理-远播", "#gou-bu-li/fame"],
  ["狗不理-读后", "#gou-bu-li/reflection"],
  ["泥人张-序章", "#ni-ren-zhang/prelude"],
  ["泥人张-天庆馆", "#ni-ren-zhang/restaurant"],
  ["泥人张-识人", "#ni-ren-zhang/observe"],
  ["泥人张-捏泥", "#ni-ren-zhang/craft"],
  ["泥人张-亮相", "#ni-ren-zhang/reveal"],
  ["泥人张-估衣街", "#ni-ren-zhang/market"],
  ["泥人张-结局", "#ni-ren-zhang/ending"],
  ["泥人张-读后", "#ni-ren-zhang/reflection"],
  ["四十八样-封面", "si-shi-ba-yang/"],
  ...Array.from({ length: 7 }, (_, index) => [
    `四十八样-第${index + 1}章`,
    `si-shi-ba-yang/#sishi/chapter${index + 1}`,
  ]),
  ["旧版狗不理入口", "gou-bu-li/index.html#street"],
  ["旧版泥人张入口", "mi-ren-zhang.html"],
];

async function run() {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const results = [];
  let activeRoute = "";
  let pageErrors = [];
  let consoleErrors = [];
  let requestFailures = [];
  let badResponses = [];

  page.on("pageerror", (error) => {
    pageErrors.push(`${activeRoute}: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push({
        route: activeRoute,
        text: message.text(),
        url: message.location()?.url || "",
      });
    }
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({
      route: activeRoute,
      url: request.url(),
      failure: request.failure()?.errorText || "unknown",
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      badResponses.push({
        route: activeRoute,
        status: response.status(),
        url: response.url(),
      });
    }
  });

  for (const [name, suffix] of routes) {
    activeRoute = name;
    pageErrors = [];
    consoleErrors = [];
    requestFailures = [];
    badResponses = [];
    const url = `${ORIGIN}${suffix}`;
    let navigationError = null;
    try {
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      await page.waitForTimeout(250);
    } catch (error) {
      navigationError = error.message;
    }
    const state = await page
      .evaluate(() => {
        const visible = (selector) => {
          const element = document.querySelector(selector);
          return Boolean(
            element &&
              !element.hidden &&
              getComputedStyle(element).display !== "none" &&
              element.getBoundingClientRect().width > 0,
          );
        };
        const images = [...document.images];
        const brokenImages = images
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => ({
            source: image.currentSrc || image.getAttribute("src"),
            alt: image.alt || "",
            visible: image.getBoundingClientRect().width > 0,
          }));
        return {
          url: location.href,
          title: document.title,
          sishiPage: document.body.dataset.sishiPage || null,
          heiTouVisible: visible("#heiTouExperience"),
          gouBuLiVisible: visible("#dogBuLiExperience"),
          niRenZhangVisible: visible("#niRenZhangExperience"),
          imageCount: images.length,
          brokenImages,
          audioElements: [...document.querySelectorAll("audio")].map((audio) => ({
            source:
              audio.currentSrc || audio.querySelector("source")?.src || "",
            error:
              audio.error?.message ||
              (audio.error ? `MediaError ${audio.error.code}` : null),
          })),
          fontsStatus: document.fonts?.status || "unavailable",
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        };
      })
      .catch((error) => ({ evaluationError: error.message }));

    results.push({
      name,
      requestUrl: url,
      navigationError,
      state,
      pageErrors,
      consoleErrors,
      requestFailures,
      badResponses,
    });
  }

  await context.close();
  await browser.close();

  const issues = results.filter(
    (result) =>
      result.navigationError ||
      result.state?.evaluationError ||
      result.pageErrors.length ||
      result.consoleErrors.some(
        (error) => !error.url?.endsWith("/favicon.ico"),
      ) ||
      result.requestFailures.length ||
      result.badResponses.length ||
      result.state?.brokenImages?.some((image) => image.visible),
  );
  const passed = issues.length === 0;
  const report = {
    passed,
    routeCount: routes.length,
    issueCount: issues.length,
    issues,
    results,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        passed,
        routeCount: report.routeCount,
        issueCount: report.issueCount,
        issues: issues.map((issue) => ({
          name: issue.name,
          navigationError: issue.navigationError,
          pageErrors: issue.pageErrors,
          consoleErrors: issue.consoleErrors,
          requestFailures: issue.requestFailures,
          badResponses: issue.badResponses,
          brokenVisibleImages: issue.state?.brokenImages?.filter(
            (image) => image.visible,
          ),
        })),
        report: REPORT,
      },
      null,
      2,
    ),
  );
  if (!passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
