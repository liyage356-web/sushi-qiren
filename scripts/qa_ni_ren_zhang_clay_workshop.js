const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  "C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright",
);

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const ROOT = path.resolve(__dirname, "..");
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function browserExecutable() {
  const executable = BROWSERS.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

async function openCraft(page) {
  page.on("pageerror", (error) => {
    console.error(`PAGE ERROR: ${error.stack || error.message}`);
  });
  await page.goto(`${PAGE_ORIGIN}index.html#ni-ren-zhang/craft`, {
    waitUntil: "networkidle",
  });
  await page.locator("#nrPageCraft").waitFor({ state: "visible" });
  await page.waitForFunction(
    () => Boolean(window.niRenZhangClayWorkshop),
    null,
    { timeout: 8000 },
  );
}

async function openStudio(page) {
  await page.locator("#nrOpenClayStudio").click();
  await page.locator("#nrClayWorkshop").waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      document.querySelector("#nrClayWorkshop")?.dataset.assetsReady ===
      "true",
    null,
    { timeout: 10000 },
  );
}

async function startBlank(page) {
  const newButton = page.locator("#nrClayStartNew");
  if (await newButton.isVisible()) await newButton.click();
  await page.locator("#nrClayWelcome").waitFor({ state: "hidden" });
}

async function state(page) {
  return page.evaluate(() => window.niRenZhangClayWorkshop.getState());
}

async function contentToScreen(page, contentPoint) {
  return page.evaluate((point) => {
    const svg = document.querySelector("#nrEditableClay");
    const appState = window.niRenZhangClayWorkshop.getState();
    const root = {
      x:
        400 +
        (point.x - 400) * appState.view.scale +
        appState.view.x,
      y:
        285 +
        (point.y - 285) * appState.view.scale +
        appState.view.y,
    };
    const ctm = svg.getScreenCTM();
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = root.x;
    svgPoint.y = root.y;
    const screen = svgPoint.matrixTransform(ctm);
    return { x: screen.x, y: screen.y, root };
  }, contentPoint);
}

async function dragContent(page, start, end, steps = 8) {
  const from = await contentToScreen(page, start);
  const to = await contentToScreen(page, end);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
  await page.waitForTimeout(80);
}

async function chooseTool(page, tool) {
  await page.locator(`[data-clay-tool="${tool}"]`).click();
  await page.waitForFunction(
    (nextTool) =>
      window.niRenZhangClayWorkshop.getState().tool === nextTool,
    tool,
  );
}

async function inspectEditor(page) {
  return page.evaluate(() => {
    const workshop = document.querySelector("#nrClayWorkshop");
    const canvas = document.querySelector("#nrEditableClay");
    const referenceFront = document.querySelector(
      '.nr-clay-reference-image img[src*="haizhangwu-front"]',
    );
    const referenceProfile = document.querySelector(
      '.nr-clay-reference-profile img[src*="haizhangwu-profile"]',
    );
    const toolButtons = [...document.querySelectorAll("[data-clay-tool]")];
    const rect = workshop.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const table = document.querySelector(".nr-clay-table");
    const texturePattern = document.querySelector("#nrClayTexture");
    const textureImage = texturePattern?.querySelector("image");
    return {
      title: document.querySelector("#nrCraftTitle")?.textContent.trim(),
      studioTitle: document
        .querySelector("#nrClayStudioTitle")
        ?.textContent.trim(),
      studioOpen: !workshop.hidden,
      studioFixed:
        getComputedStyle(workshop).position === "fixed" &&
        Math.abs(rect.width - innerWidth) <= 1,
      workshopRect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      canvasRect: {
        left: canvasRect.left,
        top: canvasRect.top,
        right: canvasRect.right,
        bottom: canvasRect.bottom,
        width: canvasRect.width,
        height: canvasRect.height,
      },
      tutorialCards: document.querySelectorAll(
        "#nrPageCraft > .nr-clay-tutorial-cards .nr-craft-card",
      ).length,
      entryVisible: Boolean(
        document.querySelector("#nrOpenClayStudio")?.offsetParent,
      ),
      toolCount: toolButtons.length,
      toolMinimumHeight: Math.min(
        ...toolButtons.map(
          (button) => button.getBoundingClientRect().height,
        ),
      ),
      reference: {
        frontLoaded:
          referenceFront?.complete && referenceFront.naturalWidth > 0,
        frontWidth: referenceFront?.naturalWidth,
        profileLoaded:
          referenceProfile?.complete && referenceProfile.naturalWidth > 0,
        profileWidth: referenceProfile?.naturalWidth,
      },
      bodyPath: document.querySelector("#nrClayBody")?.getAttribute("d"),
      clipPath: document.querySelector("#nrClayClipPath")?.getAttribute("d"),
      blocks: document.querySelectorAll(".nr-clay-added-block").length,
      strokes: document.querySelectorAll(".nr-clay-strokes > g").length,
      selectionHandles: document.querySelectorAll(
        ".nr-clay-selection-handle",
      ).length,
      horizontalOverflow:
        document.documentElement.scrollWidth - innerWidth,
      canvasTool: canvas.dataset.tool,
      status: document
        .querySelector("#nrClaySelectionStatus")
        ?.textContent.trim(),
      backgrounds: {
        tableLoaded: table?.complete && table.naturalWidth > 0,
        texture: textureImage?.getAttribute("href"),
        pattern: {
          x: texturePattern?.getAttribute("x"),
          y: texturePattern?.getAttribute("y"),
          width: texturePattern?.getAttribute("width"),
          height: texturePattern?.getAttribute("height"),
        },
        image: {
          x: textureImage?.getAttribute("x"),
          y: textureImage?.getAttribute("y"),
          width: textureImage?.getAttribute("width"),
          height: textureImage?.getAttribute("height"),
          preserveAspectRatio:
            textureImage?.getAttribute("preserveAspectRatio"),
        },
      },
      presentationVisible: !document.querySelector("#nrClayPresentation")
        .hidden,
    };
  });
}

