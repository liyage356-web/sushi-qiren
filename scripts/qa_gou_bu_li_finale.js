const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_JSON = path.join(ROOT, "output", "qa-gou-bu-li-finale.json");
const BROWSER_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function browserExecutable() {
  const executable = BROWSER_CANDIDATES.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

async function runViewport(browser, name, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/market`, {
    waitUntil: "networkidle",
  });
  await page.locator("#dogPageMarket").waitFor({ state: "visible" });

  const initialAudio = await page.evaluate(() => ({
    state: window.dogBuLiStory.getAudioState(),
    pressed: document
      .querySelector("#dogAudioToggle")
      .getAttribute("aria-pressed"),
    label: document.querySelector("#dogAudioToggle").textContent.trim(),
  }));

  await page.locator("[data-dog-market-item]").nth(0).click();
  await page.locator("[data-dog-market-item]").nth(1).click();
  await page.locator("[data-dog-market-item]").nth(2).click();
  await page.waitForTimeout(460);
  const market = await page.evaluate(() => {
    const stage = document.querySelector(".dog-market-stage");
    const saying = document.querySelector("#dogMarketSaying");
    return {
      state: window.dogBuLiStory.getMarketState(),
      progress: document.querySelector("#dogMarketProgress").textContent,
      pressed: [...document.querySelectorAll("[data-dog-market-item]")].map(
        (item) => item.getAttribute("aria-pressed"),
      ),
      completeClass: stage.classList.contains("is-complete"),
      sayingOpacity: Number(getComputedStyle(saying).opacity),
      hint: document.querySelector("#dogMarketHint").textContent.trim(),
      nextUnlocked: document
        .querySelector('[data-dog-page="name"]')
        .classList.contains("is-story-unlocked"),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  await page.screenshot({
    path: path.join(ROOT, `gou-bu-li-market-${name}.png`),
  });

  await page.locator('[data-dog-next="name"]').click();
  await page.locator("#dogPageName").waitFor({ state: "visible" });
  const signInitiallyDisabled = await page
    .locator("#dogNameSign")
    .isDisabled();
  for (let index = 0; index < 3; index += 1) {
    await page.locator("[data-dog-talk]").nth(index).click();
  }
  await page.waitForTimeout(120);
  const nameReady = await page.evaluate(() => ({
    state: window.dogBuLiStory.getNameState(),
    signDisabled: document.querySelector("#dogNameSign").disabled,
    talkPressed: [...document.querySelectorAll("[data-dog-talk]")].map(
      (card) => card.getAttribute("aria-pressed"),
    ),
    hint: document.querySelector("#dogNameHint").textContent.trim(),
  }));
  await page.screenshot({
    path: path.join(ROOT, `gou-bu-li-name-ready-${name}.png`),
  });

  for (let index = 0; index < 3; index += 1) {
    await page.locator("#dogNameSign").click({ force: true });
    await page.waitForTimeout(420);
  }
  const nameComplete = await page.evaluate(() => ({
    state: window.dogBuLiStory.getNameState(),
    signDisabled: document.querySelector("#dogNameSign").disabled,
    completeClass: document
      .querySelector("#dogNameSign")
      .classList.contains("is-complete"),
    characters: [...document.querySelectorAll("[data-dog-sign-char]")].map(
      (character) => ({
        text: character.textContent,
        revealed: character.classList.contains("is-revealed"),
        opacity: Number(getComputedStyle(character).opacity),
      }),
    ),
    hint: document.querySelector("#dogNameHint").textContent.trim(),
    fameUnlocked: document
      .querySelector('[data-dog-page="fame"]')
      .classList.contains("is-story-unlocked"),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  await page.screenshot({
    path: path.join(ROOT, `gou-bu-li-name-complete-${name}.png`),
  });

  await page.locator('[data-dog-next="fame"]').click();
  await page.locator("#dogPageFame").waitFor({ state: "visible" });
  const fameStages = [];
  for (let index = 0; index < 3; index += 1) {
    await page.locator("#dogFameAdvance").click();
    await page.waitForTimeout(100);
    fameStages.push(
      await page.evaluate(() => ({
        ...window.dogBuLiStory.getFameState(),
        quote: document.querySelector("#dogFameQuote").textContent.trim(),
        progress: document.querySelector("#dogFameProgress").textContent,
        activeStop: [...document.querySelectorAll("[data-dog-fame-stop]")]
          .findIndex((stop) => stop.classList.contains("is-active")),
      })),
    );
  }
  const fameComplete = await page.evaluate(() => ({
    state: window.dogBuLiStory.getFameState(),
    advanceDisabled: document.querySelector("#dogFameAdvance").disabled,
    reflectionUnlocked: document
      .querySelector('[data-dog-page="reflection"]')
      .classList.contains("is-story-unlocked"),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  await page.screenshot({
    path: path.join(ROOT, `gou-bu-li-fame-complete-${name}.png`),
  });

  await page.locator('[data-dog-next="reflection"]').click();
  await page.locator("#dogPageReflection").waitFor({ state: "visible" });
  await page.waitForTimeout(420);
  await page.locator("[data-dog-reflection-option]").nth(0).click();
  await page.locator("[data-dog-reflection-option]").nth(4).click();
  await page.locator("#dogReflectionText").fill(
    "他不爱说话，却把心思都放进了包子里。",
  );
  await page.locator("#dogReflectionSave").click();
  const reflection = await page.evaluate(() => ({
    selected: [...document.querySelectorAll(
      "[data-dog-reflection-option][aria-pressed='true']",
    )].map((button) => button.dataset.dogReflectionOption),
    text: document.querySelector("#dogReflectionText").value,
    status: document.querySelector("#dogReflectionStatus").textContent.trim(),
    stored: JSON.parse(
      localStorage.getItem("sushi-qiren-gou-bu-li-reflection-v1"),
    ),
    activeNav: (() => {
      const nav = document.querySelector(".dog-step-nav");
      const active = nav.querySelector('[aria-current="page"]');
      const navRect = nav.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      return {
        label: active.querySelector("strong").textContent,
        scrollLeft: nav.scrollLeft,
        visible:
          activeRect.left >= navRect.left &&
          activeRect.right <= navRect.right,
      };
    })(),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  await page.screenshot({
    path: path.join(ROOT, `gou-bu-li-reflection-${name}.png`),
  });

  await page.locator("#dogAudioToggle").click();
  await page.waitForTimeout(600);
  const audioOn = await page.evaluate(() => ({
    state: window.dogBuLiStory.getAudioState(),
    pressed: document
      .querySelector("#dogAudioToggle")
      .getAttribute("aria-pressed"),
    label: document.querySelector("#dogAudioToggle").textContent.trim(),
  }));
  await page.locator("#dogAudioToggle").click();
  const audioOff = await page.evaluate(() => ({
    state: window.dogBuLiStory.getAudioState(),
    pressed: document
      .querySelector("#dogAudioToggle")
      .getAttribute("aria-pressed"),
  }));

  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#dogPageReflection").waitFor({ state: "visible" });
  const reflectionReload = await page.evaluate(() => ({
    selected: [...document.querySelectorAll(
      "[data-dog-reflection-option][aria-pressed='true']",
    )].map((button) => button.dataset.dogReflectionOption),
    text: document.querySelector("#dogReflectionText").value,
    status: document.querySelector("#dogReflectionStatus").textContent.trim(),
  }));

  await context.close();
  return {
    initialAudio,
    market,
    signInitiallyDisabled,
    nameReady,
    nameComplete,
    fameStages,
    fameComplete,
    reflection,
    reflectionReload,
    audioOn,
    audioOff,
    errors: { pageErrors, consoleErrors },
  };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  try {
    const desktop = await runViewport(browser, "desktop", {
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
    });
    const mobile = await runViewport(browser, "mobile-390", {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const assertions = {
      marketCompletes: desktop.market.state.complete,
      marketShowsThreeOfThree:
        desktop.market.progress.trim() === "3 / 3",
      marketRevealsSaying: desktop.market.sayingOpacity === 1,
      marketUnlocksName: desktop.market.nextUnlocked,
      nameInitiallyLocked: desktop.signInitiallyDisabled,
      threeTalksEnableSign:
        !desktop.nameReady.signDisabled &&
        desktop.nameReady.state.talksHeard.length === 3,
      threeClicksRevealName:
        desktop.nameComplete.state.revealedCharacters === 3 &&
        desktop.nameComplete.characters.every(
          (character) => character.revealed && character.opacity === 1,
        ),
      nameUnlocksFame: desktop.nameComplete.fameUnlocked,
      fameHasThreeStages:
        desktop.fameStages.length === 3 &&
        desktop.fameComplete.state.stage === 3,
      fameStagesAdvanceInOrder:
        desktop.fameStages.map((item) => item.activeStop).join(",") ===
        "0,1,2",
      fameUnlocksReflection: desktop.fameComplete.reflectionUnlocked,
      reflectionSaves:
        desktop.reflection.selected.join(",") === "用心,手艺" &&
        desktop.reflection.text.includes("心思") &&
        desktop.reflection.stored.text === desktop.reflection.text,
      reflectionReloads:
        desktop.reflectionReload.selected.join(",") === "用心,手艺" &&
        desktop.reflectionReload.text === desktop.reflection.text,
      audioStartsOff:
        !desktop.initialAudio.state.enabled &&
        desktop.initialAudio.pressed === "false",
      audioToggles:
        desktop.audioOn.state.enabled &&
        desktop.audioOn.pressed === "true" &&
        !desktop.audioOff.state.enabled,
      desktopNoHorizontalOverflow:
        desktop.market.overflow <= 0 &&
        desktop.nameComplete.overflow <= 0 &&
        desktop.fameComplete.overflow <= 0 &&
        desktop.reflection.overflow <= 0,
      desktopNavigationShowsActive:
        desktop.reflection.activeNav.label === "读后" &&
        desktop.reflection.activeNav.visible,
      mobileNoHorizontalOverflow:
        mobile.market.overflow <= 0 &&
        mobile.nameComplete.overflow <= 0 &&
        mobile.fameComplete.overflow <= 0 &&
        mobile.reflection.overflow <= 0,
      mobileNavigationShowsActive:
        mobile.reflection.activeNav.label === "读后" &&
        mobile.reflection.activeNav.visible,
      desktopNoBrowserErrors:
        desktop.errors.pageErrors.length === 0 &&
        desktop.errors.consoleErrors.length === 0,
      mobileNoBrowserErrors:
        mobile.errors.pageErrors.length === 0 &&
        mobile.errors.consoleErrors.length === 0,
    };
    const failed = Object.entries(assertions)
      .filter(([, passed]) => !passed)
      .map(([label]) => label);
    const output = {
      generatedAt: new Date().toISOString(),
      pageOrigin: PAGE_ORIGIN,
      assertions,
      failed,
      passed: failed.length === 0,
      desktop,
      mobile,
    };
    fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2));
    console.log(JSON.stringify(output, null, 2));
    if (failed.length > 0) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
