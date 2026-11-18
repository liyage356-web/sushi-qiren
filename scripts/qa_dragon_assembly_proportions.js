const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-dragon-assembly-proportions.json");
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return BROWSERS.find((candidate) => fs.existsSync(candidate));
}

function closeEnough(actual, expected, tolerance = 0.002) {
  return Math.abs(actual - expected) <= tolerance;
}

async function openAssembly(page) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter3`, {
    waitUntil: "networkidle",
  });
  await page
    .locator("#sishiOriginal-chapter3")
    .getByRole("button", { name: "进入本段互动" })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("#assemblyBackyard .sishi-interaction-content")
        ?.hidden === false,
  );
  await page.waitForFunction(() => {
    const images = [
      ...document.querySelectorAll(
        "#dragonAssembly img[data-assembly-asset]",
      ),
    ];
    return images.every((image) => image.complete && image.naturalWidth > 0);
  });
  await page.waitForTimeout(500);
}

async function installAll(page) {
  await page.evaluate(() => {
    const controller = window.dragonAssemblyComponent;
    Object.keys(controller.config.parts).forEach((id) => {
      controller.installPart(id);
    });
  });
  await page.waitForTimeout(650);
}

async function previewDrag(page, id) {
  const card = page.locator(`[data-drag-part="${id}"]`);
  const cardBox = await card.boundingBox();
  const destination = await page.evaluate(() => {
    const canvas = document
      .querySelector(".dragon-assembly__coordinate")
      .getBoundingClientRect();
    return {
      x: canvas.left + canvas.width * 0.46,
      y: canvas.top + canvas.height * 0.3,
      canvas: {
        width: canvas.width,
        height: canvas.height,
      },
    };
  });
  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    cardBox.x + cardBox.width / 2 + 20,
    cardBox.y + cardBox.height / 2 - 12,
    { steps: 3 },
  );
  await page.mouse.move(destination.x, destination.y, { steps: 12 });
  await page.waitForTimeout(80);
  const during = await page.evaluate(() => {
    const token = document.querySelector(".dragon-drag-token");
    const computed = getComputedStyle(token);
    const canvas = document
      .querySelector(".dragon-assembly__coordinate")
      .getBoundingClientRect();
    return {
      width: Number.parseFloat(computed.width) / canvas.width,
      height: Number.parseFloat(computed.height) / canvas.height,
    };
  });
  await page.mouse.up();
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => {
    const controller = window.dragonAssemblyComponent;
    const canvas = document
      .querySelector(".dragon-assembly__coordinate")
      .getBoundingClientRect();
    const layer = document.querySelector(
      ".dragon-assembly__layer--dragon-left",
    );
    const computed = getComputedStyle(layer);
    const position = controller.getSnapshot().positions.dragonLeft;
    return {
      width: Number.parseFloat(computed.width) / canvas.width,
      height: Number.parseFloat(computed.height) / canvas.height,
      storedWidth: position.width,
      storedHeight: position.height,
    };
  });
  return { during, after };
}

async function geometry(page) {
  return page.evaluate(() => {
    const controller = window.dragonAssemblyComponent;
    const system = controller.config.coordinateSystem;
    const configs = controller.config.partConfigs;
    const layout = controller.config.assemblyLayout;
    const snapshot = controller.getSnapshot();
    const canvas = document
      .querySelector(".dragon-assembly__coordinate")
      .getBoundingClientRect();
    const selectors = {
      bucketLeft: ".dragon-assembly__layer--bucket-left",
      bucketRight: ".dragon-assembly__layer--bucket-right",
      yoke: ".dragon-assembly__layer--yoke",
      dragonLeft: ".dragon-assembly__layer--dragon-left",
      dragonRight: ".dragon-assembly__layer--dragon-right",
      goldBead: ".dragon-assembly__layer--bead",
      springLeft: ".dragon-assembly__layer--chain-left",
      springRight: ".dragon-assembly__layer--chain-right",
      pompomLeft: ".dragon-assembly__layer--pompom-left",
      pompomRight: ".dragon-assembly__layer--pompom-right",
      signLeft: ".dragon-assembly__layer--sign",
      signRight: ".dragon-assembly__layer--sign-right",
    };
    const positions = Object.fromEntries(
      Object.entries(snapshot.positions).map(([id, position]) => [
        id,
        {
          ...position,
          centerX: position.x + position.width / 2,
          centerY: position.y + position.height / 2,
          right: position.x + position.width,
          bottom: position.y + position.height,
        },
      ]),
    );
    const rendered = Object.fromEntries(
      Object.entries(selectors).map(([id, selector]) => {
        const layer = document.querySelector(selector);
        const image =
          layer instanceof HTMLImageElement ? layer : layer.querySelector("img");
        const computed = getComputedStyle(layer);
        const layerWidth = Number.parseFloat(computed.width);
        const layerHeight = Number.parseFloat(computed.height);
        return [
          id,
          {
            width: layerWidth / canvas.width,
            height: layerHeight / canvas.height,
            aspectRatio: layerWidth / layerHeight,
            naturalAspectRatio: image.naturalWidth / image.naturalHeight,
            opacity: Number(getComputedStyle(layer).opacity),
          },
        ];
      }),
    );
    return {
      system,
      configs: Object.fromEntries(
        Object.entries(configs).map(([id, config]) => [
          id,
          {
            imageSrc: config.imageSrc,
            width: config.width,
            height: config.height,
            aspectRatio: config.aspectRatio,
            anchorX: config.anchorX,
            anchorY: config.anchorY,
            zIndex: config.zIndex,
          },
        ]),
      ),
      layout,
      positions,
      rendered,
      completedParts: snapshot.completedParts.length,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge/Chrome executable found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const checks = {};
  const details = {};
  const errors = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    await openAssembly(page);
    const initial = await geometry(page);
    const manualPreview = await previewDrag(page, "dragonLeft");
    await page.evaluate(() => window.dragonAssemblyComponent.reset());
    await page.waitForTimeout(180);
    await installAll(page);
    const desktop = await geometry(page);

    await page.locator(".dragon-assembly__coordinate").screenshot({
      path: path.join(ROOT, "output", "dragon-assembly-proportions-desktop.png"),
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(450);
    const mobile = await geometry(page);
    await page.locator(".dragon-assembly__coordinate").screenshot({
      path: path.join(ROOT, "output", "dragon-assembly-proportions-mobile.png"),
    });

    const ids = Object.keys(desktop.configs);
    checks.configurationExists =
      ids.length === 12 &&
      Object.values(desktop.configs).every(
        (config) =>
          config.imageSrc &&
          config.width > 0 &&
          config.height > 0 &&
          config.aspectRatio > 0 &&
          Number.isFinite(config.anchorX) &&
          Number.isFinite(config.anchorY) &&
          Number.isInteger(config.zIndex),
      );

    checks.aspectRatiosStayNative = Object.values(desktop.rendered).every(
      (part) =>
        closeEnough(part.aspectRatio, part.naturalAspectRatio, 0.018),
    );

    const dragonConfig = desktop.configs.dragonLeft;
    checks.manualDragAndAutoUseSameSize =
      closeEnough(manualPreview.during.width, dragonConfig.width, 0.003) &&
      closeEnough(manualPreview.during.height, dragonConfig.height, 0.003) &&
      closeEnough(manualPreview.after.width, dragonConfig.width, 0.003) &&
      closeEnough(manualPreview.after.height, dragonConfig.height, 0.003) &&
      closeEnough(manualPreview.after.storedWidth, dragonConfig.width, 0.0005) &&
      closeEnough(manualPreview.after.storedHeight, dragonConfig.height, 0.0005);

    checks.desktopAndMobilePreserveProportions = Object.keys(
      desktop.positions,
    ).every((id) => {
      const expected = desktop.configs[id];
      const desktopPosition = desktop.positions[id];
      const mobilePosition = mobile.positions[id];
      return (
        closeEnough(desktopPosition.width, expected.width, 0.0005) &&
        closeEnough(mobilePosition.width, expected.width, 0.0005) &&
        closeEnough(
          desktop.rendered[id].aspectRatio,
          mobile.rendered[id].aspectRatio,
          0.02,
        )
      );
    });

    const dragonRatio =
      desktop.positions.dragonLeft.width /
      desktop.positions.bucketLeft.width;
    checks.dragonScaleMatchesReference =
      closeEnough(
        desktop.positions.dragonLeft.width,
        desktop.positions.dragonRight.width,
        0.001,
      ) &&
      dragonRatio >= 0.72 &&
      dragonRatio <= 0.86;

    checks.goldBeadIsSmallerThanDragon =
      desktop.positions.goldBead.width <
        desktop.positions.dragonLeft.width * 0.45 &&
      closeEnough(
        desktop.positions.goldBead.centerX,
        desktop.layout.goldBead.anchorX,
        0.001,
      );

    checks.pompomsSitAboveDragons =
      desktop.positions.pompomLeft.centerY <
        desktop.positions.dragonLeft.centerY &&
      desktop.positions.pompomRight.centerY <
        desktop.positions.dragonRight.centerY &&
      desktop.positions.springLeft.y <
        desktop.positions.springLeft.bottom &&
      desktop.positions.springLeft.bottom >
        desktop.positions.pompomLeft.centerY &&
      desktop.positions.springRight.bottom >
        desktop.positions.pompomRight.centerY;

    const bucketGap =
      desktop.positions.bucketRight.x -
      desktop.positions.bucketLeft.right;
    checks.bucketGapLeavesShoulderSpace =
      bucketGap > desktop.positions.bucketLeft.width * 1.2;

    const yokeConnectsBuckets =
      desktop.positions.yoke.bottom >=
        desktop.positions.bucketLeft.y - 0.006 &&
      desktop.positions.yoke.bottom <=
        desktop.positions.bucketLeft.y + 0.035;
    checks.yokeConnectsBothBuckets = yokeConnectsBuckets;

    const signWithinBucket = (sign, bucket) =>
      sign.x >= bucket.x &&
      sign.right <= bucket.right &&
      sign.y >= bucket.y &&
      sign.bottom <= bucket.bottom;
    checks.lacquerSignsStayOnBucketFaces =
      signWithinBucket(
        desktop.positions.signLeft,
        desktop.positions.bucketLeft,
      ) &&
      signWithinBucket(
        desktop.positions.signRight,
        desktop.positions.bucketRight,
      );

    checks.automaticAssemblyInstallsAllParts =
      desktop.completedParts === 12 &&
      Object.values(desktop.rendered).every((part) => part.opacity > 0.95);

    checks.noBrowserErrors = errors.length === 0;
    details.initial = initial;
    details.manualPreview = manualPreview;
    details.desktop = desktop;
    details.mobile = mobile;
    details.dragonRatio = dragonRatio;
    details.bucketGap = bucketGap;
    details.errors = errors;

    await context.close();
  } finally {
    await browser.close();
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  const result = {
    passed: failed.length === 0,
    checkCount: Object.keys(checks).length,
    failed,
    checks,
    details,
  };
  fs.writeFileSync(REPORT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({
    passed: result.passed,
    checkCount: result.checkCount,
    failed,
    report: REPORT,
  }, null, 2));
  if (failed.length) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
