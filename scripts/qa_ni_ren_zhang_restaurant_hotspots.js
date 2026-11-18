const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  "C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright",
);

const ORIGIN = process.argv[2] || "http://127.0.0.1:4180/web/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(
  ROOT,
  "output",
  "qa-ni-ren-zhang-restaurant-hotspots.json",
);
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const EXPECTED = {
  cup: { label: "酒杯", x: 57.6, y: 56.2 },
  door: { label: "天庆馆旗帜", x: 89.2, y: 25.5 },
  diners: { label: "吃客", x: 20.8, y: 62.5 },
  mudman: { label: "泥人张", x: 60.4, y: 67 },
};
const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "844x390", width: 844, height: 390, hasTouch: true },
  { name: "390x844", width: 390, height: 844, hasTouch: true },
];

function browserExecutable() {
  const executable = BROWSERS.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

function ratio(token, freeSpace) {
  if (!token) return 0.5;
  if (token === "left" || token === "top") return 0;
  if (token === "right" || token === "bottom") return 1;
  if (token === "center") return 0.5;
  if (token.endsWith("%")) return Number.parseFloat(token) / 100;
  if (token.endsWith("px") && Math.abs(freeSpace) > 0.5) {
    return -Number.parseFloat(token) / freeSpace;
  }
  return 0.5;
}

async function openRestaurant(page) {
  await page.goto(`${ORIGIN}index.html#ni-ren-zhang/restaurant`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "restaurant",
  );
  await page.waitForFunction(() => {
    const image = document.querySelector(".nr-restaurant-background");
    return Boolean(image?.complete && image.naturalWidth);
  });
  await page.waitForTimeout(220);
}

async function state(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        left: value.left,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
      };
    };
    const pageElement = document.querySelector("#nrPageRestaurant");
    const image = pageElement.querySelector(".nr-restaurant-background");
    const layer = pageElement.querySelector("#nrRestaurantHotspotLayer");
    const layerRect = rect(layer);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      pageRect: rect(pageElement),
      image: {
        rect: rect(image),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        objectPosition: getComputedStyle(image).objectPosition,
      },
      layerRect,
      hotspots: [...pageElement.querySelectorAll("[data-nr-hotspot]")].map(
        (button) => {
          const buttonRect = rect(button);
          const dot = button.querySelector(".nr-hotspot-dot");
          const dotRect = rect(dot);
          const dotStyle = getComputedStyle(dot);
          const label = button.querySelector("strong");
          const style = getComputedStyle(button);
          return {
            key: button.dataset.nrHotspot,
            label: label.textContent.trim(),
            labelDisplay: getComputedStyle(label).display,
            rect: buttonRect,
            x:
              ((buttonRect.left + buttonRect.width / 2 - layerRect.left) /
                layerRect.width) *
              100,
            y:
              ((buttonRect.top + buttonRect.height / 2 - layerRect.top) /
                layerRect.height) *
              100,
            visible:
              buttonRect.right > 0 &&
              buttonRect.bottom > 0 &&
              buttonRect.left < innerWidth &&
              buttonRect.top < innerHeight,
            borderWidth: style.borderTopWidth,
            backgroundColor: style.backgroundColor,
            dot: {
              width: dotRect.width,
              height: dotRect.height,
              borderWidth: dotStyle.borderTopWidth,
              backgroundColor: dotStyle.backgroundColor,
            },
          };
        },
      ),
      observation: {
        count: pageElement
          .querySelector("#nrObservationCount")
          .textContent.trim(),
        kicker: pageElement
          .querySelector("#nrObservationKicker")
          .textContent.trim(),
        title: pageElement
          .querySelector("#nrObservationTitle")
          .textContent.trim(),
      },
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

function expectedLayer(pageState) {
  const scale = Math.max(
    pageState.image.rect.width / pageState.image.naturalWidth,
    pageState.image.rect.height / pageState.image.naturalHeight,
  );
  const width = pageState.image.naturalWidth * scale;
  const height = pageState.image.naturalHeight * scale;
  const freeX = pageState.image.rect.width - width;
  const freeY = pageState.image.rect.height - height;
  const [positionX = "50%", positionY = "50%"] =
    pageState.image.objectPosition.split(/\s+/).filter(Boolean);
  return {
    left: pageState.image.rect.left + freeX * ratio(positionX, freeX),
    top: pageState.image.rect.top + freeY * ratio(positionY, freeY),
    width,
    height,
  };
}

