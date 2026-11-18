const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-heitou-street-dog.json");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const TARGET_SCALE = 1.4;
const WILD_DOG_SCALE = 2 / 3;

async function openStreet(page) {
  await page.goto(`${ORIGIN}#heitou/street`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      document.querySelector("#storyPageStreet")?.hidden === false &&
      document.querySelector("#streetDogHotspot img")?.complete === true &&
      document.querySelector("#streetDogHotspot img")?.naturalWidth > 0,
  );
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(180);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const hotspot = document.querySelector("#streetDogHotspot");
    const image = hotspot.querySelector("img");
    const heading = document.querySelector(".street-explore-heading");
    const bottomBar = document.querySelector(".street-bottom-bar");
    const hotspotRect = hotspot.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const bottomBarRect = bottomBar.getBoundingClientRect();
    const style = getComputedStyle(hotspot);
    const wildEncounter = document.querySelector("#streetWildDogEncounter");
    const wildImage = wildEncounter.querySelector("img");
    const wildStyle = getComputedStyle(wildEncounter);
    const wildImageStyle = getComputedStyle(wildImage);
    const wildMatrix = new DOMMatrixReadOnly(wildImageStyle.transform);

    function alphaBounds() {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      let left = canvas.width;
      let top = canvas.height;
      let right = 0;
      let bottom = 0;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (data[(y * canvas.width + x) * 4 + 3] < 8) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x + 1);
          bottom = Math.max(bottom, y + 1);
        }
      }
      return {
        left: left / canvas.width,
        top: top / canvas.height,
        right: right / canvas.width,
        bottom: bottom / canvas.height,
        width: (right - left) / canvas.width,
        height: (bottom - top) / canvas.height,
      };
    }

    function overlapArea(first, second) {
      const width = Math.max(
        0,
        Math.min(first.right, second.right) -
          Math.max(first.left, second.left),
      );
      const height = Math.max(
        0,
        Math.min(first.bottom, second.bottom) -
          Math.max(first.top, second.top),
      );
      return width * height;
    }

    const alpha = alphaBounds();
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      hotspot: {
        left: hotspotRect.left,
        top: hotspotRect.top,
        right: hotspotRect.right,
        bottom: hotspotRect.bottom,
        width: hotspotRect.width,
        height: hotspotRect.height,
        transform: style.transform,
        transformOrigin: style.transformOrigin,
        filter: style.filter,
        opacity: Number.parseFloat(style.opacity),
        visibility: style.visibility,
        zIndex: Number.parseInt(style.zIndex, 10),
      },
      image: {
        left: imageRect.left,
        top: imageRect.top,
        right: imageRect.right,
        bottom: imageRect.bottom,
        width: imageRect.width,
        height: imageRect.height,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        source: decodeURIComponent(new URL(image.src).pathname),
      },
      alpha,
      visibleFootY:
        imageRect.top + alpha.bottom * imageRect.height,
      visibleDogWidth: alpha.width * imageRect.width,
      headingRect: {
        left: headingRect.left,
        top: headingRect.top,
        right: headingRect.right,
        bottom: headingRect.bottom,
      },
      bottomBarRect: {
        left: bottomBarRect.left,
        top: bottomBarRect.top,
        right: bottomBarRect.right,
        bottom: bottomBarRect.bottom,
      },
      headingOverlap: overlapArea(hotspotRect, headingRect),
      bottomBarOverlap: overlapArea(hotspotRect, bottomBarRect),
      wildDog: {
        visibility: wildStyle.visibility,
        opacity: Number.parseFloat(wildStyle.opacity),
        zIndex: Number.parseInt(wildStyle.zIndex, 10),
        transform: wildImageStyle.transform,
        transformOrigin: wildImageStyle.transformOrigin,
        scaleX: wildMatrix.a,
        scaleY: wildMatrix.d,
        loaded: Boolean(wildImage.complete) && wildImage.naturalWidth > 0,
      },
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      state: document.querySelector("#streetExplore").dataset.state,
      clueCount: document
        .querySelector("#streetClueCount")
        ?.textContent.trim(),
      focusVisible:
        document.querySelector("#streetFocusCard")?.hidden === false,
    };
  });
}

function originalClampWidth(viewportWidth) {
  if (viewportWidth <= 760) {
    return Math.max(102, Math.min(165, viewportWidth * 0.29));
  }
  return Math.max(116, Math.min(210, viewportWidth * 0.14));
}