async function runDesktopFlow(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await openCraft(page);
  const tutorialCards = await page
    .locator("#nrPageCraft > .nr-clay-tutorial-cards .nr-craft-card")
    .count();
  const initialTitle = (await page.locator("#nrCraftTitle").textContent()).trim();
  const entry = (await page.locator("#nrOpenClayStudio").textContent()).trim();
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-clay-studio-entry.png"),
  });
  await openStudio(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-clay-studio-welcome.png"),
  });
  const welcome = {
    visible: await page.locator("#nrClayWelcome").isVisible(),
    title: await page.locator("#nrClayWelcomeTitle").textContent(),
    resumeVisible: await page.locator("#nrClayResume").isVisible(),
  };
  await page.locator("#nrClayOpenTutorial").click();
  const tutorial = {
    visible: await page.locator("#nrClayTutorialOverlay").isVisible(),
    steps: await page
      .locator("#nrClayTutorialOverlay .nr-clay-tutorial-steps article")
      .count(),
  };
  await page.locator("#nrClayCloseTutorial").click();
  await page.locator("#nrClayWelcome").waitFor({ state: "hidden" });
  await startBlank(page);
  const initial = await state(page);
  const editorInitial = await inspectEditor(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-clay-studio-initial.png"),
  });
  await page.locator('[data-reference-open="front"]').click();
  const referenceLightbox = {
    visible: await page.locator("#nrClayReferenceLightbox").isVisible(),
    loaded: await page.evaluate(() => {
      const image = document.querySelector("#nrClayReferenceLarge");
      return image.complete && image.naturalWidth === 1254;
    }),
  };
  await page.locator("#nrClayCloseReference").click();

  const leftPoint = initial.state.basePoints[32];
  await chooseTool(page, "sculpt");
  await dragContent(
    page,
    leftPoint,
    { x: leftPoint.x - 62, y: leftPoint.y + 8 },
    10,
  );
  const afterSculptOne = await state(page);
  const lowerPoint = afterSculptOne.state.basePoints[16];
  await dragContent(
    page,
    lowerPoint,
    { x: lowerPoint.x + 28, y: lowerPoint.y + 58 },
    9,
  );
  const afterSculptTwo = await state(page);
  const deformedEditor = await inspectEditor(page);

  await chooseTool(page, "add");
  await dragContent(
    page,
    { x: 410, y: 246 },
    { x: 414, y: 251 },
    3,
  );
  await dragContent(
    page,
    { x: 585, y: 300 },
    { x: 590, y: 304 },
    3,
  );
  const afterAdds = await state(page);

  await chooseTool(page, "carve");
  await dragContent(
    page,
    { x: 335, y: 225 },
    { x: 370, y: 219 },
    8,
  );
  await dragContent(
    page,
    { x: 365, y: 328 },
    { x: 440, y: 327 },
    10,
  );
  await dragContent(
    page,
    { x: 345, y: 296 },
    { x: 390, y: 307 },
    7,
  );
  await dragContent(
    page,
    { x: 455, y: 307 },
    { x: 500, y: 296 },
    7,
  );
  const afterStrokes = await state(page);

  await chooseTool(page, "smooth");
  await dragContent(
    page,
    { x: 340, y: 226 },
    { x: 372, y: 222 },
    12,
  );
  const afterSmooth = await state(page);

  await chooseTool(page, "remove");
  const ear = afterSmooth.state.blocks.at(-1);
  await dragContent(
    page,
    { x: ear.x, y: ear.y },
    { x: ear.x + 10, y: ear.y + 4 },
    5,
  );
  const afterRemove = await state(page);

  await chooseTool(page, "adjust");
  const remainingBlock = afterRemove.state.blocks[0];
  await dragContent(
    page,
    { x: remainingBlock.x, y: remainingBlock.y },
    { x: remainingBlock.x + 24, y: remainingBlock.y - 18 },
    7,
  );
  const afterAdjustMove = await state(page);
  const movedBlock = afterAdjustMove.state.blocks[0];
  const handlePoint = {
    x: movedBlock.x + movedBlock.rx * 1.18,
    y: movedBlock.y,
  };
  await dragContent(
    page,
    handlePoint,
    { x: handlePoint.x + 28, y: handlePoint.y },
    7,
  );
  const afterAdjustScale = await state(page);
  const shapeHandlePoint = await page.evaluate(() => {
    const handle = document.querySelector(
      '[data-clay-shape-index="3"]',
    );
    return {
      x: Number(handle.getAttribute("cx")),
      y: Number(handle.getAttribute("cy")),
    };
  });
  await dragContent(
    page,
    shapeHandlePoint,
    {
      x: shapeHandlePoint.x + 24,
      y: shapeHandlePoint.y + 15,
    },
    7,
  );
  const afterAdjustShape = await state(page);
  const afterAdjustUi = await inspectEditor(page);

  const selectedStroke = afterAdjustShape.state.strokes[0];
  const strokePoint =
    selectedStroke.points[Math.floor(selectedStroke.points.length / 2)];
  await dragContent(
    page,
    strokePoint,
    { x: strokePoint.x + 9, y: strokePoint.y - 5 },
    6,
  );
  const afterStrokeAdjust = await state(page);
  await page.locator("#nrClayDeleteSelection").click();
  const afterStrokeDelete = await state(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-clay-studio-created.png"),
  });
  await page.setViewportSize({ width: 1200, height: 760 });
  await page.waitForTimeout(120);
  const resizedTexture = await inspectEditor(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(120);

  const beforeUndo = afterStrokeDelete;
  await page.locator("#nrClayUndo").click();
  const afterUndo = await state(page);
  await page.locator("#nrClayRedo").click();
  const afterRedo = await state(page);

  await page.locator("#nrClaySave").click();
  const savedJson = await page.evaluate(() =>
    localStorage.getItem(
      "sushi-qiren-ni-ren-zhang-clay-studio-v2",
    ),
  );

  await page.reload({ waitUntil: "networkidle" });
  await openCraft(page);
  await openStudio(page);
  const resumeVisible = await page.locator("#nrClayResume").isVisible();
  await page.locator("#nrClayResume").click();
  await page.locator("#nrClayWelcome").waitFor({ state: "hidden" });
  const afterResume = await state(page);

  await page.locator("#nrClayComplete").click();
  await page.locator("#nrClayPresentation").waitFor({ state: "visible" });
  const presentation = await page.evaluate(() => {
    const canvas = document.querySelector("#nrClayPresentationCanvas");
    return {
      visible: !document.querySelector("#nrClayPresentation").hidden,
      name: document
        .querySelector("#nrClayPresentationTitle")
        ?.textContent.trim(),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      nonBlank: canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height)
        .data.some((value, index) => index % 4 !== 3 && value !== 0),
    };
  });
  const dataUrl = await page.evaluate(() =>
    window.niRenZhangClayWorkshop.exportPngDataUrl(),
  );
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#nrClaySaveImage").click();
  const download = await downloadPromise;
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-clay-studio-presentation.png"),
  });

  await page.locator("#nrClayContinueEditing").click();
  await page.locator("#nrClayReturn").click();
  const afterReturn = await page.evaluate(() => ({
    currentPage: window.niRenZhangStory.getCurrentPage(),
    studioHidden: document.querySelector("#nrClayWorkshop").hidden,
  }));
  await page.locator('[data-nr-next="reveal"]').click();
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "reveal",
  );
  const nextChapter = await page.evaluate(() => ({
    currentPage: window.niRenZhangStory.getCurrentPage(),
    revealVisible: !document.querySelector("#nrPageReveal").hidden,
  }));

  await context.close();
  return {
    tutorialCards,
    initialTitle,
    entry,
    welcome,
    tutorial,
    initial,
    editorInitial,
    referenceLightbox,
    afterSculptOne,
    afterSculptTwo,
    deformedEditor,
    afterAdds,
    afterStrokes,
    afterSmooth,
    afterRemove,
    afterAdjustMove,
    afterAdjustScale,
    afterAdjustShape,
    afterStrokeAdjust,
    afterStrokeDelete,
    afterAdjustUi,
    resizedTexture,
    beforeUndo,
    afterUndo,
    afterRedo,
    savedJson,
    resumeVisible,
    afterResume,
    presentation,
    dataUrlLength: dataUrl.length,
    downloadName: download.suggestedFilename(),
    afterReturn,
    nextChapter,
    errors: { pageErrors, consoleErrors },
  };
}

