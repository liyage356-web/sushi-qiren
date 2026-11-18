const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_JSON = path.join(
  ROOT,
  "output",
  "qa-gou-bu-li-immersive.json",
);
const STREET_PARAGRAPHS = [
  "天津人讲吃讲玩不讲穿，把讲穿的事儿留给上海人。上海人重外表，天津人重实惠；人活世上，吃饱第一。天津人说，衣服穿给人看，肉吃在自己肚里；上海人说，穿绫罗绸缎是自己美，吃山珍海味一样是向人显摆。天津人反问：那么狗不理包子呢？吃给谁看？谁吃谁美。",
  "天津人吃的玩的全不贵，吃得解馋玩得过瘾就行。天津人吃的三大样——十八街麻花耳朵眼炸糕狗不理包子，不就是一点面一点糖一点肉吗？玩的三大样——泥人张风筝魏杨柳青年画，不就一块泥一张纸一点颜色吗？非金非银非玉非翡翠非象牙，可在这儿讲究的不是材料，是手艺，不论泥的面的纸的草的布的，到了身怀绝技的手艺人手里一摆弄，就像从天上掉下来的宝贝了。",
];
const SHOP_PARAGRAPHS = [
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

async function capture(page, name) {
  await page.screenshot({
    path: path.join(ROOT, `gou-bu-li-immersive-${name}.png`),
  });
}

async function sceneMetrics(page, expectedParagraphs) {
  return page.evaluate((paragraphs) => {
    const pageElement = document.querySelector(
      "[data-dog-page-panel]:not([hidden])",
    );
    const image = pageElement.querySelector(
      ".dog-opening-image-frame img, .dog-visual-stage > img, .dog-fame-background",
    );
    const visual = pageElement.querySelector(
      ".dog-opening-visual, .dog-visual-stage, .dog-fame-background",
    );
    const article = pageElement.querySelector(
      "[data-dog-reading-surface], .dog-opening-reader, .dog-copy-panel",
    );
    const scroll = pageElement.querySelector(
      "#dogOpeningText, #dogShopIntroText",
    );
    const pageRect = pageElement.getBoundingClientRect();
    const imageRect = image?.getBoundingClientRect();
    const articleRect = article?.getBoundingClientRect();
    const imageStyle = image ? getComputedStyle(image) : null;
    const articleStyle = article ? getComputedStyle(article) : null;
    const bodyParagraphStyle = scroll
      ? getComputedStyle(scroll.querySelector("p"))
      : null;
    const frame = pageElement.querySelector(".dog-opening-image-frame");
    const figure = pageElement.querySelector(".dog-opening-visual");
    const figureStyle = figure ? getComputedStyle(figure) : null;
    const caption = figure?.querySelector("figcaption");

    return {
      page: pageElement.dataset.dogPagePanel,
      sceneId: pageElement.dataset.dogSceneId,
      textPosition: pageElement.dataset.dogTextPosition,
      pageRect: {
        left: pageRect.left,
        top: pageRect.top,
        right: pageRect.right,
        bottom: pageRect.bottom,
        width: pageRect.width,
        height: pageRect.height,
      },
      visualRect: visual
        ? {
            left: visual.getBoundingClientRect().left,
            top: visual.getBoundingClientRect().top,
            right: visual.getBoundingClientRect().right,
            bottom: visual.getBoundingClientRect().bottom,
          }
        : null,
      image: image
        ? {
            loaded: image.complete && image.naturalWidth > 0,
            source: image.getAttribute("src"),
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            objectFit: imageStyle.objectFit,
            objectPosition: imageStyle.objectPosition,
            rect: imageRect
              ? {
                  left: imageRect.left,
                  top: imageRect.top,
                  right: imageRect.right,
                  bottom: imageRect.bottom,
                }
              : null,
          }
        : null,
      article: article
        ? {
            rect: {
              left: articleRect.left,
              top: articleRect.top,
              right: articleRect.right,
              bottom: articleRect.bottom,
              width: articleRect.width,
              height: articleRect.height,
            },
            backgroundColor: articleStyle.backgroundColor,
            backgroundImage: articleStyle.backgroundImage,
            borderWidth: articleStyle.borderWidth,
            boxShadow: articleStyle.boxShadow,
            position: articleStyle.position,
            overflowY: articleStyle.overflowY,
            color: articleStyle.color,
          }
        : null,
      copy: scroll
        ? {
            paragraphs: [...scroll.querySelectorAll(":scope > p")]
              .slice(0, 2)
              .map((paragraph) => paragraph.textContent.trim()),
            expectedParagraphs: paragraphs,
            clientHeight: scroll.clientHeight,
            scrollHeight: scroll.scrollHeight,
            overflowY: getComputedStyle(scroll).overflowY,
            fontSize: bodyParagraphStyle.fontSize,
            lineHeight: bodyParagraphStyle.lineHeight,
            color: bodyParagraphStyle.color,
          }
        : null,
      frame: frame
        ? {
            padding: getComputedStyle(frame).padding,
          }
        : null,
      figure: figureStyle
        ? {
            borderWidth: figureStyle.borderWidth,
            boxShadow: figureStyle.boxShadow,
          }
        : null,
      captionVisible: caption
        ? getComputedStyle(caption).display !== "none"
        : false,
      pageBackgroundImage: getComputedStyle(pageElement).backgroundImage,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  }, expectedParagraphs);
}

async function runViewport(browser, name, options) {
  console.log(`checking ${name}`);
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/street`, {
    waitUntil: "networkidle",
  });
  await page.locator("#dogPageStreet").waitFor({ state: "visible" });
  await page.waitForTimeout(850);
  const street = await sceneMetrics(page, STREET_PARAGRAPHS);
  await capture(page, `${name}-street-top`);

  const backgroundBefore = await page
    .locator("#dogPageStreet .dog-opening-image-frame img")
    .boundingBox();
  await page.evaluate(() => {
    const text = document.querySelector("#dogOpeningText");
    text.scrollTop = (text.scrollHeight - text.clientHeight) * 0.5;
  });
  await page.waitForTimeout(180);
  const backgroundAfter = await page
    .locator("#dogPageStreet .dog-opening-image-frame img")
    .boundingBox();
  const streetMidpoint = await page.evaluate(() => ({
    progress: Number(
      document
        .querySelector("#dogOpeningProgress")
        .getAttribute("aria-valuenow"),
    ),
    state: window.dogBuLiStory.getOpeningState(),
  }));
  console.log(`${name} street midpoint`, streetMidpoint);

  await page.evaluate(() => {
    const text = document.querySelector("#dogOpeningText");
    text.scrollTop = text.scrollHeight;
    text.dispatchEvent(new Event("scroll"));
  });
  await page.waitForFunction(
    () => window.dogBuLiStory.getOpeningState().complete,
    null,
    { timeout: 6000 },
  );
  console.log(`${name} street complete`);
  await page.waitForFunction(
    () => window.dogBuLiStory.getCurrentPage() === "shop",
    null,
    { timeout: 6000 },
  );
  await page.locator("#dogShopIntro").waitFor({ state: "visible" });
  await page.waitForTimeout(900);
  const shopIntro = await sceneMetrics(page, SHOP_PARAGRAPHS);
  console.log(`${name} shop intro`);
  await capture(page, `${name}-shop-intro`);

  await page.evaluate(() => {
    const text = document.querySelector("#dogShopIntroText");
    text.scrollTop = (text.scrollHeight - text.clientHeight) * 0.5;
  });
  await page.waitForTimeout(180);
  const shopMidpoint = await page.evaluate(() =>
    window.dogBuLiStory.getShopIntroState(),
  );
  await page.evaluate(() => {
    const text = document.querySelector("#dogShopIntroText");
    text.scrollTop = text.scrollHeight;
    text.dispatchEvent(new Event("scroll"));
  });
  await page.waitForFunction(
    () => window.dogBuLiStory.getShopIntroState().readingComplete,
    null,
    { timeout: 6000 },
  );
  console.log(`${name} shop complete`);
  await page.waitForFunction(
    () => window.dogBuLiStory.getShopIntroState().complete,
    null,
    { timeout: 6000 },
  );
  await page.waitForTimeout(950);
  const shopMain = await page.evaluate(() => {
    const pageElement = document.querySelector("#dogPageShop");
    const article = pageElement.querySelector(".dog-copy-panel");
    const image = pageElement.querySelector(".dog-visual-stage > img");
    const articleRect = article.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const pageRect = pageElement.getBoundingClientRect();
    return {
      sceneId: pageElement.dataset.dogSceneId,
      textPosition: pageElement.dataset.dogTextPosition,
      stage: pageElement.dataset.dogShopStage,
      imageLoaded: image.complete && image.naturalWidth > 0,
      objectFit: getComputedStyle(image).objectFit,
      objectPosition: getComputedStyle(image).objectPosition,
      imageCoversPage:
        Math.abs(imageRect.left - pageRect.left) <= 1 &&
        Math.abs(imageRect.top - pageRect.top) <= 1 &&
        Math.abs(imageRect.right - pageRect.right) <= 1 &&
        Math.abs(imageRect.bottom - pageRect.bottom) <= 1,
      article: {
        backgroundColor: getComputedStyle(article).backgroundColor,
        borderWidth: getComputedStyle(article).borderWidth,
        boxShadow: getComputedStyle(article).boxShadow,
        rect: {
          left: articleRect.left,
          top: articleRect.top,
          right: articleRect.right,
          bottom: articleRect.bottom,
        },
      },
      portraitVisible:
        getComputedStyle(
          pageElement.querySelector(".dog-portrait-card"),
        ).display !== "none",
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  await capture(page, `${name}-shop-main`);

  await page.evaluate(() => window.dogBuLiStory.showPage("market"));
  await page.waitForTimeout(800);
  const market = await page.evaluate(() => {
    const pageElement = document.querySelector("#dogPageMarket");
    return {
      sceneId: pageElement.dataset.dogSceneId,
      backgroundImage: getComputedStyle(pageElement).backgroundImage,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  await capture(page, `${name}-market`);

  await page.evaluate(() => window.dogBuLiStory.showPage("name"));
  await page.waitForTimeout(800);
  const nameScene = await page.evaluate(() => {
    const pageElement = document.querySelector("#dogPageName");
    return {
      sceneId: pageElement.dataset.dogSceneId,
      backgroundImage: getComputedStyle(pageElement).backgroundImage,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  await capture(page, `${name}-name`);

  await page.evaluate(() => window.dogBuLiStory.showPage("fame"));
  await page.waitForTimeout(800);
  const fame = await page.evaluate(() => {
    const pageElement = document.querySelector("#dogPageFame");
    const image = pageElement.querySelector(".dog-fame-background");
    return {
      sceneId: pageElement.dataset.dogSceneId,
      imageLoaded: image.complete && image.naturalWidth > 0,
      objectFit: getComputedStyle(image).objectFit,
      objectPosition: getComputedStyle(image).objectPosition,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  await capture(page, `${name}-fame`);

  await page.evaluate(() => window.dogBuLiStory.showPage("reflection"));
  await page.waitForTimeout(800);
  const reflection = await page.evaluate(() => {
    const pageElement = document.querySelector("#dogPageReflection");
    return {
      sceneId: pageElement.dataset.dogSceneId,
      backgroundImage: getComputedStyle(pageElement).backgroundImage,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  await capture(page, `${name}-reflection`);

  const configPositions = await page.evaluate(() =>
    Object.fromEntries(
      Object.entries(window.GOU_BU_LI_SCENE_LAYOUTS).map(
        ([key, config]) => [
          key,
          {
            sceneId: config.sceneId,
            backgroundPosition: config.backgroundPosition,
            textPosition: config.textPosition,
            textWidth: config.textWidth,
            mobileTextPosition: config.mobile?.textPosition,
          },
        ],
      ),
    ),
  );

  await context.close();
  return {
    street,
    streetMidpoint,
    backgroundStable:
      backgroundBefore &&
      backgroundAfter &&
      Math.abs(backgroundBefore.x - backgroundAfter.x) < 0.1 &&
      Math.abs(backgroundBefore.y - backgroundAfter.y) < 0.1 &&
      Math.abs(backgroundBefore.width - backgroundAfter.width) < 0.1 &&
      Math.abs(backgroundBefore.height - backgroundAfter.height) < 0.1,
    shopIntro,
    shopMidpoint,
    shopMain,
    market,
    nameScene,
    fame,
    reflection,
    configPositions,
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
    const tablet = await runViewport(browser, "tablet-1024", {
      viewport: { width: 1024, height: 768 },
      deviceScaleFactor: 1,
    });
    const mobile = await runViewport(browser, "mobile-390", {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const pageCoversViewport = (metrics) =>
      Math.abs(metrics.visualRect.left - metrics.pageRect.left) <= 1 &&
      Math.abs(metrics.visualRect.top - metrics.pageRect.top) <= 1 &&
      Math.abs(metrics.visualRect.right - metrics.pageRect.right) <= 1 &&
      Math.abs(metrics.visualRect.bottom - metrics.pageRect.bottom) <= 1;
    const textInsideViewport = (metrics) =>
      metrics.article.rect.left >= -1 &&
      metrics.article.rect.top >= -1 &&
      metrics.article.rect.right <= metrics.pageRect.right + 1 &&
      metrics.article.rect.bottom <= metrics.pageRect.bottom + 1;
    const exactCopy = (metrics) =>
      metrics.copy.paragraphs.every(
        (paragraph, index) =>
          normalize(paragraph) ===
          normalize(metrics.copy.expectedParagraphs[index]),
      );
    const transparentSurface = (metrics) =>
      metrics.article.backgroundColor === "rgba(0, 0, 0, 0)" &&
      metrics.article.borderWidth === "0px" &&
      metrics.article.boxShadow === "none";
    const fontInRange = (metrics) => {
      const size = Number.parseFloat(metrics.copy.fontSize);
      const lineHeight = Number.parseFloat(metrics.copy.lineHeight);
      return size >= 15 && size <= 22 && lineHeight / size >= 1.75;
    };

    const scenes = [desktop, tablet, mobile];
    const assertions = {
      desktopImageCoversViewport: pageCoversViewport(desktop.street),
      mobileImageCoversViewport: pageCoversViewport(mobile.street),
      imagesUseCover: scenes.every(
        (scene) =>
          scene.street.image.objectFit === "cover" &&
          scene.shopIntro.image.objectFit === "cover" &&
          scene.shopMain.objectFit === "cover",
      ),
      oldFramesRemoved: scenes.every(
        (scene) =>
          scene.street.frame.padding === "0px" &&
          scene.street.figure.borderWidth === "0px" &&
          scene.street.figure.boxShadow === "none" &&
          !scene.street.captionVisible &&
          !scene.shopIntro.captionVisible,
      ),
      readingSurfacesAreTransparent: scenes.every(
        (scene) =>
          transparentSurface(scene.street) &&
          transparentSurface(scene.shopIntro) &&
          scene.shopMain.article.backgroundColor === "rgba(0, 0, 0, 0)" &&
          scene.shopMain.article.borderWidth === "0px" &&
          scene.shopMain.article.boxShadow === "none",
      ),
      textLayersStayInsideViewport: scenes.every(
        (scene) =>
          textInsideViewport(scene.street) &&
          textInsideViewport(scene.shopIntro),
      ),
      longCopyScrolls: scenes.every(
        (scene) =>
          scene.street.copy.scrollHeight > scene.street.copy.clientHeight &&
          scene.shopIntro.copy.scrollHeight >
            scene.shopIntro.copy.clientHeight,
      ),
      progressUpdates: scenes.every(
        (scene) =>
          scene.streetMidpoint.progress > 0 &&
          scene.streetMidpoint.progress < 100 &&
          scene.shopMidpoint.scrollTop > 0,
      ),
      backgroundsStayStable: scenes.every(
        (scene) => scene.backgroundStable,
      ),
      originalCopyExact: scenes.every(
        (scene) => exactCopy(scene.street) && exactCopy(scene.shopIntro),
      ),
      typographyReadable: scenes.every(
        (scene) =>
          fontInRange(scene.street) && fontInRange(scene.shopIntro),
      ),
      portraitCardRemoved: scenes.every((scene) => !scene.shopMain.portraitVisible),
      shopMainUsesDedicatedScene:
        desktop.shopMain.sceneId === "busy-baozi-shop" &&
        desktop.street.sceneId === "tianjin-street-market" &&
        desktop.shopIntro.sceneId === "riverside-baozi-stall",
      scenePositionsAreConfigurable:
        new Set(
          Object.values(desktop.configPositions).map(
            (scene) => scene.backgroundPosition,
          ),
        ).size >= 4 &&
        desktop.configPositions.market.textPosition === "center" &&
        desktop.configPositions.name.textPosition === "left" &&
        desktop.configPositions.fame.textPosition === "left",
      chapterBackgroundsUpdate:
        desktop.market.sceneId === "busy-baozi-shop-market" &&
        desktop.nameScene.sceneId === "busy-baozi-shop-name" &&
        desktop.fame.sceneId === "fame-out-of-tianjin" &&
        desktop.reflection.sceneId === "tianjin-street-reflection",
      fameUsesIllustrationCover:
        desktop.fame.imageLoaded &&
        desktop.fame.objectFit === "cover" &&
        mobile.fame.imageLoaded &&
        mobile.fame.objectFit === "cover",
      noHorizontalOverflow: scenes.every(
        (scene) =>
          scene.street.overflow <= 0 &&
          scene.market.overflow <= 0 &&
          scene.nameScene.overflow <= 0 &&
          scene.fame.overflow <= 0 &&
          scene.reflection.overflow <= 0,
      ),
      noBrowserErrors: scenes.every(
        (scene) =>
          scene.errors.pageErrors.length === 0 &&
          scene.errors.consoleErrors.length === 0,
      ),
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
      tablet,
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
