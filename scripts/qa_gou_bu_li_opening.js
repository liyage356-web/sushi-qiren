const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const OUTPUT_DIR = path.resolve(__dirname, "..");
const OUTPUT_JSON = path.join(
  OUTPUT_DIR,
  "output",
  "qa-gou-bu-li-opening.json",
);
const EXPECTED_PARAGRAPHS = [
  "天津人讲吃讲玩不讲穿，把讲穿的事儿留给上海人。上海人重外表，天津人重实惠；人活世上，吃饱第一。天津人说，衣服穿给人看，肉吃在自己肚里；上海人说，穿绫罗绸缎是自己美，吃山珍海味一样是向人显摆。天津人反问：那么狗不理包子呢？吃给谁看？谁吃谁美。",
  "天津人吃的玩的全不贵，吃得解馋玩得过瘾就行。天津人吃的三大样——十八街麻花耳朵眼炸糕狗不理包子，不就是一点面一点糖一点肉吗？玩的三大样——泥人张风筝魏杨柳青年画，不就一块泥一张纸一点颜色吗？非金非银非玉非翡翠非象牙，可在这儿讲究的不是材料，是手艺，不论泥的面的纸的草的布的，到了身怀绝技的手艺人手里一摆弄，就像从天上掉下来的宝贝了。",
];
const EXPECTED_IMAGE =
  "gou-bu-li/assets/tianjin-street-goubuli-gathering.png";
const EXPECTED_SHOP_INTRO_IMAGE =
  "gou-bu-li/assets/jiangpan-baozi-shop-morning.png";
const EXPECTED_SHOP_BACKGROUND =
  "gou-bu-li/assets/busy-morning-bao-shop.png";
const EXPECTED_SHOP_PARAGRAPHS = [
  "运河边上卖包子的狗子，是当年跟随他爹打武清来到天津的。他的大名高贵友，只有他爹知道；别人知道的是他爹天天呼他叫他的小名：狗子。那时候穷人家的孩子不好活，都得起个贱名，狗子、狗剩、梆子、二傻、疙瘩等等，为了叫阎王爷听见不当个东西，看不上，想不到，领不走。在市面上谁拿这种狗子当人，有活儿叫他干就是了。他爹的大名也没人知道，只知道姓高，人称他老高；狗子人蔫不说话，可嘴上不说话的人，心里不见得没想法。",
  "老高没能耐，他卖的包子不过一块面皮包一团馅，皮厚馅少，肉少菜多，这种包子专卖给在码头扛活儿的脚夫吃。干重活的人，有点肉就有吃头，皮厚了反倒能搪时候。反正有人吃就有钱赚，不管多少，能养活一家人就给老天爷磕头了。",
];
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

