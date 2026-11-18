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
  "qa-ni-ren-zhang-reveal-clay-viewer.json",
);
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const EXPECTED = {
  x: 76.3,
  y: 62.3,
  label: "细观泥塑小像",
  imageWidth: 1448,
  imageHeight: 1086,
};
const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1024x768", width: 1024, height: 768 },
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

function rect(value) {
  return {
    left: value.left,
    top: value.top,
    right: value.right,
    bottom: value.bottom,
    width: value.width,
    height: value.height,
  };
}

async function openReveal(page) {
  await page.goto(`${ORIGIN}index.html#ni-ren-zhang/reveal`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "reveal",
  );
  await page.waitForFunction(() => {
    const image = document.querySelector(".nr-reveal-background");
    return Boolean(image?.complete && image.naturalWidth);
  });
  await page.waitForTimeout(220);
}

async function hotpotState(page) {
  return page.evaluate(() => {
    const pageElement = document.querySelector("#nrPageReveal");
    const background = pageElement.querySelector(".nr-reveal-background");
    const layer = pageElement.querySelector("#nrRevealHotspotLayer");
    const button = pageElement.querySelector("#nrRevealClayHotspot");
    const label = button.querySelector("strong");
    const dot = button.querySelector(".nr-hotspot-dot");
    const rectOf = (element) => {
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
    const layerRect = rectOf(layer);
    const buttonRect = rectOf(button);
    const buttonCentre = {
      x: buttonRect.left + buttonRect.width / 2,
      y: buttonRect.top + buttonRect.height / 2,
    };
    const topAtCentre = document.elementFromPoint(
      buttonCentre.x,
      buttonCentre.y,
    );
    const navigationBottom = document
      .querySelector(".nr-step-nav")
      .getBoundingClientRect().bottom;
    const dotStyle = getComputedStyle(dot);
    const buttonStyle = getComputedStyle(button);
    return {
      page: rectOf(pageElement),
      background: {
        rect: rectOf(background),
        naturalWidth: background.naturalWidth,
        naturalHeight: background.naturalHeight,
        objectFit: getComputedStyle(background).objectFit,
        objectPosition: getComputedStyle(background).objectPosition,
      },
      layer: layerRect,
      hotspot: {
        rect: buttonRect,
        x:
          ((buttonRect.left + buttonRect.width / 2 - layerRect.left) /
            layerRect.width) *
          100,
        y:
          ((buttonRect.top + buttonRect.height / 2 - layerRect.top) /
            layerRect.height) *
          100,
        label: label.textContent.trim(),
        labelDisplay: getComputedStyle(label).display,
        borderWidth: buttonStyle.borderTopWidth,
        backgroundColor: buttonStyle.backgroundColor,
        dot: {
          width: rectOf(dot).width,
          height: rectOf(dot).height,
          borderWidth: dotStyle.borderTopWidth,
          backgroundColor: dotStyle.backgroundColor,
        },
        visible:
          buttonRect.right > 0 &&
          buttonRect.bottom > 0 &&
          buttonRect.left < innerWidth &&
          buttonRect.top < innerHeight &&
          buttonRect.bottom > navigationBottom &&
          Boolean(topAtCentre?.closest("#nrRevealClayHotspot")),
      },
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

async function viewerState(page) {
  return page.evaluate(() => {
    const viewer = document.querySelector("#nrRevealClayViewer");
    const sheet = viewer.querySelector(".nr-reveal-viewer-sheet");
    const frame = viewer.querySelector(".nr-reveal-viewer-frame");
    const image = viewer.querySelector("#nrRevealClayImage");
    const rectOf = (element) => {
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
    const imageRect = rectOf(image);
    return {
      hidden: viewer.hidden,
      open: viewer.classList.contains("is-open"),
      title: viewer.querySelector("#nrRevealClayViewerTitle").textContent.trim(),
      subtitle: viewer
        .querySelector("#nrRevealClayViewerSubtitle")
        .textContent.trim(),
      sheet: rectOf(sheet),
      frame: rectOf(frame),
      image: {
        rect: imageRect,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        source: image.getAttribute("src"),
        renderedRatio: imageRect.width / imageRect.height,
        naturalRatio: image.naturalWidth / image.naturalHeight,
      },
      zoomLabel: viewer
        .querySelector("#nrRevealClayZoomLabel")
        .textContent.trim(),
      bodyClass: document.body.classList.contains(
        "nr-reveal-viewer-open",
      ),
      viewerState: window.niRenZhangStory.getRevealViewerState(),
      currentPage: window.niRenZhangStory.getCurrentPage(),
      revealHidden: document.querySelector("#nrPageReveal").hidden,
    };
  });
}

async function waitForViewer(page, open) {
  await page.waitForFunction(
    (expectedOpen) => {
      const viewer = document.querySelector("#nrRevealClayViewer");
      return expectedOpen
        ? !viewer.hidden && viewer.classList.contains("is-open")
        : viewer.hidden;
    },
    open,
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
        await openReveal(page);
        const state = await hotpotState(page);
        const scale = Math.max(
          state.background.rect.width / state.background.naturalWidth,
          state.background.rect.height / state.background.naturalHeight,
        );
        const width = state.background.naturalWidth * scale;
        const height = state.background.naturalHeight * scale;
        const freeX = state.background.rect.width - width;
        const freeY = state.background.rect.height - height;
        const [positionX = "50%", positionY = "50%"] =
          state.background.objectPosition.split(/\s+/).filter(Boolean);
        const expected = {
          left:
            state.background.rect.left +
            freeX * ratio(positionX, freeX),
          top:
            state.background.rect.top +
            freeY * ratio(positionY, freeY),
          width,
          height,
        };
        add(
          `${viewport.name}: background still uses cover`,
          state.background.objectFit === "cover",
        );
        add(
          `${viewport.name}: hotspot layer follows rendered background`,
          Math.abs(state.layer.left - expected.left) < 1 &&
            Math.abs(state.layer.top - expected.top) < 1 &&
            Math.abs(state.layer.width - expected.width) < 1 &&
            Math.abs(state.layer.height - expected.height) < 1,
          { actual: state.layer, expected },
        );
        add(
          `${viewport.name}: hotspot uses illustration coordinates`,
          Math.abs(state.hotspot.x - EXPECTED.x) < 0.2 &&
            Math.abs(state.hotspot.y - EXPECTED.y) < 0.2,
          state.hotspot,
        );
        add(
          `${viewport.name}: hotspot reuses the red observation style`,
          state.hotspot.label === EXPECTED.label &&
            state.hotspot.borderWidth === "0px" &&
            state.hotspot.backgroundColor === "rgba(0, 0, 0, 0)" &&
            state.hotspot.rect.width >= 44 &&
            state.hotspot.rect.height >= 44 &&
            Math.abs(state.hotspot.dot.width - 11) < 0.2 &&
            Math.abs(state.hotspot.dot.height - 11) < 0.2 &&
            state.hotspot.dot.borderWidth === "2px" &&
            state.hotspot.dot.backgroundColor === "rgb(166, 90, 72)",
          state.hotspot,
        );
        add(
          `${viewport.name}: hotspot is visible above story content`,
          state.hotspot.visible,
          state.hotspot.rect,
        );
        add(
          `${viewport.name}: page has no horizontal overflow`,
          state.horizontalOverflow === 0,
          state.horizontalOverflow,
        );

        if (["1440x900", "1024x768", "390x844"].includes(viewport.name)) {
          const filename = `nr-reveal-clay-hotspot-${viewport.name}.png`;
          await page.screenshot({ path: path.join(ROOT, filename) });
          screenshots.push(filename);
        }

        if (viewport.name === "1440x900") {
          await page.locator("#nrRevealClayHotspot").hover();
          const hovered = await hotpotState(page);
          add(
            "desktop hover reveals the clay observation label",
            hovered.hotspot.labelDisplay !== "none" &&
              hovered.hotspot.label === EXPECTED.label,
            hovered.hotspot,
          );
        }

        if (viewport.hasTouch) {
          await page.locator("#nrRevealClayHotspot").tap();
        } else {
          await page.locator("#nrRevealClayHotspot").click();
        }
        await waitForViewer(page, true);
        await page.waitForTimeout(330);
        const opened = await viewerState(page);
        add(
          `${viewport.name}: hotspot opens the clay image dialog`,
          opened.open &&
            !opened.hidden &&
            opened.title === "泥塑细观 · 海张五" &&
            opened.subtitle === "一团泥巴，捏出人物神态。" &&
            opened.currentPage === "reveal" &&
            !opened.revealHidden &&
            opened.bodyClass,
          opened,
        );
        add(
          `${viewport.name}: image is the supplied high-resolution asset`,
          opened.image.naturalWidth === EXPECTED.imageWidth &&
            opened.image.naturalHeight === EXPECTED.imageHeight &&
            opened.image.source.endsWith(
              "sea-zhang-wu-clay-closeup.png",
            ) &&
            Math.abs(
              opened.image.renderedRatio - opened.image.naturalRatio,
            ) < 0.01,
          opened.image,
        );
        add(
          `${viewport.name}: dialog fits the viewport`,
          opened.sheet.left >= 0 &&
            opened.sheet.top >= 0 &&
            opened.sheet.right <= viewport.width + 1 &&
            opened.sheet.bottom <= viewport.height + 1 &&
            opened.sheet.height <= viewport.height * 0.85 + 2 &&
            (viewport.width <= 760 ||
              (opened.sheet.width >=
                Math.min(1050, viewport.width * 0.65) &&
                opened.sheet.width <= Math.min(1050, viewport.width * 0.75) +
                  2)),
          opened.sheet,
        );
        add(
          `${viewport.name}: image starts at 1.0x`,
          opened.zoomLabel === "1.0×" &&
            opened.viewerState.scale === 1,
          opened.viewerState,
        );

        if (viewport.name === "1440x900") {
          const filename = "nr-reveal-clay-viewer-1440x900.png";
          await page.screenshot({ path: path.join(ROOT, filename) });
          screenshots.push(filename);

          await page.locator("[data-nr-reveal-zoom='in']").click();
          await page.locator("[data-nr-reveal-zoom='in']").click();
          await page.locator("[data-nr-reveal-zoom='in']").click();
          const zoomed = await viewerState(page);
          add(
            "plus control zooms above the initial scale",
            zoomed.viewerState.scale > 1 &&
              zoomed.zoomLabel === `${zoomed.viewerState.scale.toFixed(1)}×`,
            zoomed.viewerState,
          );

          const frame = await page.locator("#nrRevealClayFrame").boundingBox();
          await page.mouse.move(
            frame.x + frame.width * 0.55,
            frame.y + frame.height * 0.5,
          );
          await page.mouse.wheel(0, -140);
          const wheeled = await viewerState(page);
          add(
            "wheel zoom increases scale",
            wheeled.viewerState.scale > zoomed.viewerState.scale,
            wheeled.viewerState,
          );

          await page.mouse.move(
            frame.x + frame.width * 0.55,
            frame.y + frame.height * 0.5,
          );
          await page.mouse.down();
          await page.mouse.move(
            frame.x + frame.width * 0.45,
            frame.y + frame.height * 0.58,
            { steps: 5 },
          );
          await page.mouse.up();
          const dragged = await viewerState(page);
          add(
            "zoomed image can be panned",
            Math.abs(dragged.viewerState.x - wheeled.viewerState.x) > 2 ||
              Math.abs(
                dragged.viewerState.y - wheeled.viewerState.y,
              ) > 2,
            dragged.viewerState,
          );

          await page.locator("[data-nr-reveal-zoom='reset']").click();
          const reset = await viewerState(page);
          add(
            "reset control restores 1.0x and centre",
            reset.viewerState.scale === 1 &&
              reset.viewerState.x === 0 &&
              reset.viewerState.y === 0 &&
              reset.zoomLabel === "1.0×",
            reset.viewerState,
          );

          for (let index = 0; index < 12; index += 1) {
            const zoomIn = page.locator("[data-nr-reveal-zoom='in']");
            if (await zoomIn.isDisabled()) break;
            await zoomIn.click();
          }
          const maximum = await viewerState(page);
          add(
            "zoom clamps at 3.0x",
            maximum.viewerState.scale === 3 &&
              maximum.zoomLabel === "3.0×" &&
              (await page
                .locator("[data-nr-reveal-zoom='in']")
                .isDisabled()),
            maximum.viewerState,
          );

          for (let index = 0; index < 12; index += 1) {
            const zoomOut = page.locator("[data-nr-reveal-zoom='out']");
            if (await zoomOut.isDisabled()) break;
            await zoomOut.click();
          }
          const minimum = await viewerState(page);
          add(
            "zoom clamps at 1.0x",
            minimum.viewerState.scale === 1 &&
              minimum.zoomLabel === "1.0×" &&
              (await page
                .locator("[data-nr-reveal-zoom='out']")
                .isDisabled()),
            minimum.viewerState,
          );

          await page.locator(".nr-reveal-viewer-close").click();
          await waitForViewer(page, false);
          const closed = await page.evaluate(() => ({
            page: window.niRenZhangStory.getCurrentPage(),
            revealHidden: document.querySelector("#nrPageReveal").hidden,
            toolbarVisible: !document
              .querySelector("#niRenZhangExperience")
              .hidden,
          }));
          add(
            "close button returns to the unchanged reveal page",
            closed.page === "reveal" &&
              !closed.revealHidden &&
              closed.toolbarVisible,
            closed,
          );

          await page.locator("#nrRevealClayHotspot").click();
          await waitForViewer(page, true);
          await page.waitForTimeout(330);
          await page.mouse.click(4, 4);
          await waitForViewer(page, false);
          add(
            "backdrop closes the dialog without leaving the chapter",
            (await page.evaluate(
              () => window.niRenZhangStory.getCurrentPage(),
            )) === "reveal",
          );
        }

        if (viewport.name === "390x844") {
          const filename = "nr-reveal-clay-viewer-390x844.png";
          await page.screenshot({ path: path.join(ROOT, filename) });
          screenshots.push(filename);
          const frame = await page.locator("#nrRevealClayFrame").boundingBox();
          await page.mouse.click(
            frame.x + frame.width * 0.55,
            frame.y + frame.height * 0.5,
          );
          const stillOpen = await viewerState(page);
          add(
            "tapping inside the image does not close the dialog",
            !stillOpen.hidden,
            stillOpen.viewerState,
          );
          await page.keyboard.press("Escape");
          await waitForViewer(page, false);
          add(
            "Escape closes the mobile dialog and keeps reveal active",
            (await page.evaluate(() => ({
              page: window.niRenZhangStory.getCurrentPage(),
              hidden: document.querySelector("#nrPageReveal").hidden,
            }))).page === "reveal",
          );

          const scrollBefore = await page.evaluate(() => {
            const panel = document.querySelector(
              "#nrPageReveal .nr-copy-panel",
            );
            panel.scrollTop = Math.min(48, panel.scrollHeight - panel.clientHeight);
            return panel.scrollTop;
          });
          await page.locator("#nrRevealClayHotspot").tap();
          await waitForViewer(page, true);
          await page.waitForTimeout(220);
          await page.keyboard.press("Escape");
          await waitForViewer(page, false);
          const scrollAfter = await page.evaluate(
            () =>
              document.querySelector(
                "#nrPageReveal .nr-copy-panel",
              ).scrollTop,
          );
          add(
            "closing preserves the reveal page scroll position",
            scrollAfter === scrollBefore,
            { scrollBefore, scrollAfter },
          );
        }
      } catch (error) {
        errors.push(`${viewport.name}: ${error.stack || error.message}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const failed = checks.filter((check) => !check.passed).map((check) => check.name);
  const report = {
    generatedAt: new Date().toISOString(),
    pageOrigin: ORIGIN,
    expected: EXPECTED,
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
