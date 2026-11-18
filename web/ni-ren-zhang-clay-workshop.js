(() => {
  "use strict";

  const page = document.querySelector("#nrPageCraft");
  const workshop = document.querySelector("[data-clay-workshop]");
  if (!page || !workshop) return;

  const svg = workshop.querySelector("#nrEditableClay");
  const viewport = workshop.querySelector("#nrClayViewport");
  const body = workshop.querySelector("#nrClayBody");
  const volume = workshop.querySelector("#nrClayVolume");
  const outline = workshop.querySelector("#nrClayOutline");
  const clipPath = workshop.querySelector("#nrClayClipPath");
  const controls = workshop.querySelector("#nrClayControls");
  const blocksLayer = workshop.querySelector("#nrClayBlocks");
  const strokesLayer = workshop.querySelector("#nrClayStrokes");
  const selectionLayer = workshop.querySelector("#nrClaySelectionLayer");
  const brushIndicator = workshop.querySelector("#nrClayBrushIndicator");
  const statusCopy = workshop.querySelector("#nrClaySelectionStatus");
  const modeLabel = workshop.querySelector("#nrClayCanvasMode");
  const zoomLabel = workshop.querySelector("#nrClayZoomLabel");
  const openButton = document.querySelector("#nrOpenClayStudio");
  const closeButton = workshop.querySelector("[data-clay-close]");
  const helpButton = workshop.querySelector("[data-clay-help]");
  const returnButton = workshop.querySelector("#nrClayReturn");
  const toolButtons = [...workshop.querySelectorAll("[data-clay-tool]")];
  const brushSizeInput = workshop.querySelector("#nrClayBrushSize");
  const brushSizeValue = workshop.querySelector("#nrClayBrushSizeValue");
  const strengthInput = workshop.querySelector("#nrClayStrength");
  const strengthValue = workshop.querySelector("#nrClayStrengthValue");
  const undoButton = workshop.querySelector("#nrClayUndo");
  const redoButton = workshop.querySelector("#nrClayRedo");
  const historyStatus = workshop.querySelector("#nrClayHistoryStatus");
  const saveButton = workshop.querySelector("#nrClaySave");
  const resetButton = workshop.querySelector("#nrClayReset");
  const completeButton = workshop.querySelector("#nrClayComplete");
  const deleteSelectionButton = workshop.querySelector(
    "#nrClayDeleteSelection",
  );
  const referenceToggle = workshop.querySelector("#nrClayReferenceToggle");
  const welcome = document.querySelector("#nrClayWelcome");
  const welcomeTitle = document.querySelector("#nrClayWelcomeTitle");
  const savedHint = document.querySelector("#nrClaySavedHint");
  const resumeButton = document.querySelector("#nrClayResume");
  const startNewButton = document.querySelector("#nrClayStartNew");
  const openTutorialButton = document.querySelector("#nrClayOpenTutorial");
  const skipWelcomeButton = document.querySelector("#nrClaySkipWelcome");
  const tutorial = document.querySelector("#nrClayTutorialOverlay");
  const closeTutorialButton = document.querySelector("#nrClayCloseTutorial");
  const referenceLightbox = document.querySelector(
    "#nrClayReferenceLightbox",
  );
  const referenceLarge = document.querySelector("#nrClayReferenceLarge");
  const referenceCaption = document.querySelector("#nrClayReferenceCaption");
  const closeReferenceButton = document.querySelector(
    "#nrClayCloseReference",
  );
  const presentation = document.querySelector("#nrClayPresentation");
  const presentationCanvas = document.querySelector(
    "#nrClayPresentationCanvas",
  );
  const presentationStatus = document.querySelector(
    "#nrClayPresentationStatus",
  );
  const includeReference = document.querySelector("#nrClayIncludeReference");
  const continueEditingButton = document.querySelector(
    "#nrClayContinueEditing",
  );
  const saveImageButton = document.querySelector("#nrClaySaveImage");
  const returnFromPresentationButton = document.querySelector(
    "#nrClayReturnFromPresentation",
  );

  const SVG_NS = "http://www.w3.org/2000/svg";
  const STORAGE_KEY = "sushi-qiren-ni-ren-zhang-clay-studio-v2";
  const MODEL_VERSION = 2;
  const CENTER = Object.freeze({ x: 400, y: 285 });
  const BASE_RADII = Object.freeze({ x: 225, y: 172 });
  const BASE_POINT_COUNT = 64;
  const BLOCK_SHAPE_HANDLE_INDICES = Object.freeze([1, 3, 6, 8]);
  const MAX_HISTORY = 36;
  const MAX_BLOCKS = 72;
  const MAX_STROKES = 120;
  const MAX_STROKE_POINTS = 180;
  const toolNames = Object.freeze({
    sculpt: "塑形",
    add: "加泥",
    carve: "刻画",
    smooth: "抹平",
    remove: "去泥",
    adjust: "调整",
  });
  const toolInstructions = Object.freeze({
    sculpt: "塑形 · 在轮廓附近拖动",
    add: "加泥 · 点击添加并拖动定位",
    carve: "刻画 · 按住并连续拖动",
    smooth: "抹平 · 反复拖过需要柔化的区域",
    remove: "去泥 · 拖过泥块、刻痕或边缘",
    adjust: "调整 · 点选对象后拖动",
  });
  const ASSETS = Object.freeze({
    texture:
      "../public/images/niren-zhang/clay-workshop/clay/clay-texture.png",
    highlight:
      "../public/images/niren-zhang/clay-workshop/clay/clay-highlight.png",
    indent:
      "../public/images/niren-zhang/clay-workshop/clay/clay-indent.png",
    lump:
      "../public/images/niren-zhang/clay-workshop/clay/clay-lump.png",
    claySmall:
      "../public/images/niren-zhang/clay-workshop/clay/clay-small.png",
    wood:
      "../public/images/niren-zhang/clay-workshop/environment/wood-table.png",
    carving:
      "../public/images/niren-zhang/clay-workshop/environment/tool-carving.png",
    smooth:
      "../public/images/niren-zhang/clay-workshop/environment/tool-smooth.png",
    front:
      "../public/images/niren-zhang/clay-workshop/reference/haizhangwu-front.png",
    profile:
      "../public/images/niren-zhang/clay-workshop/reference/haizhangwu-profile.png",
    paper: "images/paper-fibers.png",
  });

  const assetImages = new Map();
  const activePointers = new Map();
  const dirty = {
    base: true,
    blocks: true,
    strokes: true,
    selection: true,
  };

  let state = createInitialState();
  let tool = "sculpt";
  let brushSize = 72;
  let strength = 64;
  let selection = null;
  let gesture = null;
  let pinch = null;
  let renderRequest = null;
  let savedPayload = readSavedPayload();
  let focusBeforeStudio = null;
  let tutorialStartedFromWelcome = false;
  let assetState = {
    total: Object.keys(ASSETS).length,
    loaded: 0,
    failed: [],
  };
  let assetsReadyPromise = Promise.resolve();
  let view = { scale: 1, x: 0, y: 0 };
  let lastBlockId = 0;
  let lastStrokeId = 0;
  let history = [snapshotState()];
  let historyIndex = 0;

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function createInitialBasePoints() {
    return Array.from({ length: BASE_POINT_COUNT }, (_, index) => {
      const angle = (index / BASE_POINT_COUNT) * Math.PI * 2;
      const irregularity =
        1 +
        Math.sin(angle * 3 + 0.35) * 0.032 +
        Math.cos(angle * 5 - 0.7) * 0.018 +
        Math.sin(angle * 7 + 1.1) * 0.009;
      return {
        x: CENTER.x + Math.cos(angle) * BASE_RADII.x * irregularity,
        y: CENTER.y + Math.sin(angle) * BASE_RADII.y * irregularity,
      };
    });
  }

  function createInitialState() {
    return {
      version: MODEL_VERSION,
      basePoints: createInitialBasePoints(),
      blocks: [],
      strokes: [],
      color: {
        clay: "#b98458",
        shadow: "#573a26",
        stroke: "#4c3225",
      },
      texture: {
        scale: 1,
        grain: 0.18,
        roughness: 0.3,
      },
    };
  }

  function snapshotState() {
    return {
      version: MODEL_VERSION,
      basePoints: deepClone(state.basePoints),
      blocks: deepClone(state.blocks),
      strokes: deepClone(state.strokes),
      color: { ...state.color },
      texture: { ...state.texture },
    };
  }

  function applySnapshot(snapshot) {
    state = {
      version: MODEL_VERSION,
      basePoints: deepClone(snapshot.basePoints),
      blocks: deepClone(snapshot.blocks),
      strokes: deepClone(snapshot.strokes),
      color: { ...snapshot.color },
      texture: { ...snapshot.texture },
    };
    selection = null;
    updateSelectionUi();
  }

  function snapshotsMatch(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function commitHistory() {
    const snapshot = snapshotState();
    if (snapshotsMatch(history[historyIndex], snapshot)) return false;
    history.splice(historyIndex + 1);
    history.push(snapshot);
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
    updateHistoryUi();
    return true;
  }

  function updateHistoryUi() {
    undoButton.disabled = historyIndex <= 0;
    redoButton.disabled = historyIndex >= history.length - 1;
    historyStatus.textContent = `${historyIndex} 步 · 最多 ${MAX_HISTORY - 1}`;
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    applySnapshot(history[historyIndex]);
    scheduleRender();
    updateHistoryUi();
    setStatus("已撤销上一步编辑");
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    applySnapshot(history[historyIndex]);
    scheduleRender();
    updateHistoryUi();
    setStatus("已恢复撤销的编辑");
  }

  function rounded(value) {
    return Math.round(value * 100) / 100;
  }

  function distance(left, right) {
    return Math.hypot(left.x - right.x, left.y - right.y);
  }

  function catmullPath(points) {
    const count = points.length;
    if (!count) return "";
    let path = `M ${rounded(points[0].x)} ${rounded(points[0].y)}`;
    for (let index = 0; index < count; index += 1) {
      const previous = points[(index - 1 + count) % count];
      const current = points[index];
      const next = points[(index + 1) % count];
      const afterNext = points[(index + 2) % count];
      const firstControl = {
        x: current.x + (next.x - previous.x) / 6,
        y: current.y + (next.y - previous.y) / 6,
      };
      const secondControl = {
        x: next.x - (afterNext.x - current.x) / 6,
        y: next.y - (afterNext.y - current.y) / 6,
      };
      path +=
        ` C ${rounded(firstControl.x)} ${rounded(firstControl.y)}` +
        ` ${rounded(secondControl.x)} ${rounded(secondControl.y)}` +
        ` ${rounded(next.x)} ${rounded(next.y)}`;
    }
    return `${path} Z`;
  }

  function polylinePath(points) {
    if (!points.length) return "";
    let path = `M ${rounded(points[0].x)} ${rounded(points[0].y)}`;
    for (let index = 1; index < points.length; index += 1) {
      path += ` L ${rounded(points[index].x)} ${rounded(points[index].y)}`;
    }
    if (points.length === 1) {
      path += ` L ${rounded(points[0].x + 0.1)} ${rounded(points[0].y)}`;
    }
    return path;
  }

  function blockPoints(block) {
    const count = block.shape.length;
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2;
      const localX = Math.cos(angle) * block.rx * block.shape[index];
      const localY = Math.sin(angle) * block.ry * block.shape[index];
      const rotation = (block.rotation * Math.PI) / 180;
      return {
        x:
          block.x +
          localX * Math.cos(rotation) -
          localY * Math.sin(rotation),
        y:
          block.y +
          localX * Math.sin(rotation) +
          localY * Math.cos(rotation),
      };
    });
  }

  function blockPath(block) {
    return catmullPath(blockPoints(block));
  }

  function strokePath(stroke) {
    return polylinePath(stroke.points);
  }

  function scheduleRender(parts = {}) {
    Object.entries(parts).forEach(([key, value]) => {
      if (key in dirty && value) dirty[key] = true;
    });
    if (renderRequest !== null) return;
    renderRequest = window.requestAnimationFrame(() => {
      renderRequest = null;
      renderDirty();
    });
  }

  function renderDirty() {
    if (dirty.base) renderBaseGeometry();
    if (dirty.blocks) renderBlocks();
    if (dirty.strokes) renderStrokes();
    if (dirty.selection) renderSelection();
    dirty.base = false;
    dirty.blocks = false;
    dirty.strokes = false;
    dirty.selection = false;
  }

  function renderBaseGeometry() {
    const path = catmullPath(state.basePoints);
    body.setAttribute("d", path);
    volume.setAttribute("d", path);
    outline.setAttribute("d", path);
    clipPath.setAttribute("d", path);

    const bounds = state.basePoints.reduce(
      (result, point) => ({
        minX: Math.min(result.minX, point.x),
        maxX: Math.max(result.maxX, point.x),
        minY: Math.min(result.minY, point.y),
        maxY: Math.max(result.maxY, point.y),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    );
    const ground = workshop.querySelector(".nr-clay-ground-shadow");
    ground.setAttribute("cx", rounded((bounds.minX + bounds.maxX) / 2));
    ground.setAttribute(
      "cy",
      rounded(Math.min(500, bounds.maxY + 30)),
    );
    ground.setAttribute("rx", rounded((bounds.maxX - bounds.minX) * 0.42));
    ground.setAttribute("ry", "24");

    controls.replaceChildren();
    state.basePoints.forEach((point, index) => {
      if (index % 8 !== 0) return;
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.classList.add("nr-clay-control-dot");
      dot.setAttribute("cx", rounded(point.x));
      dot.setAttribute("cy", rounded(point.y));
      dot.setAttribute("r", "4.2");
      dot.setAttribute("aria-hidden", "true");
      controls.append(dot);
    });
  }

  function renderBlocks() {
    blocksLayer.replaceChildren();
    state.blocks.forEach((block) => {
      const path = blockPath(block);
      const group = document.createElementNS(SVG_NS, "g");
      group.classList.add("nr-clay-added-block");
      group.dataset.blockId = block.id;

      const texture = document.createElementNS(SVG_NS, "path");
      texture.setAttribute("d", path);
      texture.setAttribute("fill", "url(#nrClayTexture)");

      const blockVolume = document.createElementNS(SVG_NS, "path");
      blockVolume.setAttribute("d", path);
      blockVolume.setAttribute("fill", "url(#nrClayVolumeLight)");
      blockVolume.setAttribute("opacity", "0.72");

      const edge = document.createElementNS(SVG_NS, "path");
      edge.classList.add("nr-clay-block-edge");
      edge.setAttribute("d", path);

      group.append(texture, blockVolume, edge);
      blocksLayer.append(group);
    });
  }

  function renderStrokes() {
    strokesLayer.replaceChildren();
    state.strokes.forEach((stroke) => {
      const path = strokePath(stroke);
      const group = document.createElementNS(SVG_NS, "g");
      group.dataset.strokeId = stroke.id;

      const ridge = document.createElementNS(SVG_NS, "path");
      ridge.classList.add("nr-clay-stroke-ridge");
      ridge.setAttribute("d", path);
      ridge.setAttribute(
        "stroke-width",
        String(Math.max(1, stroke.width * 0.82)),
      );
      ridge.setAttribute(
        "opacity",
        String(clamp(stroke.depth / 180, 0.08, 0.52)),
      );

      const dark = document.createElementNS(SVG_NS, "path");
      dark.classList.add("nr-clay-stroke");
      dark.setAttribute("d", path);
      dark.setAttribute("stroke-width", String(stroke.width));
      dark.setAttribute(
        "opacity",
        String(clamp(0.24 + stroke.depth / 120, 0.28, 1)),
      );

      group.append(ridge, dark);
      strokesLayer.append(group);
    });
  }

  function selectedObject() {
    if (!selection) return null;
    if (selection.type === "block") {
      return state.blocks.find((block) => block.id === selection.id) || null;
    }
    return state.strokes.find((stroke) => stroke.id === selection.id) || null;
  }

  function renderSelection() {
    selectionLayer.replaceChildren();
    const object = selectedObject();
    if (!object) return;

    if (selection.type === "block") {
      const path = blockPath(object);
      const selectionOutline = document.createElementNS(SVG_NS, "path");
      selectionOutline.classList.add("nr-clay-selection-outline");
      selectionOutline.setAttribute("d", path);

      const points = blockPoints(object);
      const shapeHandles = BLOCK_SHAPE_HANDLE_INDICES.map((index) => {
        const handle = document.createElementNS(SVG_NS, "circle");
        handle.classList.add(
          "nr-clay-selection-handle",
          "is-shape",
        );
        handle.dataset.clayHandle = "shape";
        handle.dataset.clayShapeIndex = String(index);
        handle.setAttribute("cx", rounded(points[index].x));
        handle.setAttribute("cy", rounded(points[index].y));
        handle.setAttribute("r", "4.5");
        return handle;
      });

      const horizontalHandle = document.createElementNS(SVG_NS, "circle");
      horizontalHandle.classList.add("nr-clay-selection-handle");
      horizontalHandle.dataset.clayHandle = "scale-x";
      horizontalHandle.setAttribute("cx", rounded(object.x + object.rx * 1.18));
      horizontalHandle.setAttribute("cy", rounded(object.y));
      horizontalHandle.setAttribute("r", "6");

      const verticalHandle = document.createElementNS(SVG_NS, "circle");
      verticalHandle.classList.add("nr-clay-selection-handle");
      verticalHandle.dataset.clayHandle = "scale-y";
      verticalHandle.setAttribute("cx", rounded(object.x));
      verticalHandle.setAttribute("cy", rounded(object.y + object.ry * 1.18));
      verticalHandle.setAttribute("r", "6");

      selectionLayer.append(
        selectionOutline,
        ...shapeHandles,
        horizontalHandle,
        verticalHandle,
      );
    } else {
      const selectedStroke = document.createElementNS(SVG_NS, "path");
      selectedStroke.classList.add("nr-clay-selection-outline");
      selectedStroke.setAttribute("d", strokePath(object));
      selectedStroke.setAttribute(
        "stroke-width",
        String(Math.max(8, object.width + 6)),
      );
      selectionLayer.append(selectedStroke);
    }
  }

  function screenToSvgPoint(event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function toContentPoint(rootPoint) {
    return {
      x: CENTER.x + (rootPoint.x - CENTER.x - view.x) / view.scale,
      y: CENTER.y + (rootPoint.y - CENTER.y - view.y) / view.scale,
    };
  }

  function applyView() {
    viewport.setAttribute(
      "transform",
      `translate(${rounded(CENTER.x + view.x)} ${rounded(
        CENTER.y + view.y,
      )}) scale(${view.scale}) translate(${-CENTER.x} ${-CENTER.y})`,
    );
    zoomLabel.textContent = `画布 ${Math.round(view.scale * 100)}%`;
  }

  function resetView() {
    view = { scale: 1, x: 0, y: 0 };
    applyView();
    setStatus("画布视图已复位");
  }

  function setStatus(message) {
    statusCopy.textContent = message;
  }

  function updateBrushIndicator(rootPoint) {
    if (!rootPoint) {
      brushIndicator.classList.remove("is-visible");
      return;
    }
    brushIndicator.setAttribute("cx", rounded(rootPoint.x));
    brushIndicator.setAttribute("cy", rounded(rootPoint.y));
    brushIndicator.setAttribute(
      "r",
      String(Math.max(8, brushSize * view.scale * 0.72)),
    );
    brushIndicator.classList.add("is-visible");
  }

  function updateSettingLabels() {
    brushSizeValue.textContent = String(brushSize);
    strengthValue.textContent = String(strength);
    modeLabel.textContent = toolInstructions[tool];
  }

  function updateSelectionUi() {
    const object = selectedObject();
    deleteSelectionButton.disabled = !object;
    if (!selection || !object) {
      workshop.dataset.selection = "none";
      setStatus("可塑泥团 · 拖动、添加和刻画均可随时开始");
      return;
    }
    if (selection.type === "block") {
      workshop.dataset.selection = "block";
      setStatus(
        `已选泥块 #${object.id} · 四个小圆点捏局部形状，外圈圆点调整大小`,
      );
    } else {
      workshop.dataset.selection = "stroke";
      setStatus(`已选刻痕 #${object.id} · 拖动移动，滑块调整深浅`);
    }
  }

  function clearSelection() {
    selection = null;
    updateSelectionUi();
    scheduleRender({ selection: true });
  }

  function setTool(nextTool) {
    if (!toolNames[nextTool]) return;
    tool = nextTool;
    toolButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.clayTool === tool),
      );
    });
    svg.dataset.tool = tool;
    updateSettingLabels();
    if (tool !== "adjust") clearSelection();
    setStatus(
      tool === "adjust"
        ? "调整 · 点击泥块或刻痕，再拖动修改"
        : `${toolNames[tool]}工具已启用 · 笔触大小 ${brushSize}`,
    );
  }

  function clampBasePoint(point) {
    const normalizedX = (point.x - CENTER.x) / (BASE_RADII.x * 1.28);
    const normalizedY = (point.y - CENTER.y) / (BASE_RADII.y * 1.28);
    const length = Math.hypot(normalizedX, normalizedY);
    const minimum = 0.34;
    const maximum = 1;
    const factor =
      length > maximum
        ? maximum / length
        : length < minimum && length > 0
          ? minimum / length
          : 1;
    return {
      x: CENTER.x + normalizedX * factor * BASE_RADII.x * 1.28,
      y: CENTER.y + normalizedY * factor * BASE_RADII.y * 1.28,
    };
  }

  function sculptAt(gestureData, pointer) {
    const deltaX = pointer.x - gestureData.start.x;
    const deltaY = pointer.y - gestureData.start.y;
    const radius = Math.max(48, brushSize * 1.22);
    const force = 0.25 + (strength / 100) * 0.75;
    let changed = false;

    state.basePoints = gestureData.basePoints.map((baseline, index) => {
      const localDistance = distance(baseline, gestureData.start);
      if (localDistance >= radius) return { ...baseline };
      const normalized = 1 - localDistance / radius;
      const weight = normalized * normalized * force;
      const next = clampBasePoint({
        x: baseline.x + deltaX * weight,
        y: baseline.y + deltaY * weight,
      });
      if (distance(next, baseline) > 0.05) changed = true;
      return next;
    });
    if (changed) scheduleRender({ base: true, selection: true });
    return changed;
  }

  function createBlock(point) {
    if (state.blocks.length >= MAX_BLOCKS) {
      setStatus(`泥块数量已达到 ${MAX_BLOCKS} 个上限`);
      return null;
    }
    lastBlockId += 1;
    const seed = lastBlockId * 1.618;
    const block = {
      id: lastBlockId,
      x: point.x,
      y: point.y,
      rx: Math.max(16, brushSize * 0.48),
      ry: Math.max(13, brushSize * 0.36),
      rotation: Math.sin(seed) * 18,
      shape: Array.from({ length: 10 }, (_, index) =>
        0.9 +
        Math.sin(seed + index * 1.83) * 0.09 +
        Math.cos(seed * 0.7 + index * 2.27) * 0.05,
      ),
      color: state.color.clay,
      textureScale: 1,
    };
    state.blocks.push(block);
    scheduleRender({ blocks: true, selection: true });
    return block;
  }

  function pointInBlock(point, block) {
    const rotation = (-block.rotation * Math.PI) / 180;
    const deltaX = point.x - block.x;
    const deltaY = point.y - block.y;
    const localX =
      deltaX * Math.cos(rotation) - deltaY * Math.sin(rotation);
    const localY =
      deltaX * Math.sin(rotation) + deltaY * Math.cos(rotation);
    const averageShape =
      block.shape.reduce((sum, value) => sum + value, 0) /
      block.shape.length;
    return (
      (localX / (block.rx * averageShape)) ** 2 +
        (localY / (block.ry * averageShape)) ** 2 <=
      1.05
    );
  }

  function distanceToSegment(point, start, end) {
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const lengthSquared = segmentX ** 2 + segmentY ** 2;
    if (!lengthSquared) return distance(point, start);
    const projection = clamp(
      ((point.x - start.x) * segmentX +
        (point.y - start.y) * segmentY) /
        lengthSquared,
      0,
      1,
    );
    return distance(point, {
      x: start.x + segmentX * projection,
      y: start.y + segmentY * projection,
    });
  }

  function distanceToStroke(point, stroke) {
    if (stroke.points.length === 1) return distance(point, stroke.points[0]);
    let minimum = Number.POSITIVE_INFINITY;
    for (let index = 1; index < stroke.points.length; index += 1) {
      minimum = Math.min(
        minimum,
        distanceToSegment(
          point,
          stroke.points[index - 1],
          stroke.points[index],
        ),
      );
    }
    return minimum;
  }

  function objectAtPoint(point) {
    for (let index = state.blocks.length - 1; index >= 0; index -= 1) {
      const block = state.blocks[index];
      if (pointInBlock(point, block)) {
        return { type: "block", object: block };
      }
    }
    for (let index = state.strokes.length - 1; index >= 0; index -= 1) {
      const stroke = state.strokes[index];
      const threshold = Math.max(10, stroke.width * 0.95, brushSize * 0.16);
      if (distanceToStroke(point, stroke) <= threshold) {
        return { type: "stroke", object: stroke };
      }
    }
    return null;
  }

  function handleScaleHandle(pointer) {
    const block = selectedObject();
    if (!block || selection?.type !== "block") return false;
    const points = blockPoints(block);
    for (const index of BLOCK_SHAPE_HANDLE_INDICES) {
      if (distance(pointer, points[index]) <= 18) {
        return { type: "shape", index };
      }
    }
    const horizontalHandle = {
      x: block.x + block.rx * 1.18,
      y: block.y,
    };
    const verticalHandle = {
      x: block.x,
      y: block.y + block.ry * 1.18,
    };
    if (distance(pointer, horizontalHandle) <= 18) {
      return { type: "scale", axis: "x" };
    }
    if (distance(pointer, verticalHandle) <= 18) {
      return { type: "scale", axis: "y" };
    }
    return false;
  }

  function carvePoint(gestureData, pointer) {
    const stroke = gestureData.stroke;
    if (!stroke) return false;
    const last = stroke.points[stroke.points.length - 1];
    if (last && distance(last, pointer) < 1.2) return false;
    stroke.points.push({ x: pointer.x, y: pointer.y });
    if (stroke.points.length > MAX_STROKE_POINTS) {
      stroke.points = stroke.points.filter(
        (_, index) => index % 2 === 0 || index === stroke.points.length - 1,
      );
    }
    scheduleRender({ strokes: true, selection: true });
    return true;
  }

  function smoothAt(point) {
    const radius = Math.max(35, brushSize * 0.92);
    const force = 0.03 + (strength / 100) * 0.19;
    let changed = false;

    state.basePoints = state.basePoints.map((current, index) => {
      const localDistance = distance(current, point);
      if (localDistance >= radius) return current;
      const neighbors = [
        state.basePoints[
          (index - 1 + state.basePoints.length) % state.basePoints.length
        ],
        state.basePoints[
          (index + 1) % state.basePoints.length
        ],
      ];
      const average = {
        x: (neighbors[0].x + neighbors[1].x) / 2,
        y: (neighbors[0].y + neighbors[1].y) / 2,
      };
      const normalized = 1 - localDistance / radius;
      const weight = normalized * normalized * force;
      const next = {
        x: current.x + (average.x - current.x) * weight,
        y: current.y + (average.y - current.y) * weight,
      };
      if (distance(next, current) > 0.01) changed = true;
      return next;
    });

    state.strokes.forEach((stroke) => {
      if (
        distanceToStroke(point, stroke) <=
        Math.max(12, stroke.width + brushSize * 0.22)
      ) {
        stroke.depth = Math.max(
          0,
          stroke.depth - strength * 0.025,
        );
        changed = true;
      }
    });
    state.strokes = state.strokes.filter((stroke) => stroke.depth > 4);

    state.blocks.forEach((block) => {
      const points = blockPoints(block);
      block.shape = block.shape.map((factor, index) => {
        const edgePoint = points[index];
        const localDistance = distance(edgePoint, point);
        if (localDistance >= radius) return factor;
        const count = block.shape.length;
        const previous = block.shape[
          (index - 1 + count) % count
        ];
        const next = block.shape[(index + 1) % count];
        const neighborAverage = (previous + next) / 2;
        const normalized = 1 - localDistance / radius;
        const weight = normalized * normalized * force;
        const nextFactor =
          factor + (neighborAverage - factor) * weight;
        if (Math.abs(nextFactor - factor) > 0.0001) changed = true;
        return nextFactor;
      });
    });

    if (changed) {
      scheduleRender({
        base: true,
        blocks: true,
        strokes: true,
        selection: true,
      });
    }
    return changed;
  }

  function removeAt(point) {
    const radius = Math.max(28, brushSize * 0.62);
    let changed = false;

    const remainingBlocks = state.blocks.filter((block) => {
      const hit =
        distance(point, block) <=
        Math.max(block.rx, block.ry) + radius * 0.35;
      if (hit && selection?.type === "block" && selection.id === block.id) {
        selection = null;
      }
      if (hit) changed = true;
      return !hit;
    });
    state.blocks = remainingBlocks;

    state.strokes.forEach((stroke) => {
      if (
        distanceToStroke(point, stroke) <=
        Math.max(12, stroke.width + radius * 0.35)
      ) {
        stroke.depth = Math.max(0, stroke.depth - strength * 0.085);
        changed = true;
      }
    });
    state.strokes = state.strokes.filter((stroke) => {
      const keep = stroke.depth > 3;
      if (!keep && selection?.type === "stroke" && selection.id === stroke.id) {
        selection = null;
      }
      return keep;
    });

    const force = strength / 100;
    state.basePoints = state.basePoints.map((current) => {
      const localDistance = distance(current, point);
      if (localDistance >= radius) return current;
      const weight = (1 - localDistance / radius) ** 2 * force * 0.025;
      if (weight <= 0) return current;
      changed = true;
      return {
        x: current.x + (CENTER.x - current.x) * weight,
        y: current.y + (CENTER.y - current.y) * weight,
      };
    });

    if (changed) {
      scheduleRender({
        base: true,
        blocks: true,
        strokes: true,
        selection: true,
      });
      updateSelectionUi();
    }
    return changed;
  }

  function moveSelectedFromBaseline(gestureData, pointer) {
    const baseline = gestureData.object;
    const deltaX = pointer.x - gestureData.start.x;
    const deltaY = pointer.y - gestureData.start.y;
    const current = selectedObject();
    if (!current) return false;

    if (gestureData.handle?.type === "scale") {
      if (gestureData.handle.axis === "x") {
        current.rx = clamp(Math.abs(pointer.x - current.x), 10, 180);
      } else {
        current.ry = clamp(Math.abs(pointer.y - current.y), 8, 150);
      }
    } else if (gestureData.handle?.type === "shape") {
      const index = gestureData.handle.index;
      const nominalBlock = {
        ...baseline,
        shape: baseline.shape.map(() => 1),
      };
      const nominalPoint = blockPoints(nominalBlock)[index];
      const nominalRadius = Math.max(
        1,
        distance(nominalPoint, baseline),
      );
      const nextShape = clamp(
        distance(pointer, baseline) / nominalRadius,
        0.55,
        1.6,
      );
      if (Math.abs(nextShape - current.shape[index]) <= 0.0001) {
        return false;
      }
      current.shape[index] = nextShape;
    } else if (selection.type === "block") {
      current.x = baseline.x + deltaX;
      current.y = baseline.y + deltaY;
    } else {
      current.points = baseline.points.map((point) => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
      }));
    }

    scheduleRender({
      blocks: selection.type === "block",
      strokes: selection.type === "stroke",
      selection: true,
    });
    return true;
  }

  function startToolGesture(event, rootPoint, contentPoint) {
    const before = snapshotState();
    const baseGesture = {
      pointerId: event.pointerId,
      tool,
      start: contentPoint,
      last: contentPoint,
      before,
      changed: false,
      handle: false,
      basePoints: deepClone(state.basePoints),
    };

    if (tool === "sculpt") {
      gesture = baseGesture;
    } else if (tool === "add") {
      const block = createBlock(contentPoint);
      gesture = {
        ...baseGesture,
        offsetX: block ? block.x - contentPoint.x : 0,
        offsetY: block ? block.y - contentPoint.y : 0,
        blockId: block?.id || null,
        changed: Boolean(block),
      };
      if (block) setStatus(`已加一团泥 · 拖动可调整位置`);
    } else if (tool === "carve") {
      if (state.strokes.length >= MAX_STROKES) {
        setStatus(`刻痕数量已达到 ${MAX_STROKES} 条上限`);
        return;
      }
      lastStrokeId += 1;
      const stroke = {
        id: lastStrokeId,
        points: [{ ...contentPoint }],
        width: clamp(brushSize * 0.13, 2, 26),
        depth: strength,
        color: state.color.stroke,
      };
      state.strokes.push(stroke);
      gesture = {
        ...baseGesture,
        stroke,
        strokeId: stroke.id,
        changed: true,
      };
      scheduleRender({ strokes: true });
    } else if (tool === "smooth") {
      gesture = {
        ...baseGesture,
        changed: smoothAt(contentPoint),
      };
    } else if (tool === "remove") {
      gesture = {
        ...baseGesture,
        changed: removeAt(contentPoint),
      };
    } else if (tool === "adjust") {
      const handle = handleScaleHandle(contentPoint);
      let target = objectAtPoint(contentPoint);
      if (handle && selection) {
        target = { type: selection.type, object: selectedObject() };
      }
      if (!target) {
        clearSelection();
        return;
      }
      selection = { type: target.type, id: target.object.id };
      updateSelectionUi();
      scheduleRender({ selection: true });
      gesture = {
        ...baseGesture,
        handle,
        object: deepClone(target.object),
        changed: false,
      };
    }

    if (gesture) {
      svg.setPointerCapture?.(event.pointerId);
      svg.classList.add("is-dragging");
    }
  }

  function moveToolGesture(event, contentPoint) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (distance(contentPoint, gesture.last) < 0.05 && tool !== "sculpt") {
      return;
    }

    if (tool === "sculpt") {
      gesture.changed =
        sculptAt(gesture, contentPoint) || gesture.changed;
      setStatus(`正在塑形 · 力度 ${strength}`);
    } else if (tool === "add") {
      const block = state.blocks.find(
        (candidate) => candidate.id === gesture.blockId,
      );
      if (block) {
        block.x = contentPoint.x + gesture.offsetX;
        block.y = contentPoint.y + gesture.offsetY;
        scheduleRender({ blocks: true, selection: true });
        gesture.changed = true;
      }
    } else if (tool === "carve") {
      gesture.changed = carvePoint(gesture, contentPoint) || gesture.changed;
    } else if (tool === "smooth") {
      gesture.changed = smoothAt(contentPoint) || gesture.changed;
    } else if (tool === "remove") {
      gesture.changed = removeAt(contentPoint) || gesture.changed;
    } else if (tool === "adjust") {
      gesture.changed =
        moveSelectedFromBaseline(gesture, contentPoint) || gesture.changed;
    }
    gesture.last = contentPoint;
  }

  function finishToolGesture(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    svg.releasePointerCapture?.(event.pointerId);
    svg.classList.remove("is-dragging");
    const gestureTool = gesture.tool;
    if (gesture.changed) {
      commitHistory();
      setStatus(
        gestureTool === "adjust"
          ? "对象调整已保存为一个历史步骤"
          : `${toolNames[gestureTool]}完成 · 可撤销`,
      );
    } else if (gestureTool === "adjust") {
      updateSelectionUi();
    }
    gesture = null;
    updateSelectionUi();
  }

  function cancelToolGesture(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    applySnapshot(gesture.before);
    svg.releasePointerCapture?.(event.pointerId);
    svg.classList.remove("is-dragging");
    brushIndicator.classList.remove("is-visible");
    gesture = null;
    scheduleRender();
    setStatus("本次操作已取消，作品恢复到拖动前");
  }

  function startPinch() {
    const values = [...activePointers.values()].slice(0, 2);
    if (values.length < 2) return;
    const midpoint = {
      x: (values[0].root.x + values[1].root.x) / 2,
      y: (values[0].root.y + values[1].root.y) / 2,
    };
    pinch = {
      distance: distance(values[0].root, values[1].root),
      midpoint,
      view: { ...view },
    };
    brushIndicator.classList.remove("is-visible");
  }

  function updatePinch() {
    const values = [...activePointers.values()].slice(0, 2);
    if (!pinch || values.length < 2) return;
    const nextDistance = Math.max(1, distance(values[0].root, values[1].root));
    const midpoint = {
      x: (values[0].root.x + values[1].root.x) / 2,
      y: (values[0].root.y + values[1].root.y) / 2,
    };
    const nextScale = clamp(
      pinch.view.scale * (nextDistance / Math.max(1, pinch.distance)),
      0.72,
      2.6,
    );
    view = {
      scale: nextScale,
      x: pinch.view.x + midpoint.x - pinch.midpoint.x,
      y: pinch.view.y + midpoint.y - pinch.midpoint.y,
    };
    applyView();
  }

  function handlePointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const root = screenToSvgPoint(event);
    if (!root) return;
    activePointers.set(event.pointerId, { root, client: event });
    svg.setPointerCapture?.(event.pointerId);
    updateBrushIndicator(root);

    if (activePointers.size === 2) {
      if (gesture?.changed) commitHistory();
      gesture = null;
      svg.classList.remove("is-dragging");
      startPinch();
      event.preventDefault();
      return;
    }
    if (activePointers.size > 2 || pinch) return;

    const contentPoint = toContentPoint(root);
    startToolGesture(event, root, contentPoint);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    const root = screenToSvgPoint(event);
    if (!root) return;
    if (activePointers.has(event.pointerId)) {
      activePointers.set(event.pointerId, { root, client: event });
    }
    if (pinch) {
      updatePinch();
      event.preventDefault();
      return;
    }
    updateBrushIndicator(root);
    moveToolGesture(event, toContentPoint(root));
    if (gesture) event.preventDefault();
  }

  function handlePointerUp(event) {
    activePointers.delete(event.pointerId);
    if (pinch) {
      if (activePointers.size < 2) pinch = null;
      svg.releasePointerCapture?.(event.pointerId);
      return;
    }
    finishToolGesture(event);
  }

  function handlePointerCancel(event) {
    activePointers.delete(event.pointerId);
    if (pinch) {
      if (activePointers.size < 2) pinch = null;
      return;
    }
    cancelToolGesture(event);
  }

  function deleteSelected() {
    const object = selectedObject();
    if (!object || !selection) return;
    if (selection.type === "block") {
      state.blocks = state.blocks.filter((block) => block.id !== object.id);
    } else {
      state.strokes = state.strokes.filter(
        (stroke) => stroke.id !== object.id,
      );
    }
    selection = null;
    scheduleRender({ blocks: true, strokes: true, selection: true });
    updateSelectionUi();
    commitHistory();
    setStatus("已删除选中对象 · 可撤销");
  }

  function resetArtwork() {
    const nextState = createInitialState();
    state = nextState;
    selection = null;
    gesture = null;
    activePointers.clear();
    pinch = null;
    let nextId = 0;
    state.blocks.forEach((block) => {
      nextId = Math.max(nextId, block.id);
    });
    state.strokes.forEach((stroke) => {
      nextId = Math.max(nextId, stroke.id);
    });
    lastBlockId = nextId;
    lastStrokeId = nextId;
    scheduleRender();
    updateSelectionUi();
    commitHistory();
    resetView();
    setStatus("已重置为新的泥团 · 可通过撤销找回上一版");
  }

  function savePayloadObject() {
    return {
      version: MODEL_VERSION,
      savedAt: new Date().toISOString(),
      state: snapshotState(),
      settings: {
        brushSize,
        strength,
        viewScale: view.scale,
        tool,
        selection: selection ? { ...selection } : null,
      },
    };
  }

  function readSavedPayload() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (
        !payload ||
        payload.version !== MODEL_VERSION ||
        !payload.state ||
        !Array.isArray(payload.state.basePoints) ||
        payload.state.basePoints.length < 24
      ) {
        return null;
      }
      return payload;
    } catch (error) {
      return null;
    }
  }

  function saveToLocal({ silent = false } = {}) {
    try {
      savedPayload = savePayloadObject();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPayload));
      updateSavedHint();
      if (!silent) {
        setStatus("作品数据已保存到当前浏览器");
        presentationStatus.textContent = "作品与可恢复数据均已保存";
      }
      return true;
    } catch (error) {
      setStatus("保存失败：当前浏览器不允许本地存储");
      presentationStatus.textContent = "保存失败，仍可使用“保存图片”导出 PNG";
      return false;
    }
  }

  function updateSavedHint() {
    if (!savedPayload?.savedAt) {
      resumeButton.hidden = true;
      savedHint.textContent = "";
      return;
    }
    resumeButton.hidden = false;
    const savedTime = new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(savedPayload.savedAt));
    savedHint.textContent = `浏览器中有一份可继续编辑的作品 · ${savedTime}`;
  }

  function loadSavedState() {
    savedPayload = readSavedPayload();
    if (!savedPayload) return false;
    applySnapshot(savedPayload.state);
    brushSize = clamp(
      Number(savedPayload.settings?.brushSize) || 72,
      28,
      180,
    );
    strength = clamp(
      Number(savedPayload.settings?.strength) || 64,
      12,
      100,
    );
    brushSizeInput.value = String(brushSize);
    strengthInput.value = String(strength);
    updateSettingLabels();
    setTool(toolNames[savedPayload.settings?.tool] ? savedPayload.settings.tool : "sculpt");
    const savedSelection = savedPayload.settings?.selection;
    if (savedSelection?.type && Number.isFinite(savedSelection.id)) {
      selection = { type: savedSelection.type, id: savedSelection.id };
      if (selectedObject()) {
        updateSelectionUi();
        scheduleRender({ selection: true });
      } else {
        selection = null;
      }
    }
    history = [snapshotState()];
    historyIndex = 0;
    updateHistoryUi();
    scheduleRender();
    setStatus("已恢复上次保存的作品，可以继续修改");
    return true;
  }

  function startNew() {
    window.localStorage.removeItem(STORAGE_KEY);
    savedPayload = null;
    state = createInitialState();
    selection = null;
    lastBlockId = 0;
    lastStrokeId = 0;
    history = [snapshotState()];
    historyIndex = 0;
    updateHistoryUi();
    updateSavedHint();
    scheduleRender();
    resetView();
    setStatus("已开始一团新的泥料");
  }

  function hideWelcomeAndStart({ resume = false } = {}) {
    if (resume) loadSavedState();
    else if (!savedPayload) startNew();
    welcome.hidden = true;
    svg.focus({ preventScroll: true });
  }

  function openTutorial(fromWelcome = false) {
    tutorialStartedFromWelcome = fromWelcome;
    if (fromWelcome) welcome.hidden = true;
    tutorial.hidden = false;
    closeTutorialButton.focus({ preventScroll: true });
  }

  function closeTutorial() {
    tutorial.hidden = true;
    if (tutorialStartedFromWelcome) {
      tutorialStartedFromWelcome = false;
      hideWelcomeAndStart({ resume: Boolean(savedPayload) });
    } else {
      svg.focus({ preventScroll: true });
    }
  }

  function openStudio() {
    focusBeforeStudio =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : openButton;
    workshop.hidden = false;
    page.classList.add("is-studio-open");
    document.body.classList.add("nr-clay-studio-open");
    savedPayload = readSavedPayload();
    updateSavedHint();
    welcome.hidden = false;
    tutorial.hidden = true;
    referenceLightbox.hidden = true;
    presentation.hidden = true;
    scheduleRender();
    applyView();
    welcomeTitle.focus({ preventScroll: true });
  }

  function closeStudio({ focus = true } = {}) {
    welcome.hidden = true;
    tutorial.hidden = true;
    referenceLightbox.hidden = true;
    presentation.hidden = true;
    workshop.hidden = true;
    page.classList.remove("is-studio-open");
    document.body.classList.remove("nr-clay-studio-open");
    activePointers.clear();
    gesture = null;
    pinch = null;
    if (focus) {
      const target =
        focusBeforeStudio instanceof HTMLElement
          ? focusBeforeStudio
          : openButton;
      target.focus({ preventScroll: true });
    }
  }

  function openReference(kind) {
    const isProfile = kind === "profile";
    referenceLarge.src = isProfile ? ASSETS.profile : ASSETS.front;
    referenceLarge.alt = isProfile
      ? "海张五侧脸参考头像"
      : "海张五正面参考头像";
    referenceCaption.textContent = isProfile
      ? "侧影：帽饰、鼻梁、下颌与胡须侧面轮廓"
      : "正面：眉眼、鼻翼、八字胡、髻须与宽厚脸形";
    referenceLightbox.hidden = false;
    closeReferenceButton.focus({ preventScroll: true });
  }

  function drawPaper(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#f2ead8");
    gradient.addColorStop(0.55, "#e6dbc3");
    gradient.addColorStop(1, "#d9c8a9");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    const paper = assetImages.get("paper");
    if (paper?.naturalWidth) {
      ctx.globalAlpha = 0.32;
      ctx.drawImage(paper, 0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }

  function drawTexturePath(ctx, pathString, image) {
    const path = new Path2D(pathString);
    ctx.save();
    ctx.clip(path);
    if (image?.naturalWidth) {
      const targetWidth = 800;
      const targetHeight = 560;
      const coverScale = Math.max(
        targetWidth / image.naturalWidth,
        targetHeight / image.naturalHeight,
      );
      const drawWidth = image.naturalWidth * coverScale;
      const drawHeight = image.naturalHeight * coverScale;
      ctx.drawImage(
        image,
        (targetWidth - drawWidth) / 2,
        (targetHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    } else {
      ctx.fillStyle = "#b9865d";
      ctx.fillRect(0, 0, 800, 560);
    }
    ctx.restore();
    return path;
  }

  function drawExportArtwork() {
    const canvas = presentationCanvas;
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    drawPaper(context, width, height);

    const include = includeReference.checked;
    const artWidth = include ? width * 0.72 : width;
    const scale = Math.min((artWidth - 130) / 800, (height - 190) / 560);
    const offsetX = (artWidth - 800 * scale) / 2;
    const offsetY = (height - 560 * scale) / 2 - 18;

    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);

    context.save();
    context.fillStyle = "rgba(47, 31, 19, 0.2)";
    context.beginPath();
    context.ellipse(400, 474, 218, 25, 0, 0, Math.PI * 2);
    context.filter = "blur(12px)";
    context.fill();
    context.restore();

    const bodyPath = new Path2D(catmullPath(state.basePoints));
    context.save();
    context.shadowColor = "rgba(42, 27, 16, 0.4)";
    context.shadowBlur = 24;
    context.shadowOffsetY = 18;
    drawTexturePath(context, catmullPath(state.basePoints), assetImages.get("texture"));
    context.restore();

    context.save();
    context.clip(bodyPath);
    const volumeGradient = context.createRadialGradient(
      310,
      190,
      40,
      410,
      300,
      390,
    );
    volumeGradient.addColorStop(0, "rgba(255, 239, 201, 0.44)");
    volumeGradient.addColorStop(0.42, "rgba(209, 153, 98, 0.06)");
    volumeGradient.addColorStop(1, "rgba(55, 33, 20, 0.32)");
    context.fillStyle = volumeGradient;
    context.fillRect(0, 0, 800, 560);

    const highlight = assetImages.get("highlight");
    if (highlight?.naturalWidth) {
      context.globalAlpha = 0.18;
      context.globalCompositeOperation = "soft-light";
      context.drawImage(highlight, 44, 38, 712, 504);
    }
    const indent = assetImages.get("indent");
    if (indent?.naturalWidth) {
      context.globalAlpha = 0.14;
      context.globalCompositeOperation = "multiply";
      context.drawImage(indent, 245, 160, 410, 370);
    }
    context.restore();

    state.blocks.forEach((block) => {
      const pathString = blockPath(block);
      context.save();
      context.shadowColor = "rgba(50, 31, 18, 0.3)";
      context.shadowBlur = 12;
      context.shadowOffsetY = 8;
      drawTexturePath(context, pathString, assetImages.get("texture"));
      context.restore();
      context.save();
      context.clip(new Path2D(pathString));
      const blockGradient = context.createRadialGradient(
        block.x - block.rx * 0.4,
        block.y - block.ry * 0.5,
        3,
        block.x,
        block.y,
        Math.max(block.rx, block.ry),
      );
      blockGradient.addColorStop(0, "rgba(255, 237, 198, 0.34)");
      blockGradient.addColorStop(1, "rgba(54, 32, 20, 0.25)");
      context.fillStyle = blockGradient;
      context.fillRect(
        block.x - block.rx * 1.5,
        block.y - block.ry * 1.5,
        block.rx * 3,
        block.ry * 3,
      );
      context.restore();
    });

    context.lineCap = "round";
    context.lineJoin = "round";
    state.strokes.forEach((stroke) => {
      const path = new Path2D(strokePath(stroke));
      context.strokeStyle = "rgba(238, 210, 168, 0.24)";
      context.lineWidth = Math.max(1, stroke.width * 0.8);
      context.save();
      context.translate(1.1, -1.1);
      context.stroke(path);
      context.restore();
      context.strokeStyle = stroke.color;
      context.globalAlpha = clamp(0.28 + stroke.depth / 120, 0.3, 1);
      context.lineWidth = stroke.width;
      context.stroke(path);
      context.globalAlpha = 1;
    });
    context.restore();

    if (include) {
      const front = assetImages.get("front");
      const referenceSize = Math.min(width * 0.22, height * 0.44);
      const referenceX = width - referenceSize - 70;
      const referenceY = 105;
      if (front?.naturalWidth) {
        context.save();
        context.globalAlpha = 0.94;
        context.drawImage(
          front,
          referenceX,
          referenceY,
          referenceSize,
          referenceSize,
        );
        context.globalAlpha = 1;
        context.strokeStyle = "rgba(84, 62, 40, 0.28)";
        context.strokeRect(
          referenceX,
          referenceY,
          referenceSize,
          referenceSize,
        );
        context.fillStyle = "#6b5743";
        context.font = "26px serif";
        context.textAlign = "center";
        context.fillText(
          "人物参考",
          referenceX + referenceSize / 2,
          referenceY + referenceSize + 38,
        );
        context.restore();
      }
    }

    context.save();
    context.fillStyle = "#5b4938";
    context.font = "42px serif";
    context.textAlign = "center";
    context.fillText("我的海张五泥像", width / 2, height - 48);
    context.restore();
    return canvas;
  }

  function renderPresentation() {
    assetsReadyPromise.then(() => {
      drawExportArtwork();
    });
  }

  function completeArtwork() {
    saveToLocal({ silent: true });
    renderPresentation();
    presentation.hidden = false;
    presentationStatus.textContent = "作品已保存，可继续修改或导出 PNG";
    continueEditingButton.focus({ preventScroll: true });
  }

  async function exportPngDataUrl() {
    await assetsReadyPromise;
    drawExportArtwork();
    return presentationCanvas.toDataURL("image/png");
  }

  async function downloadPng() {
    presentationStatus.textContent = "正在生成高清 PNG…";
    try {
      const dataUrl = await exportPngDataUrl();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "我的海张五泥像.png";
      document.body.append(link);
      link.click();
      link.remove();
      presentationStatus.textContent =
        "PNG 已生成：不包含工具栏、光标和控制点";
    } catch (error) {
      presentationStatus.textContent = "PNG 导出失败，请稍后重试";
    }
  }

  function preloadAssets() {
    const entries = Object.entries(ASSETS);
    assetsReadyPromise = Promise.all(
      entries.map(
        ([key, source]) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
              if (image.naturalWidth > 0) {
                assetImages.set(key, image);
                resolve({ key, source, loaded: true });
              } else {
                resolve({ key, source, loaded: false });
              }
            };
            image.onerror = () => resolve({ key, source, loaded: false });
            image.src = source;
          }),
      ),
    ).then((results) => {
      assetState = {
        total: results.length,
        loaded: results.filter((result) => result.loaded).length,
        failed: results
          .filter((result) => !result.loaded)
          .map((result) => result.source),
      };
      workshop.dataset.assetsReady = String(assetState.failed.length === 0);
      if (assetState.failed.length) {
        setStatus(`有 ${assetState.failed.length} 张素材未载入`);
      }
      return assetState;
    });
    return assetsReadyPromise;
  }

  function readState() {
    return {
      page: window.niRenZhangStory?.getCurrentPage(),
      studioOpen: !workshop.hidden,
      tool,
      brushSize,
      strength,
      selection: selection ? { ...selection } : null,
      view: { ...view },
      assets: {
        ...assetState,
        failed: [...assetState.failed],
      },
      history: {
        index: historyIndex,
        length: history.length,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
      },
      state: deepClone(state),
      saved: Boolean(readSavedPayload()),
    };
  }

  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setTool(button.dataset.clayTool);
    });
  });

  brushSizeInput.addEventListener("input", () => {
    brushSize = Number(brushSizeInput.value);
    updateSettingLabels();
  });

  strengthInput.addEventListener("input", () => {
    strength = Number(strengthInput.value);
    updateSettingLabels();
  });

  brushSizeInput.addEventListener("change", () => {
    const object = selectedObject();
    if (!object) return;
    if (selection.type === "block") {
      object.rx = clamp(brushSize * 0.72, 10, 180);
      object.ry = clamp(brushSize * 0.54, 8, 150);
      scheduleRender({ blocks: true, selection: true });
      commitHistory();
    } else {
      object.width = clamp(brushSize * 0.13, 2, 26);
      scheduleRender({ strokes: true, selection: true });
      commitHistory();
    }
  });

  strengthInput.addEventListener("change", () => {
    const object = selectedObject();
    if (selection?.type === "stroke" && object) {
      object.depth = strength;
      scheduleRender({ strokes: true, selection: true });
      commitHistory();
    }
  });

  svg.addEventListener("pointerdown", handlePointerDown);
  svg.addEventListener("pointermove", handlePointerMove);
  svg.addEventListener("pointerup", handlePointerUp);
  svg.addEventListener("pointercancel", handlePointerCancel);
  svg.addEventListener("pointerleave", () => {
    if (!gesture) brushIndicator.classList.remove("is-visible");
  });
  svg.addEventListener("dblclick", resetView);
  svg.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const root = screenToSvgPoint(event);
      if (!root) return;
      const before = toContentPoint(root);
      view.scale = clamp(
        view.scale * (event.deltaY < 0 ? 1.08 : 0.92),
        0.72,
        2.6,
      );
      const after = toContentPoint(root);
      view.x += (after.x - before.x) * view.scale;
      view.y += (after.y - before.y) * view.scale;
      applyView();
    },
    { passive: false },
  );

  openButton.addEventListener("click", openStudio);
  closeButton.addEventListener("click", () => closeStudio());
  returnButton.addEventListener("click", () => closeStudio());
  helpButton.addEventListener("click", () => openTutorial(false));
  undoButton.addEventListener("click", undo);
  redoButton.addEventListener("click", redo);
  saveButton.addEventListener("click", () => saveToLocal());
  resetButton.addEventListener("click", resetArtwork);
  completeButton.addEventListener("click", completeArtwork);
  deleteSelectionButton.addEventListener("click", deleteSelected);

  resumeButton.addEventListener("click", () => {
    hideWelcomeAndStart({ resume: true });
  });
  startNewButton.addEventListener("click", () => {
    startNew();
    hideWelcomeAndStart();
  });
  openTutorialButton.addEventListener("click", () => openTutorial(true));
  skipWelcomeButton.addEventListener("click", () => {
    hideWelcomeAndStart({ resume: Boolean(savedPayload) });
  });
  closeTutorialButton.addEventListener("click", closeTutorial);

  referenceToggle.addEventListener("click", () => {
    const collapsed = workshop.classList.toggle("reference-collapsed");
    referenceToggle.setAttribute("aria-expanded", String(!collapsed));
    referenceToggle.textContent = collapsed ? "展开参考" : "收起参考";
  });
  workshop.querySelectorAll("[data-reference-open]").forEach((button) => {
    button.addEventListener("click", () => {
      openReference(button.dataset.referenceOpen);
    });
  });
  closeReferenceButton.addEventListener("click", () => {
    referenceLightbox.hidden = true;
  });

  continueEditingButton.addEventListener("click", () => {
    presentation.hidden = true;
    svg.focus({ preventScroll: true });
  });
  saveImageButton.addEventListener("click", downloadPng);
  returnFromPresentationButton.addEventListener("click", () => closeStudio());
  includeReference.addEventListener("change", () => {
    if (!presentation.hidden) renderPresentation();
  });

  document.addEventListener("keydown", (event) => {
    if (workshop.hidden) return;
    if (event.key === "Escape") {
      if (!referenceLightbox.hidden) {
        referenceLightbox.hidden = true;
        return;
      }
      if (!tutorial.hidden) {
        closeTutorial();
        return;
      }
      if (!presentation.hidden) {
        presentation.hidden = true;
        return;
      }
      if (!welcome.hidden) {
        skipWelcomeButton.click();
        return;
      }
      closeStudio();
      return;
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "z"
    ) {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "y"
    ) {
      event.preventDefault();
      redo();
    }
  });

  window.addEventListener("pagehide", () => {
    if (!workshop.hidden) saveToLocal({ silent: true });
  });

  window.niRenZhangClayWorkshop = {
    open: openStudio,
    close: () => closeStudio(),
    getState: readState,
    setTool,
    undo,
    redo,
    reset: resetArtwork,
    startNew,
    save: () => saveToLocal(),
    complete: completeArtwork,
    showTutorial: () => openTutorial(false),
    exportPngDataUrl,
    assetsReady: () => assetsReadyPromise,
  };

  setTool("sculpt");
  updateSettingLabels();
  updateSelectionUi();
  updateHistoryUi();
  updateSavedHint();
  applyView();
  scheduleRender();
  preloadAssets();
})();