function overlaps(left, right) {
  return !(
    left.right <= right.left ||
    right.right <= left.left ||
    left.bottom <= right.top ||
    right.bottom <= left.top
  );
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const checks = [];
  const errors = [];
  const screenshots = [];
  const add = (name, passed, detail = null) =>
    checks.push({ name, passed: Boolean(passed), detail });

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        hasTouch: Boolean(viewport.hasTouch),
      });
      const page = await context.newPage();
      page.on("pageerror", (error) =>
        errors.push(`${viewport.name}: ${error.message}`),
      );
      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(`${viewport.name}: ${message.text()}`);
        }
      });
      try {
        await openRestaurant(page);
        const initial = await state(page);
        const expected = expectedLayer(initial);
        add(
          `${viewport.name}: hotspot layer tracks the cover-rendered illustration`,
          Math.abs(initial.layerRect.left - expected.left) < 1 &&
            Math.abs(initial.layerRect.top - expected.top) < 1 &&
            Math.abs(initial.layerRect.width - expected.width) < 1 &&
            Math.abs(initial.layerRect.height - expected.height) < 1,
          { actual: initial.layerRect, expected },
        );
        add(
          `${viewport.name}: all four points keep illustration coordinates`,
          initial.hotspots.length === 4 &&
            initial.hotspots.every((hotspot) => {
              const target = EXPECTED[hotspot.key];
              return (
                target &&
                hotspot.label === target.label &&
                Math.abs(hotspot.x - target.x) < 0.35 &&
                Math.abs(hotspot.y - target.y) < 0.35
              );
            }),
          initial.hotspots,
        );
        add(
          `${viewport.name}: only compact dots are shown`,
          initial.hotspots.every(
            (hotspot) =>
              hotspot.rect.width >= 32 &&
              hotspot.rect.height >= 32 &&
              hotspot.borderWidth === "0px" &&
              hotspot.backgroundColor === "rgba(0, 0, 0, 0)" &&
              hotspot.labelDisplay === "none" &&
              Math.abs(hotspot.dot.width - 11) < 0.1 &&
              Math.abs(hotspot.dot.height - 11) < 0.1 &&
              hotspot.dot.borderWidth === "2px" &&
              hotspot.dot.backgroundColor === "rgb(166, 90, 72)",
          ),
        );
        const cup = initial.hotspots.find((item) => item.key === "cup");
        const mudman = initial.hotspots.find(
          (item) => item.key === "mudman",
        );
        add(
          `${viewport.name}: cup and mudman hit areas do not overlap`,
          !overlaps(cup.rect, mudman.rect),
          { cup: cup.rect, mudman: mudman.rect },
        );
        add(
          `${viewport.name}: page has no horizontal overflow`,
          initial.horizontalOverflow === 0,
        );

        if (["1920x1080", "1440x900", "1366x768", "390x844"].includes(viewport.name)) {
          const filename = `ni-ren-zhang-restaurant-hotspots-${viewport.name}.png`;
          await page.screenshot({ path: path.join(ROOT, filename) });
          screenshots.push(filename);
        }

        if (viewport.name === "1920x1080") {
          await page.locator('[data-nr-hotspot="door"]').hover();
          const hovered = await state(page);
          const flag = hovered.hotspots.find(
            (item) => item.key === "door",
          );
          add(
            "desktop hover shows the final visible hotspot name",
            flag.label === "天庆馆旗帜" && flag.labelDisplay !== "none",
            flag,
          );
          const hoverScreenshot =
            "ni-ren-zhang-restaurant-hotspots-hover-1920x1080.png";
          await page.screenshot({
            path: path.join(ROOT, hoverScreenshot),
          });
          screenshots.push(hoverScreenshot);
        }
      } catch (error) {
        errors.push(`${viewport.name}: ${error.stack || error.message}`);
      } finally {
        await context.close();
      }
    }

    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      errors.push(`interaction: ${error.message}`),
    );
    try {
      await openRestaurant(page);
      const sequence = [
        ["cup", "酒杯 · 如常", "1 / 4"],
        ["door", "天庆馆旗帜 · 场景", "2 / 4"],
        ["diners", "吃客 · 围观", "3 / 4"],
        ["mudman", "人物 · 泥人张", "4 / 4"],
      ];
      for (const [key, kicker, count] of sequence) {
        await page.locator(`[data-nr-hotspot="${key}"]`).click();
        const current = await state(page);
        add(
          `${key}: preserves the original observation behavior`,
          current.observation.kicker === kicker &&
            current.observation.count === count &&
            current.observation.title.length > 0,
          current.observation,
        );
      }
      add(
        "four independent observations complete the task counter",
        (await state(page)).observation.count === "4 / 4",
      );
    } catch (error) {
      errors.push(`interaction: ${error.stack || error.message}`);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const failed = checks
    .filter((check) => !check.passed)
    .map((check) => check.name);
  const report = {
    generatedAt: new Date().toISOString(),
    pageOrigin: ORIGIN,
    expectedCoordinates: EXPECTED,
    checks,
    screenshots,
    assertionCount: checks.length,
    failed,
    errors,
    passed: failed.length === 0 && errors.length === 0,
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
