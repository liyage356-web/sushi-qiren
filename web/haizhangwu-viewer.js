(() => {
  "use strict";

  const config = window.HAIZHANGWU_VIEWER_CONFIG;
  const viewer = document.querySelector("#haizhangwuViewer");
  if (!config || !viewer) return;

  const viewerSheet = viewer.querySelector(".hzw-sheet");
  const frame = viewer.querySelector("#hzwPortraitFrame");
  const visual = viewer.querySelector("#hzwVisual");
  const layers = [...viewer.querySelectorAll("[data-hzw-layer]")];
  const hotspots = viewer.querySelector("#hzwHotspots");
  const loading = viewer.querySelector("#hzwLoading");
  const viewLabel = viewer.querySelector("#hzwViewLabel");
  const zoomLabel = viewer.querySelector("#hzwZoomLabel");
  const angleLabel = viewer.querySelector("#hzwAngleLabel");
  const angleReadout = viewer.querySelector("#hzwAngleReadout");
  const angleDial = viewer.querySelector("#hzwAngleDial");
  const angleTicks = [...viewer.querySelectorAll("#hzwAngleDial i")];
  const rotationMode = viewer.querySelector("#hzwRotationMode");
  const rotationNote = viewer.querySelector("#hzwRotationNote");
  const detailTitle = viewer.querySelector("#hzwDetailTitle");
  const detailCopy = viewer.querySelector("#hzwDetailCopy");
  const modeSwitch = viewer.querySelector("[data-hzw-mode-switch]");
  const closeButton = viewer.querySelector(".hzw-close");
  const rotateButtons = [
    ...viewer.querySelectorAll("[data-hzw-rotate]"),
  ];
  const zoomButtons = [...viewer.querySelectorAll("[data-hzw-zoom]")];
  const modeButtons = [...viewer.querySelectorAll("[data-hzw-mode]")];
  const resetButton = viewer.querySelector("[data-hzw-reset]");
  const triggers = [
    ...document.querySelectorAll("[data-haizhangwu-open]"),
  ];
  const observePage = document.querySelector("#nrPageObserve");
  const observeBackground = observePage?.querySelector(
    ".nr-observe-background",
  );
  const seaHotspot = document.querySelector("#nrSeaHotspot");
  const seaHotspotShape = document.querySelector("#nrSeaHotspotShape");

  const fullViews = [...config.views].sort((a, b) => a.angle - b.angle);
  const fallbackViews = [...config.fallbackViews];
  let views = [...fallbackViews];
  let fullRotationEnabled = false;
  let rotationState = "pending";
  const preloaded = new Map();
  const highResPreloaded = new Map();
  const highResCacheOrder = [];
  const failedHighResSources = new Set();
  const pointers = new Map();
  const initialView = defaultViewFrom(views);
  const autoPanThreshold = 1.05;
  const state = {
    angle: initialView.angle,
    viewId: initialView.id,
    scale: 1,
    x: 0,
    y: 0,
    mode: "rotate",
    detailId: null,
  };

  let isOpen = false;
  let activeLayer = 0;
  let imageRequest = 0;
  let closeTimer = null;
  let opener = null;
  let savedBodyOverflow = "";
  let drag = null;
  let pinch = null;
  let easingTimer = null;
  let availabilityPromise = null;
  let resolutionRequest = 0;

  function defaultViewFrom(candidates) {
    return (
      candidates.find((view) => view.id === config.defaultViewId) ||
      candidates.find((view) => view.angle === 0) ||
      candidates[0]
    );
  }

  function positionFactor(token, fallback) {
    if (!token) return fallback;
    if (token === "center") return 0.5;
    if (token === "left" || token === "top") return 0;
    if (token === "right" || token === "bottom") return 1;
    const percentage = Number.parseFloat(token);
    return Number.isFinite(percentage)
      ? clamp(percentage / 100, 0, 1)
      : fallback;
  }

  function syncBackgroundHotspot() {
    if (!observePage || !observeBackground || !seaHotspot || !seaHotspotShape) {
      return;
    }
    const rect = observeBackground.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      !observeBackground.naturalWidth ||
      !observeBackground.naturalHeight
    ) {
      return;
    }

    const scale = Math.max(
      rect.width / observeBackground.naturalWidth,
      rect.height / observeBackground.naturalHeight,
    );
    const renderedWidth = observeBackground.naturalWidth * scale;
    const renderedHeight = observeBackground.naturalHeight * scale;
    const position = getComputedStyle(observeBackground)
      .objectPosition.split(/\s+/)
      .filter(Boolean);
    const focusX = positionFactor(position[0], 0.5);
    const focusY = positionFactor(position[1], 0.5);
    const offsetX = (rect.width - renderedWidth) * focusX;
    const offsetY = (rect.height - renderedHeight) * focusY;

    seaHotspot.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    seaHotspotShape.setAttribute(
      "transform",
      `translate(${offsetX} ${offsetY}) scale(${scale})`,
    );
  }

  function round(value, places = 2) {
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function currentView() {
    return views.find((view) => view.id === state.viewId) ||
      defaultViewFrom(views);
  }

  function viewIndexFor(view) {
    const index = views.findIndex((candidate) => candidate.id === view.id);
    return index < 0 ? views.indexOf(defaultViewFrom(views)) : index;
  }

  function resolveViewIndex(index) {
    if (fullRotationEnabled) {
      return ((index % views.length) + views.length) % views.length;
    }
    return clamp(index, 0, views.length - 1);
  }

  function announce(message) {
    const live = viewer.querySelector("#hzwLiveStatus");
    live.textContent = "";
    window.requestAnimationFrame(() => {
      live.textContent = message;
    });
  }

  function preload(imageSource) {
    if (preloaded.has(imageSource)) return preloaded.get(imageSource);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error(`无法加载人物视角：${imageSource}`));
      image.src = imageSource;
    });
    preloaded.set(imageSource, promise);
    return promise;
  }

  function highResSourceFor(view) {
    const source =
      typeof view.highResSrc === "string"
        ? view.highResSrc.trim()
        : "";
    return source && source !== view.src ? source : null;
  }

  function rememberHighResSource(imageSource) {
    const existingIndex = highResCacheOrder.indexOf(imageSource);
    if (existingIndex >= 0) highResCacheOrder.splice(existingIndex, 1);
    highResCacheOrder.push(imageSource);
    while (
      highResCacheOrder.length >
      Math.max(1, config.highResolutionCacheSize || 2)
    ) {
      highResPreloaded.delete(highResCacheOrder.shift());
    }
  }

  function preloadHighRes(imageSource) {
    if (failedHighResSources.has(imageSource)) {
      return Promise.reject(
        new Error(`高清人物素材不可用：${imageSource}`),
      );
    }
    if (highResPreloaded.has(imageSource)) {
      return highResPreloaded.get(imageSource);
    }
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        rememberHighResSource(imageSource);
        resolve(image);
      };
      image.onerror = () => {
        failedHighResSources.add(imageSource);
        highResPreloaded.delete(imageSource);
        reject(new Error(`无法加载高清人物视角：${imageSource}`));
      };
      image.src = imageSource;
    });
    highResPreloaded.set(imageSource, promise);
    return promise;
  }

  function applyDisplayResolution(view = currentView()) {
    const active = layers[activeLayer];
    if (!active || active.dataset.viewId !== view.id) return;
    const highResSource = highResSourceFor(view);
    const useHighResolution =
      state.scale > config.highResolutionThreshold && highResSource;

    if (!useHighResolution) {
      resolutionRequest += 1;
      if (
        active.dataset.resolution === "high" &&
        active.getAttribute("src") !== view.src
      ) {
        void preload(view.src).then(() => {
          const current = layers[activeLayer];
          if (
            !isOpen ||
            currentView().id !== view.id ||
            state.scale > config.highResolutionThreshold ||
            current.dataset.viewId !== view.id
          ) {
            return;
          }
          current.src = view.src;
          current.dataset.resolution = "standard";
        });
      }
      return;
    }

    if (
      active.dataset.resolution === "high" &&
      active.getAttribute("src") === highResSource
    ) {
      return;
    }

    const request = ++resolutionRequest;
    void preloadHighRes(highResSource)
      .then(async (image) => {
        if (typeof image.decode === "function") {
          await image.decode().catch(() => {});
        }
        if (
          request !== resolutionRequest ||
          !isOpen ||
          currentView().id !== view.id ||
          state.scale <= config.highResolutionThreshold
        ) {
          return;
        }
        const current = layers[activeLayer];
        if (current.dataset.viewId !== view.id) return;
        current.src = highResSource;
        current.dataset.resolution = "high";
        announce("已载入高清人物细节");
      })
      .catch(() => {
        // The already decoded standard frame remains visible.
      });
  }

  async function activateAvailableRotation() {
    if (availabilityPromise) return availabilityPromise;
    availabilityPromise = (async () => {
      try {
        await Promise.all(fullViews.map((view) => preload(view.src)));
        const currentAngle = state.angle;
        views = [...fullViews];
        fullRotationEnabled = true;
        rotationState = "full";
        const equivalentView =
          views.find((view) => view.angle === currentAngle) ||
          defaultViewFrom(views);
        state.angle = equivalentView.angle;
        state.viewId = equivalentView.id;
        if (isOpen && fullViews.some((view) => view.id === state.viewId)) {
          showImage(equivalentView);
          renderHotspots(equivalentView);
          renderDefaultDetail();
        }
      } catch (error) {
        views = [...fallbackViews];
        fullRotationEnabled = false;
        rotationState = "limited";
        const equivalentView =
          views.find((view) => view.angle === state.angle) ||
          defaultViewFrom(views);
        state.angle = equivalentView.angle;
        state.viewId = equivalentView.id;
        console.warn(error.message);
      }
      updateTransform();
      updateControls();
    })();
    return availabilityPromise;
  }

  function setLayerSource(layer, view) {
    layer.src = view.src;
    layer.alt = view.alt;
    layer.dataset.viewId = view.id;
    layer.dataset.resolution = "standard";
  }

  async function showImage(view, immediate = false) {
    const request = ++imageRequest;
    const active = layers[activeLayer];
    if (active.dataset.viewId === view.id && active.complete) {
      applyDisplayResolution(view);
      return;
    }

    loading.hidden = false;
    try {
      await preload(view.src);
      if (request !== imageRequest || !isOpen) return;
      const nextLayerIndex = 1 - activeLayer;
      const next = layers[nextLayerIndex];
      const highResAvailable =
        state.scale > config.highResolutionThreshold &&
        Boolean(highResSourceFor(view));
      if (
        next.dataset.viewId !== view.id ||
        (next.dataset.resolution === "high" && !highResAvailable)
      ) {
        setLayerSource(next, view);
      }
      if (typeof next.decode === "function") {
        await next.decode().catch(() => {});
        if (request !== imageRequest || !isOpen) return;
      }

      if (immediate) {
        layers.forEach((layer, index) => {
          layer.classList.toggle("is-active", index === nextLayerIndex);
          layer.setAttribute("aria-hidden", String(index !== nextLayerIndex));
        });
      } else {
        next.classList.add("is-active");
        next.setAttribute("aria-hidden", "false");
        active.classList.remove("is-active");
        active.setAttribute("aria-hidden", "true");
      }
      activeLayer = nextLayerIndex;
      loading.hidden = true;
      applyDisplayResolution(view);
    } catch (error) {
      if (request !== imageRequest) return;
      loading.querySelector("span").textContent =
        "人物素材未能加载，请检查图片目录";
      loading.hidden = false;
      console.error(error);
    }
  }

  function renderHotspots(view) {
    hotspots.replaceChildren();
    view.points.forEach((point) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hzw-hotspot";
      button.dataset.pointId = point.id;
      button.dataset.kind = point.kind;
      button.style.left = `${point.x}%`;
      button.style.top = `${point.y}%`;
      button.setAttribute("aria-label", `细看${point.label}`);
      button.innerHTML =
        '<span aria-hidden="true"></span><strong></strong>';
      button.querySelector("strong").textContent = point.label;
      button.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        focusPoint(point);
      });
      hotspots.append(button);
    });
  }

  function renderDefaultDetail() {
    state.detailId = null;
    detailTitle.textContent = "先看他的姿态";
    detailCopy.textContent =
      "海张五仰首、持扇、挺身，身上的每样物件都替他端着身份。轻触画面中的发光处，可放大查看细节。";
  }

  function renderPointDetail(point) {
    state.detailId = point.id;
    detailTitle.textContent = point.title;
    detailCopy.textContent = point.copy;
  }

  function clampPan() {
    const frameWidth = frame.clientWidth;
    const frameHeight = frame.clientHeight;
    const imageWidth = visual.offsetWidth * state.scale;
    const imageHeight = visual.offsetHeight * state.scale;
    // Horizontal pan follows the visible overflow so the portrait cannot be
    // thrown mostly off-screen. Vertical pan deliberately reaches half the
    // image height so the head or shoes can be brought to the centre.
    const maxX = Math.max(0, (imageWidth - frameWidth) / 2);
    const maxY = imageHeight > frameHeight ? imageHeight / 2 : 0;
    state.x = clamp(state.x, -maxX, maxX);
    state.y = clamp(state.y, -maxY, maxY);
  }

  function updateTransform() {
    clampPan();
    visual.style.setProperty("--hzw-scale", state.scale.toFixed(2));
    visual.style.setProperty(
      "--hzw-inverse-scale",
      (1 / state.scale).toFixed(3),
    );
    visual.style.transform =
      `translate(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px) ` +
      `scale(${state.scale})`;
    zoomLabel.textContent = `${state.scale.toFixed(1)}×`;
    const displayAngle = currentView().angle;
    angleLabel.textContent = `${displayAngle}°`;
    angleReadout.textContent = `${displayAngle}°`;
    angleDial.setAttribute(
      "aria-label",
      `当前视角 ${currentView().label}，${displayAngle} 度`,
    );
    angleTicks.forEach((tick) => {
      const active = Number(tick.dataset.angle) === displayAngle;
      tick.classList.toggle("is-active", active);
      tick.setAttribute("aria-current", active ? "true" : "false");
    });
    frame.dataset.mode = state.mode;
  }

  function updateControls() {
    const viewIndex = viewIndexFor(currentView());
    rotateButtons.forEach((button) => {
      const direction = Number(button.dataset.hzwRotate);
      button.disabled =
        !fullRotationEnabled &&
        ((direction < 0 && viewIndex === 0) ||
          (direction > 0 && viewIndex === views.length - 1));
    });
    zoomButtons.forEach((button) => {
      const action = button.dataset.hzwZoom;
      button.disabled =
        (action === "in" && state.scale >= config.zoom.max) ||
        (action === "out" && state.scale <= config.zoom.min);
    });
    modeSwitch.hidden = state.scale <= autoPanThreshold;
    modeButtons.forEach((button) => {
      const active = button.dataset.hzwMode === state.mode;
      button.setAttribute("aria-pressed", String(active));
      if (button.dataset.hzwMode === "pan") {
        button.disabled = state.scale <= autoPanThreshold;
      }
    });
    viewLabel.textContent = currentView().label;
    viewer.dataset.rotationMode = fullRotationEnabled ? "full" : "limited";
    rotationMode.textContent = fullRotationEnabled
      ? "八视角 · 360°"
      : rotationState === "pending"
        ? "正在核验视角"
        : "有限角度 · 未循环";
    rotationNote.textContent = fullRotationEnabled
      ? "八个独立视角已全部载入，拖动完成一圈后会回到正面。"
      : "八个独立视角尚未全部通过加载检查，当前仅开放原有有限角度。";
  }

  function selectView(view) {
    state.angle = view.angle;
    if (state.viewId !== view.id) {
      state.viewId = view.id;
      showImage(view);
      renderHotspots(view);
      renderDefaultDetail();
    }
    updateTransform();
    updateControls();
    applyDisplayResolution();
  }

  function stepView(direction, count = 1) {
    const index = viewIndexFor(currentView());
    const next = views[resolveViewIndex(index + direction * count)];
    selectView(next);
    announce(`人物已转到${next.label}，${next.angle}度`);
  }

  function setScale(nextScale, anchor = null) {
    const previousScale = state.scale;
    const resolvedScale = round(
      clamp(nextScale, config.zoom.min, config.zoom.max),
      2,
    );
    if (Math.abs(resolvedScale - previousScale) < 0.001) return;

    if (anchor && previousScale > 0) {
      const rect = frame.getBoundingClientRect();
      const viewportX =
        anchor.clientX - (rect.left + rect.width / 2);
      const viewportY =
        anchor.clientY - (rect.top + rect.height / 2);
      const imageX =
        (viewportX - state.x) / previousScale;
      const imageY =
        (viewportY - state.y) / previousScale;
      state.x = viewportX - imageX * resolvedScale;
      state.y = viewportY - imageY * resolvedScale;
    } else {
      // Button zoom keeps the image's current centre steady.
      state.x *= resolvedScale / previousScale;
      state.y *= resolvedScale / previousScale;
    }

    state.scale = resolvedScale;
    if (
      previousScale <= autoPanThreshold &&
      resolvedScale > autoPanThreshold
    ) {
      state.mode = "pan";
    }
    if (state.scale <= autoPanThreshold) {
      state.mode = "rotate";
      state.x = 0;
      state.y = 0;
    }
    updateTransform();
    updateControls();
    applyDisplayResolution();
  }

  function setMode(mode) {
    if (state.scale <= autoPanThreshold && mode === "pan") {
      announce("请先放大人物，再使用移动观察");
      return;
    }
    state.mode = mode;
    updateTransform();
    updateControls();
    applyDisplayResolution();
    announce(
      mode === "pan"
        ? "已切换到移动观察模式"
        : "已切换到旋转人物模式",
    );
  }

  function focusPoint(point) {
    const scale = Math.max(config.zoom.detailScale, state.scale);
    state.scale = round(clamp(scale, config.zoom.min, config.zoom.max), 2);
    state.mode = "pan";
    state.x =
      -(point.x / 100 - 0.5) * visual.offsetWidth * state.scale;
    state.y =
      -(point.y / 100 - 0.5) * visual.offsetHeight * state.scale;
    renderPointDetail(point);
    if (easingTimer !== null) window.clearTimeout(easingTimer);
    visual.classList.add("is-easing");
    window.requestAnimationFrame(updateTransform);
    updateControls();
    applyDisplayResolution();
    announce(`已放大观察：${point.title}`);
    easingTimer = window.setTimeout(() => {
      visual.classList.remove("is-easing");
      easingTimer = null;
    }, 360);
  }

  function reset() {
    const defaultView = defaultViewFrom(views);
    state.angle = defaultView.angle;
    state.viewId = defaultView.id;
    state.scale = 1;
    state.x = 0;
    state.y = 0;
    state.mode = "rotate";
    if (easingTimer !== null) {
      window.clearTimeout(easingTimer);
      easingTimer = null;
    }
    visual.classList.remove("is-easing");
    showImage(defaultView, true);
    renderHotspots(defaultView);
    renderDefaultDetail();
    updateTransform();
    updateControls();
    applyDisplayResolution();
    announce("人物已恢复正面和原始大小");
  }

  function setInitialLayer() {
    imageRequest += 1;
    const defaultView = defaultViewFrom(views);
    const initial = layers[0];
    const spare = layers[1];
    setLayerSource(initial, defaultView);
    spare.removeAttribute("src");
    spare.dataset.viewId = "";
    layers.forEach((layer, index) => {
      layer.classList.toggle("is-active", index === 0);
      layer.setAttribute("aria-hidden", String(index !== 0));
    });
    activeLayer = 0;
    loading.hidden = false;
    preload(defaultView.src)
      .then(() => {
        loading.hidden = true;
      })
      .catch((error) => {
        loading.querySelector("span").textContent =
          "人物素材未能加载，请检查图片目录";
        console.error(error);
      });
  }

  function focusableElements() {
    return [
      ...viewer.querySelectorAll(
        'button:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter(
      (element) =>
        element.offsetParent !== null &&
        getComputedStyle(element).visibility !== "hidden",
    );
  }

  function open(trigger = document.activeElement) {
    if (isOpen) return;
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
    opener = trigger instanceof Element ? trigger : null;
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("hzw-viewer-open");
    isOpen = true;
    viewer.hidden = false;
    reset();
    activateAvailableRotation();
    viewer.getBoundingClientRect();
    viewer.classList.add("is-open");
    window.requestAnimationFrame(() => {
      viewerSheet.focus({ preventScroll: true });
    });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    viewer.classList.remove("is-open");
    document.body.style.overflow = savedBodyOverflow;
    document.body.classList.remove("hzw-viewer-open");
    pointers.clear();
    drag = null;
    pinch = null;
    closeTimer = window.setTimeout(() => {
      if (isOpen) return;
      viewer.hidden = true;
      closeTimer = null;
      if (opener instanceof Element && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    }, 420);
  }

  function pointerPair() {
    return [...pointers.values()];
  }

  function pointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (!isOpen) return;
    event.preventDefault();
    if (easingTimer !== null) {
      window.clearTimeout(easingTimer);
      easingTimer = null;
      visual.classList.remove("is-easing");
    }
    try {
      frame.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer events do not always own an active browser pointer.
    }
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.size === 1) {
      drag = {
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        steps: 0,
      };
      pinch = null;
      frame.classList.add("is-dragging");
    } else if (pointers.size === 2) {
      const [first, second] = pointerPair();
      pinch = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        scale: state.scale,
        clientX: (first.x + second.x) / 2,
        clientY: (first.y + second.y) / 2,
      };
      drag = null;
    }
  }

  function pointerMove(event) {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault();
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.size >= 2) {
      const [first, second] = pointerPair();
      const distance = Math.hypot(
        second.x - first.x,
        second.y - first.y,
      );
      if (!pinch) {
        pinch = {
          distance,
          scale: state.scale,
          clientX: (first.x + second.x) / 2,
          clientY: (first.y + second.y) / 2,
        };
        return;
      }
      if (pinch.distance > 0) {
        setScale(pinch.scale * (distance / pinch.distance), {
          clientX: (first.x + second.x) / 2,
          clientY: (first.y + second.y) / 2,
        });
      }
      return;
    }

    if (!drag) return;
    const deltaX = event.clientX - drag.lastX;
    const deltaY = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    if (state.mode === "pan") {
      state.x += deltaX;
      state.y += deltaY;
      updateTransform();
      return;
    }
    const totalDragX = event.clientX - drag.startX;
    const steps = Math.trunc(
      totalDragX / config.rotationStepPixels,
    );
    if (steps !== drag.steps) {
      const delta = steps - drag.steps;
      drag.steps = steps;
      stepView(Math.sign(delta), Math.abs(delta));
    }
  }

  function pointerEnd(event) {
    pointers.delete(event.pointerId);
    try {
      if (frame.hasPointerCapture?.(event.pointerId)) {
        frame.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Pointer capture may already have been cleared by the browser.
    }
    if (pointers.size === 0) {
      drag = null;
      pinch = null;
      frame.classList.remove("is-dragging");
    } else if (pointers.size === 1) {
      drag = null;
      pinch = null;
    }
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      if (
        trigger === seaHotspot &&
        !window.HaizhangwuOverlayCalibrator?.isFigurePoint?.(
          event.clientX,
          event.clientY,
        )
      ) {
        return;
      }
      open(trigger);
    });
    trigger.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open(trigger);
    });
  });

  viewer
    .querySelectorAll("[data-hzw-close]")
    .forEach((button) => button.addEventListener("click", close));

  rotateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      stepView(Number(button.dataset.hzwRotate));
    });
  });

  zoomButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.hzwZoom === "in" ? 1 : -1;
      setScale(state.scale + direction * config.zoom.step);
    });
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.hzwMode);
    });
  });

  resetButton.addEventListener("click", reset);
  frame.addEventListener("pointerdown", pointerDown);
  frame.addEventListener("pointermove", pointerMove);
  frame.addEventListener("pointerup", pointerEnd);
  frame.addEventListener("pointercancel", pointerEnd);
  frame.addEventListener("lostpointercapture", pointerEnd);
  frame.addEventListener("pointerleave", (event) => {
    if (!frame.hasPointerCapture?.(event.pointerId)) {
      pointerEnd(event);
    }
  });
  frame.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      setScale(state.scale * factor, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    },
    { passive: false },
  );
  frame.addEventListener("dragstart", (event) => event.preventDefault());

  document.addEventListener(
    "keydown",
    (event) => {
      if (!isOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
        return;
      }
      if (event.key === "Tab") {
        const focusable = focusableElements();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        event.stopImmediatePropagation();
        return;
      }
      if (
        document.activeElement === frame &&
        state.mode === "rotate" &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        stepView(event.key === "ArrowLeft" ? -1 : 1);
      }
    },
    true,
  );

  document.addEventListener(
    "focusin",
    (event) => {
      if (isOpen && !viewer.contains(event.target)) {
        closeButton.focus({ preventScroll: true });
      }
    },
    true,
  );

  setInitialLayer();
  activateAvailableRotation();
  renderHotspots(defaultViewFrom(views));
  renderDefaultDetail();
  updateTransform();
  updateControls();

  observeBackground?.addEventListener("load", syncBackgroundHotspot);
  if (observePage && "ResizeObserver" in window) {
    new ResizeObserver(syncBackgroundHotspot).observe(observePage);
  }
  if (observePage && "MutationObserver" in window) {
    new MutationObserver(syncBackgroundHotspot).observe(observePage, {
      attributes: true,
      attributeFilter: ["hidden"],
    });
  }
  window.addEventListener(
    "resize",
    () => {
      syncBackgroundHotspot();
      if (isOpen) updateTransform();
    },
    { passive: true },
  );
  window.requestAnimationFrame(syncBackgroundHotspot);
  window.HaizhangwuViewerSync = syncBackgroundHotspot;

  window.HaizhangwuViewer = Object.freeze({
    open,
    close,
    reset,
    getConfig: () => config,
    getState: () => ({
      ...state,
      interactionMode: state.mode,
      panX: state.x,
      panY: state.y,
      rotationIndex: viewIndexFor(currentView()),
      resolution:
        layers[activeLayer]?.dataset.resolution || null,
      fullRotationEnabled,
      rotationState,
      viewCount: views.length,
    }),
    getAvailableViews: () =>
      views.map((view) => ({
        id: view.id,
        angle: view.angle,
        label: view.label,
        src: view.src,
      })),
    getActiveImage: () =>
      layers[activeLayer]?.getAttribute("src") || null,
  });
})();