function normalize(text) {
  return text.replace(/\s+/g, "");
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

  await page.goto(
    `${PAGE_ORIGIN}index.html#gou-bu-li/street`,
    { waitUntil: "networkidle" },
  );
  await page
    .locator("#dogPageStreet")
    .waitFor({ state: "visible" });

  const initial = await page.evaluate((expectedImage) => {
    const image = document.querySelector(".dog-opening-image-frame img");
    const visual = document.querySelector(".dog-opening-visual");
    const reader = document.querySelector(".dog-opening-reader");
    const text = document.querySelector("#dogOpeningText");
    const paragraphText = [...text.querySelectorAll(":scope > p")]
      .slice(0, 2)
      .map((paragraph) => paragraph.textContent);
    const visualRect = visual.getBoundingClientRect();
    const readerRect = reader.getBoundingClientRect();
    return {
      imageLoaded: image.complete && image.naturalWidth > 0,
      imageSource: image.getAttribute("src"),
      expectedImage,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      objectFit: getComputedStyle(image).objectFit,
      paragraphs: paragraphText,
      scrollTop: text.scrollTop,
      clientHeight: text.clientHeight,
      scrollHeight: text.scrollHeight,
      progress: Number(
        document
          .querySelector("#dogOpeningProgress")
          .getAttribute("aria-valuenow"),
      ),
      visualRect: {
        left: visualRect.left,
        right: visualRect.right,
        top: visualRect.top,
        bottom: visualRect.bottom,
      },
      readerRect: {
        left: readerRect.left,
        right: readerRect.right,
        top: readerRect.top,
        bottom: readerRect.bottom,
      },
      overflow:
        document.documentElement.scrollWidth - window.innerWidth,
    };
  }, EXPECTED_IMAGE);

  await page.waitForTimeout(1200);
  const stillOnOpening = await page.evaluate(
    () => window.dogBuLiStory.getCurrentPage(),
  );

  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      `gou-bu-li-opening-${name}.png`,
    ),
  });

  await page.evaluate(() => {
    const text = document.querySelector("#dogOpeningText");
    text.scrollTop =
      (text.scrollHeight - text.clientHeight) * 0.5;
  });
  await page.waitForTimeout(160);
  const midpoint = await page.evaluate(() => ({
    page: window.dogBuLiStory.getCurrentPage(),
    progress: Number(
      document
        .querySelector("#dogOpeningProgress")
        .getAttribute("aria-valuenow"),
    ),
    state: window.dogBuLiStory.getOpeningState(),
  }));

  await page.evaluate(() => {
    const text = document.querySelector("#dogOpeningText");
    text.scrollTop = text.scrollHeight;
  });
  await page.waitForFunction(
    () => window.dogBuLiStory.getOpeningState().complete,
  );
  const completed = await page.evaluate(() => ({
    pageBeforeTransition: window.dogBuLiStory.getCurrentPage(),
    progress: Number(
      document
        .querySelector("#dogOpeningProgress")
        .getAttribute("aria-valuenow"),
    ),
    state: window.dogBuLiStory.getOpeningState(),
  }));
  await page.waitForFunction(
    () => window.dogBuLiStory.getCurrentPage() === "shop",
    null,
    { timeout: 6000 },
  );
  await page.waitForTimeout(900);
  await page.locator("#dogShopIntro").waitFor({ state: "visible" });
  const shopInitial = await page.evaluate(
    ({ introImage, backgroundImage }) => {
      const intro = document.querySelector("#dogShopIntro");
      const reader = intro.querySelector(".dog-opening-reader");
      const visual = intro.querySelector(".dog-opening-visual");
      const text = document.querySelector("#dogShopIntroText");
      const image = intro.querySelector(".dog-opening-image-frame img");
      const main = document.querySelector("#dogShopMain");
      const background = document.querySelector(
        "#dogShopMain .dog-visual-stage > img",
      );
      const visualRect = visual.getBoundingClientRect();
      const readerRect = reader.getBoundingClientRect();
      return {
        imageLoaded: image.complete && image.naturalWidth > 0,
        imageSource: image.getAttribute("src"),
        expectedImage: introImage,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        objectFit: getComputedStyle(image).objectFit,
        backgroundSource: background.getAttribute("src"),
        expectedBackground: backgroundImage,
        paragraphs: [...text.querySelectorAll(":scope > p")]
          .slice(0, 2)
          .map((paragraph) => paragraph.textContent),
        scrollTop: text.scrollTop,
        clientHeight: text.clientHeight,
        scrollHeight: text.scrollHeight,
        progress: Number(
          document
            .querySelector("#dogShopIntroProgress")
            .getAttribute("aria-valuenow"),
        ),
        mainHidden: main.hidden,
        stage: document
          .querySelector("#dogPageShop")
          .getAttribute("data-dog-shop-stage"),
        visualRect: {
          left: visualRect.left,
          right: visualRect.right,
          top: visualRect.top,
          bottom: visualRect.bottom,
        },
        readerRect: {
          left: readerRect.left,
          right: readerRect.right,
          top: readerRect.top,
          bottom: readerRect.bottom,
        },
        overflow:
          document.documentElement.scrollWidth - window.innerWidth,
      };
    },
    {
      introImage: EXPECTED_SHOP_INTRO_IMAGE,
      backgroundImage: EXPECTED_SHOP_BACKGROUND,
    },
  );
  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      `gou-bu-li-shop-intro-${name}.png`,
    ),
  });

  await page.waitForTimeout(1100);
  const shopStillOnIntro = await page.evaluate(
    () => window.dogBuLiStory.getShopIntroState(),
  );
  await page.evaluate(() => {
    const text = document.querySelector("#dogShopIntroText");
    text.scrollTop =
      (text.scrollHeight - text.clientHeight) * 0.5;
  });
  await page.waitForTimeout(160);
  const shopMidpoint = await page.evaluate(() => ({
    state: window.dogBuLiStory.getShopIntroState(),
    progress: Number(
      document
        .querySelector("#dogShopIntroProgress")
        .getAttribute("aria-valuenow"),
    ),
  }));
  await page.evaluate(() => {
    const text = document.querySelector("#dogShopIntroText");
    text.scrollTop = text.scrollHeight;
  });
  await page.waitForFunction(
    () => window.dogBuLiStory.getShopIntroState().readingComplete,
  );
  const shopCompleted = await page.evaluate(() => ({
    state: window.dogBuLiStory.getShopIntroState(),
    progress: Number(
      document
        .querySelector("#dogShopIntroProgress")
        .getAttribute("aria-valuenow"),
    ),
  }));
  await page.waitForFunction(
    () => window.dogBuLiStory.getShopIntroState().complete,
    null,
    { timeout: 6000 },
  );
  await page.waitForTimeout(850);
  await page.locator("#dogShopMain").waitFor({ state: "visible" });
  const shopFinal = await page.evaluate(() => {
    const image = document.querySelector(
      "#dogShopMain .dog-visual-stage > img",
    );
    return {
      currentPage: window.dogBuLiStory.getCurrentPage(),
      stage: document
        .querySelector("#dogPageShop")
        .getAttribute("data-dog-shop-stage"),
      introHidden: document.querySelector("#dogShopIntro").hidden,
      mainVisible: !document.querySelector("#dogShopMain").hidden,
      backgroundSource: image.getAttribute("src"),
      backgroundLoaded: image.complete && image.naturalWidth > 0,
      backgroundNaturalWidth: image.naturalWidth,
      backgroundNaturalHeight: image.naturalHeight,
    };
  });
  await page.screenshot({
    path: path.join(
      OUTPUT_DIR,
      `gou-bu-li-shop-main-${name}.png`,
    ),
  });

  const result = {
    image: {
      loaded: initial.imageLoaded,
      source: initial.imageSource,
      sourceMatches: initial.imageSource === initial.expectedImage,
      naturalWidth: initial.naturalWidth,
      naturalHeight: initial.naturalHeight,
      objectFit: initial.objectFit,
    },
    copy: {
      exactParagraphs:
        initial.paragraphs.length === EXPECTED_PARAGRAPHS.length &&
        initial.paragraphs.every(
          (paragraph, index) =>
            normalize(paragraph) ===
            normalize(EXPECTED_PARAGRAPHS[index]),
        ),
    },
    scroll: {
      initialAtTop: initial.scrollTop === 0,
      initialProgress: initial.progress,
      overflowDistance: initial.scrollHeight - initial.clientHeight,
      midpointProgress: midpoint.progress,
      completedProgress: completed.progress,
    },
    layout: {
      desktopSideBySide:
        name === "mobile" ||
        initial.visualRect.right < initial.readerRect.left,
      mobileStacked:
        name !== "mobile" ||
        initial.visualRect.bottom < initial.readerRect.top,
      noHorizontalOverflow: initial.overflow <= 0,
    },
    transition: {
      stayedBeforeReading: stillOnOpening === "street",
      stayedAtMidpoint: midpoint.page === "street",
      completedBeforeAdvance:
        completed.pageBeforeTransition === "street",
      enteredShop:
        (await page.evaluate(
          () => window.dogBuLiStory.getCurrentPage(),
        )) === "shop",
    },
    shopIntro: {
      image: {
        loaded: shopInitial.imageLoaded,
        source: shopInitial.imageSource,
        sourceMatches:
          shopInitial.imageSource === shopInitial.expectedImage,
        naturalWidth: shopInitial.naturalWidth,
        naturalHeight: shopInitial.naturalHeight,
        objectFit: shopInitial.objectFit,
      },
      copy: {
        exactParagraphs:
          shopInitial.paragraphs.length ===
            EXPECTED_SHOP_PARAGRAPHS.length &&
          shopInitial.paragraphs.every(
            (paragraph, index) =>
              normalize(paragraph) ===
              normalize(EXPECTED_SHOP_PARAGRAPHS[index]),
          ),
      },
      scroll: {
        initialAtTop: shopInitial.scrollTop === 0,
        initialProgress: shopInitial.progress,
        overflowDistance:
          shopInitial.scrollHeight - shopInitial.clientHeight,
        midpointProgress: shopMidpoint.progress,
        completedProgress: shopCompleted.progress,
      },
      layout: {
        desktopSideBySide:
          name === "mobile" ||
          shopInitial.visualRect.right < shopInitial.readerRect.left,
        mobileStacked:
          name !== "mobile" ||
          shopInitial.visualRect.bottom < shopInitial.readerRect.top,
        noHorizontalOverflow: shopInitial.overflow <= 0,
        initiallyOnIntro:
          shopInitial.mainHidden && shopInitial.stage === "intro",
      },
      transition: {
        stayedBeforeReading:
          !shopStillOnIntro.complete &&
          !shopStillOnIntro.readingComplete,
        stayedAtMidpoint:
          !shopMidpoint.state.complete &&
          !shopMidpoint.state.readingComplete,
        completedBeforeAdvance:
          shopCompleted.state.readingComplete &&
          !shopCompleted.state.complete,
        enteredMain:
          shopFinal.currentPage === "shop" &&
          shopFinal.stage === "main" &&
          shopFinal.introHidden &&
          shopFinal.mainVisible,
      },
      background: {
        sourceMatches:
          shopFinal.backgroundSource === EXPECTED_SHOP_BACKGROUND,
        loaded: shopFinal.backgroundLoaded,
        naturalWidth: shopFinal.backgroundNaturalWidth,
        naturalHeight: shopFinal.backgroundNaturalHeight,
      },
    },
    errors: {
      pageErrors,
      consoleErrors,
    },
  };

  await context.close();
  return result;
}