async function touchDrag(page, context, from, to) {
  const start = await contentToScreen(page, from);
  const end = await contentToScreen(page, to);
  const client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start.x, y: start.y }],
  });
  for (let index = 1; index <= 7; index += 1) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: start.x + ((end.x - start.x) * index) / 7,
          y: start.y + ((end.y - start.y) * index) / 7,
        },
      ],
    });
    await page.waitForTimeout(16);
  }
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(100);
}

async function pinchCanvas(page, context) {
  const box = await page.locator("#nrEditableClay").boundingBox();
  if (!box) throw new Error("Missing mobile canvas.");
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: centerX - 50, y: centerY },
      { x: centerX + 50, y: centerY },
    ],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: centerX - 80, y: centerY - 10 },
      { x: centerX + 80, y: centerY + 10 },
    ],
  });
  await page.waitForTimeout(60);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(80);
}

async function runMobileFlow(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await openCraft(page);
  await openStudio(page);
  await startBlank(page);
  const initial = await state(page);
  const ui = await inspectEditor(page);

  await page.locator("#nrClayReferenceToggle").click();
  const collapsed = await page.evaluate(() => ({
    className: document.querySelector("#nrClayWorkshop").className,
    contentDisplay: getComputedStyle(
      document.querySelector(".nr-clay-reference-content"),
    ).display,
  }));
  await page.locator("#nrClayReferenceToggle").click();

  await chooseTool(page, "sculpt");
  const point = initial.state.basePoints[48];
  await touchDrag(
    page,
    context,
    point,
    { x: point.x - 45, y: point.y - 18 },
  );
  const afterTouch = await state(page);

  await pinchCanvas(page, context);
  const afterPinch = await state(page);
  const finalUi = await inspectEditor(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-clay-studio-mobile-390.png"),
  });

  await context.close();
  return {
    initial,
    ui,
    collapsed,
    afterTouch,
    afterPinch,
    finalUi,
    errors: { pageErrors, consoleErrors },
  };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  try {
    const desktop = await runDesktopFlow(browser);
    const mobile = await runMobileFlow(browser);
    const sculptPathChanged =
      desktop.afterSculptOne.state.basePoints.length === 64 &&
      JSON.stringify(desktop.afterSculptOne.state.basePoints) !==
        JSON.stringify(desktop.initial.state.basePoints) &&
      JSON.stringify(desktop.afterSculptTwo.state.basePoints) !==
        JSON.stringify(desktop.afterSculptOne.state.basePoints);
    const maxStrokeDepth = Math.max(
      ...desktop.afterStrokes.state.strokes.map(
        (stroke) => stroke.depth,
      ),
    );
    const smoothReducedStroke = desktop.afterSmooth.state.strokes.some(
      (stroke) => stroke.depth < maxStrokeDepth,
    );
    const redoState = JSON.stringify(desktop.afterRedo.state);

    const assertions = {
      thirdActKeepsTitle:
        desktop.initialTitle.includes("一块泥，三步行"),
      threeTutorialCardsPreserved: desktop.tutorialCards === 3,
      prominentStudioEntry: desktop.entry.includes("进入自由捏泥工坊"),
      welcomeHasPromptAndChoices:
        desktop.welcome.visible &&
        desktop.welcome.title.includes("像泥人张一样") &&
        !desktop.welcome.resumeVisible,
      tutorialHasThreeSteps:
        desktop.tutorial.visible && desktop.tutorial.steps === 3,
      studioIsIndependentFixedSurface:
        desktop.editorInitial.studioOpen &&
        desktop.editorInitial.studioFixed &&
        desktop.editorInitial.studioTitle.includes("海张五"),
      allWorkshopAssetsLoad:
        desktop.initial.assets.loaded === desktop.initial.assets.total &&
        desktop.initial.assets.failed.length === 0,
      referencesLoad:
        desktop.editorInitial.reference.frontLoaded &&
        desktop.editorInitial.reference.profileLoaded,
      referenceCanOpenAsLightbox:
        desktop.referenceLightbox.visible &&
        desktop.referenceLightbox.loaded,
      sixDistinctToolsExist: desktop.editorInitial.toolCount === 6,
      woodTableAndTextureVisible:
        desktop.editorInitial.backgrounds.tableLoaded &&
        desktop.editorInitial.backgrounds.texture.includes("clay-texture"),
      texturePatternCoversFullSvgCanvas:
        desktop.editorInitial.backgrounds.pattern.x === "0" &&
        desktop.editorInitial.backgrounds.pattern.y === "0" &&
        desktop.editorInitial.backgrounds.pattern.width === "800" &&
        desktop.editorInitial.backgrounds.pattern.height === "560" &&
        desktop.editorInitial.backgrounds.image.x === "0" &&
        desktop.editorInitial.backgrounds.image.y === "0" &&
        desktop.editorInitial.backgrounds.image.width === "800" &&
        desktop.editorInitial.backgrounds.image.height === "560" &&
        desktop.editorInitial.backgrounds.image.preserveAspectRatio ===
          "xMidYMid slice",
      mainGeometryAndClipStaySynchronized:
        desktop.editorInitial.bodyPath === desktop.editorInitial.clipPath,
      sculptChangesRealLocalGeometry: sculptPathChanged,
      textureClipTracksDeformedBody:
        desktop.deformedEditor.bodyPath ===
          desktop.deformedEditor.clipPath &&
        desktop.deformedEditor.bodyPath !== desktop.editorInitial.bodyPath,
      addToolCreatesTwoIndependentBlocks:
        desktop.afterAdds.state.blocks.length === 2,
      carveToolCreatesIndependentStrokes:
        desktop.afterStrokes.state.strokes.length === 4 &&
        new Set(
          desktop.afterStrokes.state.strokes.map((stroke) => stroke.id),
        ).size === 4,
      smoothToolSoftensLocalContent:
        smoothReducedStroke &&
        desktop.afterSmooth.history.index >
          desktop.afterStrokes.history.index,
      removeToolDeletesBlockNotWholeArtwork:
        desktop.afterRemove.state.blocks.length === 1 &&
        desktop.afterRemove.state.basePoints.length === 64,
      adjustToolMovesBlock:
        desktop.afterAdjustMove.selection?.type === "block" &&
        (desktop.afterAdjustMove.state.blocks[0].x !==
          desktop.afterRemove.state.blocks[0].x ||
          desktop.afterAdjustMove.state.blocks[0].y !==
            desktop.afterRemove.state.blocks[0].y),
      adjustToolResizesBlock:
        desktop.afterAdjustScale.state.blocks[0].rx >
        desktop.afterAdjustMove.state.blocks[0].rx,
      adjustToolChangesLocalBlockShape:
        JSON.stringify(
          desktop.afterAdjustShape.state.blocks[0].shape,
        ) !==
        JSON.stringify(
          desktop.afterAdjustScale.state.blocks[0].shape,
        ),
      adjustToolMovesSelectedStroke:
        desktop.afterStrokeAdjust.selection?.type === "stroke" &&
        JSON.stringify(desktop.afterStrokeAdjust.state.strokes[0].points) !==
          JSON.stringify(desktop.afterAdjustScale.state.strokes[0].points),
      adjustToolDeletesSelectedStroke:
        desktop.afterStrokeDelete.state.strokes.length ===
        desktop.afterStrokeAdjust.state.strokes.length - 1,
      undoRestoresPreviousState:
        JSON.stringify(desktop.afterUndo.state) ===
        JSON.stringify(desktop.afterStrokeAdjust.state),
      redoRestoresUndoneState:
        redoState === JSON.stringify(desktop.beforeUndo.state) &&
        desktop.afterRedo.history.canUndo,
      oneGestureCreatesOneHistoryStep:
        desktop.afterSculptOne.history.index === 1,
      localSaveContainsEditableData:
        Boolean(desktop.savedJson) &&
        JSON.parse(desktop.savedJson).state.blocks.length === 1 &&
        JSON.parse(desktop.savedJson).state.strokes.length >= 3,
      savedWorkCanResume:
        desktop.resumeVisible &&
        desktop.afterResume.state.blocks.length ===
          desktop.afterRedo.state.blocks.length &&
        desktop.afterResume.state.strokes.length ===
          desktop.afterRedo.state.strokes.length,
      completionShowsNamedPresentation:
        desktop.presentation.visible &&
        desktop.presentation.name === "我的海张五泥像" &&
        desktop.presentation.canvasWidth === 1800 &&
        desktop.presentation.canvasHeight === 1350 &&
        desktop.presentation.nonBlank,
      pngExportIsHighResolution:
        desktop.dataUrlLength > 100000 &&
        desktop.dataUrlLength < 20000000,
      pngDownloadHasExpectedName:
        desktop.downloadName === "我的海张五泥像.png",
      returnDoesNotChangeStoryState:
        desktop.afterReturn.currentPage === "craft" &&
        desktop.afterReturn.studioHidden,
      laterChapterStillWorks:
        desktop.nextChapter.currentPage === "reveal" &&
        desktop.nextChapter.revealVisible,
      mobileStudioFitsViewport:
        mobile.ui.studioFixed &&
        mobile.ui.workshopRect.left >= 0 &&
        mobile.ui.workshopRect.right <= 390 &&
        mobile.ui.workshopRect.bottom <= 844,
      mobileToolsHaveTouchTargets:
        mobile.ui.toolCount === 6 &&
        mobile.ui.toolMinimumHeight >= 44,
      mobileReferenceCollapses:
        mobile.collapsed.className.includes("reference-collapsed") &&
        mobile.collapsed.contentDisplay === "none",
      mobileSingleFingerEdits:
        JSON.stringify(mobile.afterTouch.state.basePoints) !==
        JSON.stringify(mobile.initial.state.basePoints),
      mobilePinchChangesCanvasZoom:
        mobile.afterPinch.view.scale > 1.05,
      mobileHasNoHorizontalOverflow:
        mobile.ui.horizontalOverflow <= 1 &&
        mobile.finalUi.horizontalOverflow <= 1,
      textureClipTracksViewportResize:
        desktop.resizedTexture.bodyPath ===
          desktop.resizedTexture.clipPath &&
        desktop.resizedTexture.backgrounds.pattern.width === "800" &&
        desktop.resizedTexture.backgrounds.pattern.height === "560",
      noBrowserErrors:
        desktop.errors.pageErrors.length === 0 &&
        desktop.errors.consoleErrors.length === 0 &&
        mobile.errors.pageErrors.length === 0 &&
        mobile.errors.consoleErrors.length === 0,
    };

    const failed = Object.entries(assertions)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    const report = {
      generatedAt: new Date().toISOString(),
      pageOrigin: PAGE_ORIGIN,
      assertions,
      desktop,
      mobile,
      failed,
      errors: [
        ...desktop.errors.pageErrors,
        ...desktop.errors.consoleErrors,
        ...mobile.errors.pageErrors,
        ...mobile.errors.consoleErrors,
      ],
      passed: failed.length === 0,
    };
    fs.mkdirSync(path.join(ROOT, "output"), { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, "output", "qa-ni-ren-zhang-clay-workshop.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          passed: report.passed,
          assertionCount: Object.keys(assertions).length,
          failed,
          errors: report.errors,
        },
        null,
        2,
      ),
    );
    if (failed.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