async function run() {
  const browser = await chromium.launch({
    executablePath: EDGE,
    headless: true,
  });
  const checks = {};
  const errors = [];
  const sessions = {};

  function check(name, condition, detail = "") {
    checks[name] = {
      passed: Boolean(condition),
      detail:
        typeof detail === "string" ? detail : JSON.stringify(detail),
    };
  }

  function observe(page) {
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
  }

  const configurations = [
    {
      name: "fullHd",
      viewport: { width: 1920, height: 1080 },
      screenshot: "heitou-street-dog-140-1920.png",
    },
    {
      name: "reference",
      viewport: { width: 1720, height: 963 },
      screenshot: "heitou-street-dog-140-1720.png",
    },
    {
      name: "laptop",
      viewport: { width: 1366, height: 768 },
      screenshot: "heitou-street-dog-140-1366.png",
    },
    {
      name: "mobile",
      viewport: { width: 390, height: 844 },
      screenshot: "heitou-street-dog-140-mobile-390.png",
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    },
  ];

  for (const configuration of configurations) {
    const context = await browser.newContext({
      viewport: configuration.viewport,
      hasTouch: Boolean(configuration.hasTouch),
      isMobile: Boolean(configuration.isMobile),
      deviceScaleFactor: configuration.deviceScaleFactor || 1,
    });
    const page = await context.newPage();
    observe(page);
    await openStreet(page);
    const initial = await snapshot(page);
    sessions[configuration.name] = initial;

    const expectedWidth =
      originalClampWidth(configuration.viewport.width) * TARGET_SCALE;
    check(
      `${configuration.name}DogUsesOnePointFourTimesOriginalWidth`,
      Math.abs(initial.hotspot.width - expectedWidth) < 1.1,
      {
        expectedWidth,
        actualWidth: initial.hotspot.width,
        ratio: initial.hotspot.width / originalClampWidth(configuration.viewport.width),
      },
    );
    check(
      `${configuration.name}DogKeepsNaturalAspectRatio`,
      Math.abs(
        initial.image.width / initial.image.height -
          initial.image.naturalWidth / initial.image.naturalHeight,
      ) < 0.01,
      initial.image,
    );
    check(
      `${configuration.name}ClickAreaMatchesRenderedDog`,
      Math.abs(initial.hotspot.left - initial.image.left) < 1 &&
        Math.abs(initial.hotspot.top - initial.image.top) < 1 &&
        Math.abs(initial.hotspot.right - initial.image.right) < 1 &&
        Math.abs(initial.hotspot.bottom - initial.image.bottom) < 1,
      {
        hotspot: initial.hotspot,
        image: initial.image,
      },
    );
    check(
      `${configuration.name}DogStaysInsideLowerLeftGroundArea`,
      initial.hotspot.left >= 0 &&
        initial.hotspot.right <= initial.viewport.width &&
        initial.hotspot.bottom <= initial.viewport.height &&
        initial.hotspot.right < initial.viewport.width * 0.52 &&
        initial.headingOverlap === 0 &&
        initial.bottomBarOverlap === 0 &&
        initial.horizontalOverflow <= 1,
      {
        hotspot: initial.hotspot,
        visibleFootY: initial.visibleFootY,
        headingOverlap: initial.headingOverlap,
        bottomBarOverlap: initial.bottomBarOverlap,
        horizontalOverflow: initial.horizontalOverflow,
      },
    );
    check(
      `${configuration.name}DogFeetRemainAtContainerBaseline`,
      initial.alpha.bottom >= 0.95 &&
        Math.abs(initial.visibleFootY - initial.image.bottom) < 4.5,
      {
        alphaBottom: initial.alpha.bottom,
        visibleFootY: initial.visibleFootY,
        imageBottom: initial.image.bottom,
      },
    );

    await page.screenshot({
      path: path.join(ROOT, configuration.screenshot),
      fullPage: false,
    });

    if (configuration.name === "fullHd") {
      await page.locator("#streetDogHotspot").hover();
      await page.waitForTimeout(320);
      const hovered = await snapshot(page);
      check(
        "dogHoverFeedbackRemainsActive",
        hovered.hotspot.transform !== initial.hotspot.transform &&
          hovered.hotspot.filter !== initial.hotspot.filter,
        {
          initialTransform: initial.hotspot.transform,
          hoveredTransform: hovered.hotspot.transform,
          initialFilter: initial.hotspot.filter,
          hoveredFilter: hovered.hotspot.filter,
        },
      );

      await page.locator("[data-street-object='cargo']").click();
      await page.locator("#streetDogHotspot").click();
      await page.waitForFunction(
        () => document.querySelector("#streetExplore")?.dataset.state === "focused",
      );
      const focused = await snapshot(page);
      check(
        "dogClickAndClueProgressRemainFunctional",
        focused.focusVisible &&
          focused.state === "focused" &&
          focused.clueCount.includes("2 条") &&
          focused.clueCount.includes("已发现"),
        focused,
      );
      await page.screenshot({
        path: path.join(ROOT, "heitou-street-dog-focused-140-1920.png"),
        fullPage: false,
      });
    }

    if (configuration.name === "mobile") {
      await page.locator("#streetDogHotspot").tap();
      await page.waitForFunction(
        () => document.querySelector("#streetExplore")?.dataset.state === "focused",
      );
      const focused = await snapshot(page);
      check(
        "mobileDogHotspotStillWorks",
        focused.focusVisible && focused.state === "focused",
        focused,
      );
    }

    if (
      ["fullHd", "reference", "mobile"].includes(configuration.name)
    ) {
      if (configuration.name === "reference") {
        await page.locator("#streetDogHotspot").click();
        await page.waitForFunction(
          () =>
            document.querySelector("#streetExplore")?.dataset.state ===
            "focused",
        );
      }

      if (configuration.name === "mobile") {
        await page.locator("#streetFeedFood").tap();
        await page.locator("#streetFeedTarget").tap();
      } else {
        await page.locator("#streetFeedFood").click();
        await page.locator("#streetFeedTarget").click();
      }
      await page.waitForFunction(
        () =>
          document.querySelector("#streetExplore")?.dataset.feedState ===
          "blocked",
      );
      await page.waitForTimeout(820);
      const blocked = await snapshot(page);
      check(
        `${configuration.name}BlackheadStaysFullyVisibleDuringEncounter`,
        blocked.hotspot.opacity === 1 &&
          blocked.hotspot.visibility === "visible" &&
          blocked.hotspot.width > 0 &&
          blocked.hotspot.height > 0 &&
          blocked.wildDog.visibility === "visible" &&
          blocked.hotspot.zIndex > blocked.wildDog.zIndex,
        {
          hotspot: blocked.hotspot,
          wildDog: blocked.wildDog,
        },
      );
      check(
        `${configuration.name}WildDogGroupUsesTwoThirdsScale`,
        blocked.wildDog.loaded &&
          Math.abs(blocked.wildDog.scaleX - WILD_DOG_SCALE) < 0.01 &&
          Math.abs(blocked.wildDog.scaleY - WILD_DOG_SCALE) < 0.01,
        blocked.wildDog,
      );

      if (["reference", "mobile"].includes(configuration.name)) {
        await page.screenshot({
          path: path.join(
            ROOT,
            configuration.name === "reference"
              ? "heitou-street-dog-blocked-1720.png"
              : "heitou-street-dog-blocked-mobile-390.png",
          ),
          fullPage: false,
        });
      }
    }

    await context.close();
  }

  check(
    "desktopDogRatiosStayConsistent",
    Math.abs(
      sessions.fullHd.hotspot.width /
        originalClampWidth(sessions.fullHd.viewport.width) -
        sessions.laptop.hotspot.width /
          originalClampWidth(sessions.laptop.viewport.width),
    ) < 0.015,
    {
      fullHd: sessions.fullHd.hotspot.width,
      laptop: sessions.laptop.hotspot.width,
    },
  );
  check("runtimeErrors", errors.length === 0, errors);

  await browser.close();
  const failed = Object.entries(checks)
    .filter(([, result]) => !result.passed)
    .map(([name]) => name);
  const report = {
    passed: failed.length === 0,
    checkCount: Object.keys(checks).length,
    failed,
    errors,
    targetScale: TARGET_SCALE,
    wildDogScale: WILD_DOG_SCALE,
    checks,
    sessions,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      passed: report.passed,
      checkCount: report.checkCount,
      failed,
      errors,
      report: REPORT,
    }),
  );
  if (!report.passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