async function run() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const results = {
    generatedAt: new Date().toISOString(),
    pageOrigin: PAGE_ORIGIN,
    desktop: await runViewport(browser, "desktop", {
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
    }),
    wide: await runViewport(browser, "wide", {
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    }),
    mobile: await runViewport(browser, "mobile", {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    }),
  };
  await browser.close();

  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(
    OUTPUT_JSON,
    JSON.stringify(results, null, 2),
    "utf8",
  );

  const assertions = {
    exactSourceImage: [results.desktop, results.wide, results.mobile].every(
      (result) =>
        result.image.loaded &&
        result.image.sourceMatches &&
        result.image.objectFit === "contain",
    ),
    exactParagraphs: [results.desktop, results.wide, results.mobile].every(
      (result) => result.copy.exactParagraphs,
    ),
    textReallyScrolls: [results.desktop, results.wide, results.mobile].every(
      (result) => result.scroll.overflowDistance > 20,
    ),
    progressAdvances: [results.desktop, results.wide, results.mobile].every(
      (result) =>
        result.scroll.initialProgress === 0 &&
        result.scroll.midpointProgress >= 35 &&
        result.scroll.midpointProgress <= 65 &&
        result.scroll.completedProgress === 100,
    ),
    desktopSideBySide:
      results.desktop.layout.desktopSideBySide &&
      results.wide.layout.desktopSideBySide,
    mobileStacked: results.mobile.layout.mobileStacked,
    noHorizontalOverflow: [results.desktop, results.wide, results.mobile].every(
      (result) =>
        result.layout.noHorizontalOverflow &&
        result.shopIntro.layout.noHorizontalOverflow,
    ),
    noPrematureAdvance: [results.desktop, results.wide, results.mobile].every(
      (result) =>
        result.transition.stayedBeforeReading &&
        result.transition.stayedAtMidpoint,
    ),
    readsToBottomThenAdvances: [
      results.desktop,
      results.wide,
      results.mobile,
    ].every(
      (result) =>
        result.transition.completedBeforeAdvance &&
        result.transition.enteredShop,
    ),
    exactShopIntroImage: [
      results.desktop,
      results.wide,
      results.mobile,
    ].every(
      (result) =>
        result.shopIntro.image.loaded &&
        result.shopIntro.image.sourceMatches &&
        result.shopIntro.image.objectFit === "contain",
    ),
    exactShopParagraphs: [
      results.desktop,
      results.wide,
      results.mobile,
    ].every((result) => result.shopIntro.copy.exactParagraphs),
    shopIntroTextReallyScrolls: [
      results.desktop,
      results.wide,
      results.mobile,
    ].every((result) => result.shopIntro.scroll.overflowDistance > 20),
    shopIntroProgressAdvances: [
      results.desktop,
      results.wide,
      results.mobile,
    ].every(
      (result) =>
        result.shopIntro.scroll.initialProgress === 0 &&
        result.shopIntro.scroll.midpointProgress >= 35 &&
        result.shopIntro.scroll.midpointProgress <= 65 &&
        result.shopIntro.scroll.completedProgress === 100,
    ),
    shopIntroLayout:
      results.desktop.shopIntro.layout.desktopSideBySide &&
      results.wide.shopIntro.layout.desktopSideBySide &&
      results.mobile.shopIntro.layout.mobileStacked &&
      [
        results.desktop,
        results.wide,
        results.mobile,
      ].every((result) => result.shopIntro.layout.initiallyOnIntro),
    shopIntroNoPrematureAdvance: [
      results.desktop,
      results.wide,
      results.mobile,
    ].every(
      (result) =>
        result.shopIntro.transition.stayedBeforeReading &&
        result.shopIntro.transition.stayedAtMidpoint,
    ),
    shopIntroReadsThenEntersMain: [
      results.desktop,
      results.wide,
      results.mobile,
    ].every(
      (result) =>
        result.shopIntro.transition.completedBeforeAdvance &&
        result.shopIntro.transition.enteredMain,
    ),
    exactShopBackground: [
      results.desktop,
      results.wide,
      results.mobile,
    ].every(
      (result) =>
        result.shopIntro.background.sourceMatches &&
        result.shopIntro.background.loaded,
    ),
    noBrowserErrors: [results.desktop, results.wide, results.mobile].every(
      (result) =>
        result.errors.pageErrors.length === 0 &&
        result.errors.consoleErrors.length === 0,
    ),
  };
  results.assertions = assertions;
  fs.writeFileSync(
    OUTPUT_JSON,
    JSON.stringify(results, null, 2),
    "utf8",
  );

  console.log(JSON.stringify({ assertions, results }, null, 2));
  if (!Object.values(assertions).every(Boolean)) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
