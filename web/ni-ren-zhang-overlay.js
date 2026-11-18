(() => {
  "use strict";

  const config = window.HAIZHANGWU_OVERLAY_CONFIG;
  const hitMask = window.HAIZHANGWU_HIT_MASK;
  const page = document.querySelector("#nrPageObserve");
  const placement = document.querySelector("#nrSeaFigurePlacement");
  const image = document.querySelector("#nrSeaFigureOverlay");
  const hitBounds = document.querySelector("#nrSeaHitBounds");
  const bounds = document.querySelector("#nrSeaFigureBounds");
  const points = document.querySelector("#nrSeaDebugPoints");
  const control = document.querySelector("#nrSeaCalibrator");
  if (
    !config ||
    !page ||
    !placement ||
    !image ||
    !hitBounds ||
    !bounds ||
    !points ||
    !control
  ) {
    return;
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const isDevelopment =
    localHosts.has(location.hostname) || location.protocol === "file:";
  const params = new URLSearchParams(location.search);
  const debugRequested =
    params.get("overlay-debug") === "1" ||
    params.get("haizhangwu-calibrate") === "1";
  let active = isDevelopment && debugRequested;
  let transform = { ...config.transform };
  let showBounds = false;
  let showPoints = true;
  let statusTimer = null;
  let hitBytes = null;
  let debugOpacity = 0.5;

  function loadHitMask() {
    if (!hitMask?.data || !hitMask.width || !hitMask.height) {
      hitBounds.style.display = "none";
      return;
    }
    try {
      const binary = window.atob(hitMask.data);
      hitBytes = Uint8Array.from(binary, (character) =>
        character.charCodeAt(0),
      );
    } catch {
      hitBytes = null;
      hitBounds.style.display = "none";
    }
  }

  function sourcePoint(clientX, clientY) {
    const matrix = image.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(
      matrix.inverse(),
    );
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= config.figure.width ||
      point.y >= config.figure.height
    ) {
      return null;
    }
    return point;
  }

  function getAlphaAt(x, y) {
    if (!hitBytes) return -1;
    if (
      x < 0 ||
      y < 0 ||
      x >= config.figure.width ||
      y >= config.figure.height
    ) {
      return 0;
    }
    const maskX = Math.min(
      hitMask.width - 1,
      Math.floor((x / config.figure.width) * hitMask.width),
    );
    const maskY = Math.min(
      hitMask.height - 1,
      Math.floor((y / config.figure.height) * hitMask.height),
    );
    const index = maskY * hitMask.width + maskX;
    const byte = hitBytes[index >> 3] || 0;
    return (byte & (1 << (7 - (index & 7)))) !== 0 ? 255 : 0;
  }

  function isFigurePoint(clientX, clientY) {
    if (!hitBytes) return false;
    const point = sourcePoint(clientX, clientY);
    if (!point) return false;
    return getAlphaAt(point.x, point.y) > 8;
  }

  function updateHitFeedback(event) {
    const hit = isFigurePoint(event.clientX, event.clientY);
    page.classList.toggle("is-figure-hit", hit);
    hitBounds.style.cursor = hit ? "pointer" : "default";
  }

  function round(value) {
    return Math.round(value * 1000) / 1000;
  }

  function applyTransform() {
    placement.setAttribute(
      "transform",
      `translate(${transform.left} ${transform.top}) scale(${transform.scale})`,
    );
    bounds.setAttribute(
      "x",
      String(config.figure.alphaBounds.left),
    );
    bounds.setAttribute("y", String(config.figure.alphaBounds.top));
    bounds.setAttribute(
      "width",
      String(
        config.figure.alphaBounds.right - config.figure.alphaBounds.left,
      ),
    );
    bounds.setAttribute(
      "height",
      String(
        config.figure.alphaBounds.bottom - config.figure.alphaBounds.top,
      ),
    );
    image.setAttribute("x", "0");
    image.setAttribute("y", "0");
    image.setAttribute("width", String(config.figure.width));
    image.setAttribute("height", String(config.figure.height));
    image.style.opacity = String(currentOpacity());
    hitBounds.setAttribute("x", String(config.figure.alphaBounds.left));
    hitBounds.setAttribute("y", String(config.figure.alphaBounds.top));
    hitBounds.setAttribute(
      "width",
      String(
        config.figure.alphaBounds.right - config.figure.alphaBounds.left,
      ),
    );
    hitBounds.setAttribute(
      "height",
      String(
        config.figure.alphaBounds.bottom - config.figure.alphaBounds.top,
      ),
    );
    renderPoints();
    renderReadout();
    window.HaizhangwuViewerSync?.();
  }

  function renderPoints() {
    points.replaceChildren();
    if (!active || !showPoints) return;
    config.keypoints.forEach((point) => {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("transform", `translate(${point.x} ${point.y})`);

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      circle.setAttribute("r", "11");
      group.append(circle);

      const label = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      label.setAttribute("x", "16");
      label.setAttribute("y", "-14");
      label.textContent = point.label;
      group.append(label);
      points.append(group);
    });
  }

  function currentParams() {
    return {
      scale: round(transform.scale),
      left: round(transform.left),
      top: round(transform.top),
      opacity: active ? debugOpacity : (config.transform.opacity ?? 1),
    };
  }

  function currentOpacity() {
    return active ? debugOpacity : (config.transform.opacity ?? 1);
  }

  function updateSliderValues() {
    const values = {
      left: transform.left,
      top: transform.top,
      scale: transform.scale,
      opacity: currentOpacity() * 100,
    };
    Object.entries(values).forEach(([key, value]) => {
      const input = control.querySelector(
        `[data-overlay-input="${key}"]`,
      );
      const output = control.querySelector(
        `[data-overlay-value="${key}"]`,
      );
      if (input) input.value = String(value);
      if (output) {
        output.textContent =
          key === "opacity"
            ? `${Math.round(value)}%`
            : key === "scale"
              ? Number(value).toFixed(3)
              : `${Math.round(value)} px`;
      }
    });
  }

  function renderReadout() {
    const readout = control.querySelector("[data-overlay-readout]");
    if (!readout) return;
    const current = currentParams();
    readout.textContent =
      `X ${current.left}px · Y ${current.top}px · ` +
      `缩放 ${current.scale} · 透明度 ${Math.round(current.opacity * 100)}%`;
    updateSliderValues();
    control
      .querySelector('[data-overlay-action="bounds"]')
      ?.setAttribute("aria-pressed", String(showBounds));
    control
      .querySelector('[data-overlay-action="points"]')
      ?.setAttribute("aria-pressed", String(showPoints));
  }

  function setStatus(message) {
    const status = control.querySelector("[data-overlay-status]");
    if (!status) return;
    window.clearTimeout(statusTimer);
    status.textContent = message;
    statusTimer = window.setTimeout(() => {
      status.textContent = "";
    }, 2200);
  }

  function setActive(nextActive) {
    active = Boolean(nextActive) && isDevelopment;
    page.classList.toggle("is-calibrating", active);
    control.hidden = !active;
    if (active) {
      showBounds = true;
      showPoints = true;
      debugOpacity = 0.5;
    }
    page.classList.toggle("show-overlay-bounds", active && showBounds);
    image.style.opacity = String(currentOpacity());
    renderPoints();
    renderReadout();
    window.HaizhangwuViewerSync?.();
  }

  function move(dx, dy) {
    if (!active) return;
    transform.left += dx;
    transform.top += dy;
    applyTransform();
  }

  function resize(delta) {
    if (!active) return;
    transform.scale = Math.max(0.1, Math.min(2, transform.scale + delta));
    applyTransform();
  }

  function reset() {
    transform = { ...config.transform };
    debugOpacity = 0.5;
    showBounds = true;
    showPoints = true;
    image.style.opacity = String(currentOpacity());
    page.classList.toggle("show-overlay-bounds", active && showBounds);
    applyTransform();
    setStatus("已恢复配置中的初始定位");
  }

  async function copyParams() {
    const text = JSON.stringify(
      {
        ...currentParams(),
        opacity: config.transform.opacity ?? 1,
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(text);
      setStatus("已复制最终定位参数；正常阅读透明度为 100%");
    } catch {
      const sheet = document.createElement("textarea");
      sheet.value = text;
      sheet.setAttribute("readonly", "");
      sheet.style.position = "fixed";
      sheet.style.opacity = "0";
      document.body.append(sheet);
      sheet.select();
      document.execCommand("copy");
      sheet.remove();
      setStatus("已复制最终定位参数；正常阅读透明度为 100%");
    }
  }

  control.addEventListener("input", (event) => {
    const input = event.target.closest("[data-overlay-input]");
    if (!input || !active) return;
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    if (input.dataset.overlayInput === "left") transform.left = value;
    if (input.dataset.overlayInput === "top") transform.top = value;
    if (input.dataset.overlayInput === "scale") {
      transform.scale = Math.max(0.1, Math.min(2, value));
    }
    if (input.dataset.overlayInput === "opacity") {
      debugOpacity = Math.max(0, Math.min(1, value / 100));
    }
    applyTransform();
  });

  control.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const { overlayAction } = button.dataset;
    const amount = event.shiftKey ? 10 : 1;
    if (overlayAction === "left") move(-amount, 0);
    if (overlayAction === "right") move(amount, 0);
    if (overlayAction === "up") move(0, -amount);
    if (overlayAction === "down") move(0, amount);
    if (overlayAction === "smaller") resize(event.shiftKey ? -0.01 : -0.001);
    if (overlayAction === "larger") resize(event.shiftKey ? 0.01 : 0.001);
    if (overlayAction === "reset") reset();
    if (overlayAction === "copy") copyParams();
    if (overlayAction === "bounds") {
      showBounds = !showBounds;
      page.classList.toggle("show-overlay-bounds", showBounds);
      renderReadout();
    }
    if (overlayAction === "points") {
      showPoints = !showPoints;
      renderPoints();
      renderReadout();
    }
    if (overlayAction === "close") setActive(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
      if (!isDevelopment) return;
      event.preventDefault();
      setActive(!active);
      return;
    }
    if (!active || event.target.matches("input, textarea")) return;

    const amount = event.shiftKey ? 10 : 1;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-amount, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(amount, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(0, -amount);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(0, amount);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      resize(event.shiftKey ? -0.01 : -0.001);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      resize(event.shiftKey ? 0.01 : 0.001);
    }
  });

  image.addEventListener("error", () => {
    image.style.display = "none";
    hitBounds.style.display = "none";
    setStatus("人物叠加素材加载失败，已保留原背景");
  });

  page.addEventListener("pointermove", updateHitFeedback, { passive: true });
  page.addEventListener("pointerleave", () => {
    page.classList.remove("is-figure-hit");
    hitBounds.style.cursor = "default";
  });

  loadHitMask();
  setActive(active);
  applyTransform();

  window.HaizhangwuOverlayCalibrator = Object.freeze({
    isEnabled: () => active,
    isDevelopment: () => isDevelopment,
    isFigurePoint,
    getAlphaAt,
    getState: () => ({
      ...currentParams(),
      showBounds,
      showPoints,
      src: image.getAttribute("href"),
      alphaReady: Boolean(hitBytes),
    }),
    setTransform: (next) => {
      if (!active) return;
      transform = {
        left: Number(next.left ?? transform.left),
        top: Number(next.top ?? transform.top),
        scale: Number(next.scale ?? transform.scale),
      };
      applyTransform();
    },
  });
})();
