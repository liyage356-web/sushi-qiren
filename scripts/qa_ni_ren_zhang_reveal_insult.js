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
  "qa-ni-ren-zhang-reveal-insult.json",
);
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "844x390", width: 844, height: 390, hasTouch: true },
  { name: "390x844", width: 390, height: 844, hasTouch: true },
];
const EXPECTED = {
  hint: "点击桌面泥人观察正面",
  eyebrow: "第四幕·泥像亮相",
  title: "海张五大叫道：",
  body: "“这破手艺也想赚钱，贱卖都没人要。”",
  firstButton: "继续阅读→",
  nextButton: "第二天去估衣街→",
};

function browserExecutable() {
  const executable = BROWSERS.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

async function openReveal(page, suffix = "") {
  await page.goto(`${ORIGIN}index.html#ni-ren-zhang/reveal${suffix}`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "reveal",
  );
  await page.waitForFunction(() => {
    const images = [
      ...document.querySelectorAll(".nr-reveal-background"),
    ];
    return images.every(
      (image) => Boolean(image.complete && image.naturalWidth),
    );
  });
  await page.waitForTimeout(180);
}

async function waitForInsult(page) {
  await page.waitForFunction(
    () =>
      window.niRenZhangStory?.getRevealScene() ===
        "hai-zhang-wu-insult" &&
      document
        .querySelector("#nrPageReveal")
        .classList.contains("is-hai-zhang-wu-insult"),
  );
  await page.waitForTimeout(860);
}

async function readState(page) {
  return page.evaluate(() => {
    const rectOf = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const reveal = document.querySelector("#nrPageReveal");
    const clay = document.querySelector("#nrRevealClayScene");
    const insult = document.querySelector("#nrRevealInsultScene");
    const card = document.querySelector(".nr-reveal-insult-card");
    const clayBackground = document.querySelector(
      ".nr-reveal-clay-background",
    );
    const insultBackground = document.querySelector(
      ".nr-reveal-insult-background",
    );
    const hotspot = document.querySelector("#nrRevealClayHotspot");
    const continueButton = document.querySelector(
      "#nrRevealContinueButton",
    );
    const marketButton = document.querySelector("#nrRevealMarketButton");
    const viewer = document.querySelector("#nrRevealClayViewer");
    const nav = document.querySelector(".nr-step-nav");
    const activeNav = nav?.querySelector("[aria-current='page']");
    const hint = document.querySelector(".nr-reveal-observation-hint");
    const cardStyle = getComputedStyle(card);
    const insultStyle = getComputedStyle(insult);
    const clayStyle = getComputedStyle(clay);
    const clayBackgroundStyle = getComputedStyle(clayBackground);
    const insultBackgroundStyle = getComputedStyle(insultBackground);
    return {
      page: {
        current: window.niRenZhangStory?.getCurrentPage(),
        revealScene: window.niRenZhangStory?.getRevealScene(),
        hidden: reveal.hidden,
        dataScene: reveal.dataset.nrRevealScene,
        className: reveal.className,
        rect: rectOf(reveal),
      },
      url: location.hash,
      nav: {
        count: nav?.querySelectorAll("[data-nr-page]").length || 0,
        active: activeNav?.dataset.nrPage || null,
      },
      clay: {
        rect: rectOf(clay),
        opacity: Number.parseFloat(clayStyle.opacity),
        visibility: clayStyle.visibility,
        inert: clay.inert,
        ariaHidden: clay.getAttribute("aria-hidden"),
        hintText: hint?.textContent.replace(/\s+/g, " ").trim() || "",
        hintContainsLegacy: hint?.textContent.includes("情节依据") || false,
        continueText:
          continueButton?.textContent.replace(/\s+/g, "").trim() || "",
        continueRect: rectOf(continueButton),
      },
      insult: {
        rect: rectOf(insult),
        opacity: Number.parseFloat(insultStyle.opacity),
        visibility: insultStyle.visibility,
        inert: insult.inert,
        ariaHidden: insult.getAttribute("aria-hidden"),
      },
      card: {
        rect: rectOf(card),
        opacity: Number.parseFloat(cardStyle.opacity),
        backgroundColor: cardStyle.backgroundColor,
        boxShadow: cardStyle.boxShadow,
        borderRadius: cardStyle.borderRadius,
        eyebrow: card
          .querySelector(".nr-eyebrow")
          .textContent.replace(/\s+/g, "")
          .trim(),
        title: card.querySelector("h2").textContent.trim(),
        body: card.querySelector("p:last-child").textContent.trim(),
      },
      marketButton: {
        rect: rectOf(marketButton),
        text: marketButton.textContent.replace(/\s+/g, "").trim(),
        backgroundColor: getComputedStyle(marketButton).backgroundColor,
        color: getComputedStyle(marketButton).color,
      },
      clayBackground: {
        source: clayBackground.getAttribute("src"),
        naturalWidth: clayBackground.naturalWidth,
        naturalHeight: clayBackground.naturalHeight,
        objectFit: clayBackgroundStyle.objectFit,
        objectPosition: clayBackgroundStyle.objectPosition,
        opacity: Number.parseFloat(clayBackgroundStyle.opacity),
        rect: rectOf(clayBackground),
      },
      insultBackground: {
        source: insultBackground.getAttribute("src"),
        naturalWidth: insultBackground.naturalWidth,
        naturalHeight: insultBackground.naturalHeight,
        objectFit: insultBackgroundStyle.objectFit,
        objectPosition: insultBackgroundStyle.objectPosition,
        opacity: Number.parseFloat(insultBackgroundStyle.opacity),
        rect: rectOf(insultBackground),
      },
      hotspot: {
        rect: rectOf(hotspot),
        disabled: hotspot.disabled,
        pointerEvents: getComputedStyle(hotspot).pointerEvents,
      },
      viewerOpen: !viewer.hidden,
      navigationBottom:
        nav?.getBoundingClientRect().bottom || 0,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      viewport: { width: innerWidth, height: innerHeight },
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
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`desktop: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(`desktop: ${message.text()}`);
      }
    });

    await openReveal(page);
    const initial = await readState(page);
    add(
      "reveal opens on the original clay scene",
      initial.page.current === "reveal" &&
        initial.page.revealScene === "clay-reveal" &&
        initial.page.dataScene === "clay-reveal" &&
        !initial.page.hidden &&
        initial.clay.opacity === 1 &&
        initial.insult.opacity === 0,
      initial.page,
    );
    add(
      "first action is renamed while keeping its original button",
      initial.clay.continueText === EXPECTED.firstButton,
      initial.clay.continueRect,
    );
    add(
      "the source note is replaced with the observation instruction",
      normalize(initial.clay.hintText) === EXPECTED.hint &&
        !initial.clay.hintContainsLegacy,
      initial.clay.hintText,
    );
    add(
      "all seven chapter links remain and 04 reveal stays active",
      initial.nav.count === 7 && initial.nav.active === "reveal",
      initial.nav,
    );
    add(
      "the original reveal image still covers the story area",
      initial.clayBackground.source.endsWith(
        "/reveal/tea-house-clay-reveal.png",
      ) &&
        initial.clayBackground.objectFit === "cover" &&
        Math.abs(
          initial.clayBackground.rect.width - initial.page.rect.width,
        ) < 1 &&
        Math.abs(
          initial.clayBackground.rect.height - initial.page.rect.height,
        ) < 1,
      initial.clayBackground,
    );

    const initialScreenshot = path.join(
      ROOT,
      "ni-ren-zhang-reveal-insult-initial-1440x900.png",
    );
    await page.screenshot({ path: initialScreenshot, fullPage: true });
    screenshots.push(initialScreenshot);

    await page.locator("#nrRevealClayHotspot").click();
    await waitForViewer(page, true);
    add(
      "the original clay observation viewer still opens",
      (await page.evaluate(() => ({
        page: window.niRenZhangStory.getCurrentPage(),
        scene: window.niRenZhangStory.getRevealScene(),
      }))).page === "reveal",
    );
    await page.locator(".nr-reveal-viewer-close").click();
    await waitForViewer(page, false);
    const afterViewer = await readState(page);
    add(
      "closing the viewer returns to the same reveal scene",
      afterViewer.page.revealScene === "clay-reveal" &&
        afterViewer.clay.opacity === 1 &&
        afterViewer.insult.opacity === 0,
      afterViewer.page,
    );

    await page.locator("#nrRevealContinueButton").click();
    await page.waitForTimeout(120);
    const leaving = await readState(page);
    add(
      "the original scene starts its 300ms fade before the new scene",
      leaving.page.revealScene === "hai-zhang-wu-insult" &&
        leaving.clayBackground.opacity < 1 &&
        leaving.clayBackground.opacity >= 0 &&
        leaving.insultBackground.opacity === 0,
      {
        clayOpacity: leaving.clayBackground.opacity,
        insultOpacity: leaving.insultBackground.opacity,
      },
    );

    await page.waitForTimeout(330);
    const fadingIn = await readState(page);
    add(
      "the insult illustration fades in after the original scene",
      fadingIn.insultBackground.opacity > 0 &&
        fadingIn.insultBackground.opacity < 1 &&
        fadingIn.insult.opacity < 1,
      {
        insultOpacity: fadingIn.insultBackground.opacity,
        sceneOpacity: fadingIn.insult.opacity,
      },
    );

    await page.waitForTimeout(500);
    const insult = await readState(page);
    add(
      "the new scene keeps 04 reveal active and records its internal route",
      insult.page.current === "reveal" &&
        insult.page.revealScene === "hai-zhang-wu-insult" &&
        insult.nav.active === "reveal" &&
        insult.url.endsWith("/reveal/hai-zhang-wu-insult"),
      { page: insult.page, url: insult.url, nav: insult.nav },
    );
    add(
      "the supplied illustration fills the story area without distortion",
      insult.insultBackground.source.endsWith(
        "/reveal/hai-zhang-wu-insult.png",
      ) &&
        insult.insultBackground.naturalWidth > 0 &&
        insult.insultBackground.naturalWidth /
          insult.insultBackground.naturalHeight >
          1.7 &&
        insult.insultBackground.objectFit === "cover" &&
        insult.insultBackground.objectPosition === "50% 50%" &&
        insult.insultBackground.opacity === 1 &&
        Math.abs(
          insult.insultBackground.rect.width - insult.page.rect.width,
        ) < 1 &&
        Math.abs(
          insult.insultBackground.rect.height - insult.page.rect.height,
        ) < 1,
      insult.insultBackground,
    );
    add(
      "the rice-paper card contains only the supplied copy",
      insult.card.eyebrow === EXPECTED.eyebrow &&
        insult.card.title === EXPECTED.title &&
        insult.card.body === EXPECTED.body &&
        insult.card.opacity === 1 &&
        insult.card.backgroundColor ===
          "rgba(245, 240, 228, 0.88)" &&
        insult.card.boxShadow === "none" &&
        insult.card.borderRadius === "0px",
      insult.card,
    );
    add(
      "the card sits in the right half below navigation",
      insult.card.rect.left > insult.viewport.width * 0.55 &&
        insult.card.rect.right <= insult.viewport.width &&
        insult.card.rect.top > insult.navigationBottom,
      {
        card: insult.card.rect,
        navBottom: insult.navigationBottom,
      },
    );
    add(
      "the green continuation button is aligned with the card",
      insult.marketButton.text === EXPECTED.nextButton &&
        insult.marketButton.backgroundColor === "rgb(66, 93, 80)" &&
        Math.abs(
          insult.marketButton.rect.width - insult.card.rect.width,
        ) < 1 &&
        insult.marketButton.rect.top > insult.card.rect.bottom,
      insult.marketButton,
    );
    add(
      "the original hotspot is inactive while the insult scene is shown",
      insult.hotspot.pointerEvents === "none" &&
        insult.clay.inert &&
        insult.clay.ariaHidden === "true" &&
        !insult.insult.inert &&
        insult.insult.ariaHidden === "false",
      {
        hotspot: insult.hotspot,
        clay: insult.clay,
        insult: insult.insult,
      },
    );

    const insultScreenshot = path.join(
      ROOT,
      "ni-ren-zhang-reveal-insult-1440x900.png",
    );
    await page.screenshot({ path: insultScreenshot, fullPage: true });
    screenshots.push(insultScreenshot);

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(
      () =>
        window.niRenZhangStory?.getCurrentPage() === "reveal" &&
        window.niRenZhangStory?.getRevealScene() ===
          "hai-zhang-wu-insult",
    );
    add(
      "refreshing the internal scene restores the insult illustration",
      normalize(
        await page.locator(".nr-reveal-insult-card h2").textContent(),
      ) === normalize(EXPECTED.title),
    );

    await page.goBack();
    await page.waitForFunction(
      () =>
        window.niRenZhangStory?.getCurrentPage() === "reveal" &&
        window.niRenZhangStory?.getRevealScene() === "clay-reveal",
    );
    await page.waitForTimeout(360);
    const backed = await readState(page);
    add(
      "browser back restores the original reveal scene",
      backed.clay.opacity === 1 &&
        backed.insult.opacity === 0 &&
        !backed.url.endsWith("/hai-zhang-wu-insult"),
      { url: backed.url, page: backed.page },
    );

    await page.locator("#nrRevealContinueButton").click();
    await waitForInsult(page);
    await page.locator("#nrRevealMarketButton").click();
    await page.waitForFunction(
      () => window.niRenZhangStory?.getCurrentPage() === "market",
    );
    add(
      "the insult scene continues into the existing market chapter",
      (await page.evaluate(() => ({
        page: window.niRenZhangStory.getCurrentPage(),
        marketVisible: !document.querySelector("#nrPageMarket").hidden,
        revealHidden: document.querySelector("#nrPageReveal").hidden,
      }))).page === "market",
    );

    await openReveal(page, "/hai-zhang-wu-insult");
    await page.waitForFunction(
      () =>
        window.niRenZhangStory?.getRevealScene() ===
        "hai-zhang-wu-insult",
    );
    add(
      "the internal scene route is directly addressable",
      (await readState(page)).url.endsWith("/reveal/hai-zhang-wu-insult"),
    );
    await context.close();

    for (const viewport of VIEWPORTS) {
      const currentContext = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        hasTouch: Boolean(viewport.hasTouch),
      });
      const current = await currentContext.newPage();
      current.on("pageerror", (error) =>
        errors.push(`${viewport.name}: ${error.message}`),
      );
      current.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(`${viewport.name}: ${message.text()}`);
        }
      });
      try {
        await openReveal(current);
        if (viewport.hasTouch) {
          await current.locator("#nrRevealContinueButton").tap();
        } else {
          await current.locator("#nrRevealContinueButton").click();
        }
        await waitForInsult(current);
        const responsive = await readState(current);
        add(
          `${viewport.name}: illustration and card stay inside the viewport`,
          responsive.insultBackground.naturalWidth /
            responsive.insultBackground.naturalHeight >
            1.7 &&
            ["cover", "contain"].includes(
              responsive.insultBackground.objectFit,
            ) &&
            responsive.card.opacity === 1 &&
            responsive.card.rect.left >= 0 &&
            responsive.card.rect.right <= responsive.viewport.width &&
            responsive.card.rect.top >= responsive.navigationBottom - 1 &&
            responsive.marketButton.rect.bottom <=
              responsive.viewport.height + 1 &&
            responsive.horizontalOverflow === 0,
          {
            background: responsive.insultBackground,
            card: responsive.card.rect,
            button: responsive.marketButton.rect,
            navBottom: responsive.navigationBottom,
            overflow: responsive.horizontalOverflow,
          },
        );
        if (viewport.name === "390x844") {
          const mobileScreenshot = path.join(
            ROOT,
            "ni-ren-zhang-reveal-insult-390x844.png",
          );
          await current.screenshot({
            path: mobileScreenshot,
            fullPage: true,
          });
          screenshots.push(mobileScreenshot);
        }
        if (viewport.hasTouch) {
          await current.locator("#nrRevealMarketButton").tap();
        } else {
          await current.locator("#nrRevealMarketButton").click();
        }
        await current.waitForFunction(
          () => window.niRenZhangStory?.getCurrentPage() === "market",
        );
        add(
          `${viewport.name}: next action opens the existing market page`,
          (await current.locator("#nrPageMarket").isVisible()) &&
            (await current.locator("#nrPageReveal").isHidden()),
        );
      } finally {
        await currentContext.close();
      }
    }
  } finally {
    await browser.close();
  }

  const failed = checks.filter((check) => !check.passed);
  const report = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    assertionCount: checks.length,
    passed: failed.length === 0 && errors.length === 0,
    failed,
    errors,
    screenshots,
    checks,
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      passed: report.passed,
      assertions: report.assertionCount,
      failed: failed.length,
      errors: errors.length,
      report: OUTPUT,
    }),
  );
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
