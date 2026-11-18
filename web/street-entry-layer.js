(() => {
  "use strict";

  const scene = document.querySelector("#streetScene");
  const world = document.querySelector("#streetWorld");
  const layer = document.querySelector("#streetEntryLayer");
  const tooltipElement = document.querySelector("#streetNameTooltip");
  const links = [...document.querySelectorAll(".street-entry-link")];
  if (!scene || !world || !layer || !tooltipElement || links.length !== 4) {
    return;
  }

  const masks = new Map();
  const maskSize = 320;

  class CharacterNameTooltip {
    constructor(element) {
      this.element = element;
      this.nameElement = element.querySelector("[data-street-tooltip-name]");
      this.currentLink = null;
    }

    show(link) {
      if (!link || !this.nameElement) return;
      this.currentLink = link;
      this.nameElement.textContent = link.dataset.streetName || "";
      this.position();
      this.element.classList.add("is-visible");
      this.element.setAttribute("aria-hidden", "false");
    }

    hide() {
      this.currentLink = null;
      this.element.classList.remove("is-visible");
      this.element.setAttribute("aria-hidden", "true");
    }

    position() {
      if (!this.currentLink) return;
      const sceneRect = scene.getBoundingClientRect();
      const anchorX =
        (Number(this.currentLink.dataset.tooltipX) / 1675) * sceneRect.width;
      const anchorY =
        (Number(this.currentLink.dataset.tooltipY) / 939) * sceneRect.height;
      const margin = 10;

      this.element.style.left = `${anchorX}px`;
      this.element.style.top = `${anchorY}px`;
      const tooltipRect = this.element.getBoundingClientRect();

      let left = anchorX - tooltipRect.width / 2;
      let top = anchorY - tooltipRect.height - 14;
      left = Math.min(
        Math.max(margin, left),
        Math.max(margin, sceneRect.width - tooltipRect.width - margin),
      );
      if (top < margin) {
        top = anchorY + 18;
      }
      top = Math.min(
        Math.max(margin, top),
        Math.max(margin, sceneRect.height - tooltipRect.height - margin),
      );
      this.element.style.left = `${left}px`;
      this.element.style.top = `${top}px`;
    }

    refresh() {
      this.position();
    }
  }

  const nameTooltip = new CharacterNameTooltip(tooltipElement);

  const calibrationEntries = {
    heitou: {
      label: "黑头",
      alphaBounds: { left: 75, top: 40, width: 621, height: 906 },
    },
    baozi: {
      label: "狗不理",
      alphaBounds: { left: 52, top: 175, width: 926, height: 1315 },
    },
    clay: {
      label: "泥人张招牌",
      alphaBounds: { left: 0, top: 19, width: 1000, height: 1499 },
    },
  };
  const linkByKey = new Map(
    links.map((link) => [link.dataset.streetEntry, link]),
  );
  const configuredTransforms = new Map(
    links.map((link) => [link.dataset.streetEntry, link.getAttribute("transform")]),
  );
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const isDevelopment =
    localHosts.has(location.hostname) || location.protocol === "file:";

  function parseTransform(value) {
    const match =
      /translate\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)\s*scale\(\s*(\d+(?:\.\d+)?)\s*\)/.exec(
        value || "",
      );
    if (!match) return null;
    return {
      x: Number(match[1]),
      y: Number(match[2]),
      scale: Number(match[3]),
    };
  }

  function formatNumber(value) {
    return String(Math.round(value * 10000) / 10000);
  }

  const StreetEntryCalibrator = (() => {
    let active = false;
    let panel = null;
    let style = null;
    let selectedKey = "heitou";
    let debugLayer = null;
    let opacity = 0.5;

    function selectedLink() {
      return linkByKey.get(selectedKey);
    }

    function selectedArt() {
      return selectedLink()?.querySelector(".street-entry-art") || null;
    }

    function currentTransform() {
      return parseTransform(selectedLink()?.getAttribute("transform"));
    }

    function applyTransform(transform) {
      const link = selectedLink();
      if (!link || !transform) return;
      link.setAttribute(
        "transform",
        `translate(${formatNumber(transform.x)} ${formatNumber(transform.y)}) scale(${formatNumber(transform.scale)})`,
      );
      updateReadout();
    }

    function removeDebugLayer() {
      debugLayer?.remove();
      debugLayer = null;
    }

    function createDebugLayer() {
      removeDebugLayer();
      const link = selectedLink();
      const config = calibrationEntries[selectedKey];
      if (!link || !config) return;
      const namespace = "http://www.w3.org/2000/svg";
      debugLayer = document.createElementNS(namespace, "g");
      debugLayer.dataset.streetAlignDebug = selectedKey;
      debugLayer.style.pointerEvents = "none";

      const boundary = document.createElementNS(namespace, "rect");
      boundary.dataset.streetAlignBoundary = "true";
      boundary.setAttribute("x", String(config.alphaBounds.left));
      boundary.setAttribute("y", String(config.alphaBounds.top));
      boundary.setAttribute("width", String(config.alphaBounds.width));
      boundary.setAttribute("height", String(config.alphaBounds.height));
      boundary.setAttribute("fill", "rgba(171, 58, 37, 0.035)");
      boundary.setAttribute("stroke", "rgba(171, 58, 37, 0.96)");
      boundary.setAttribute("stroke-width", "1.5");
      boundary.setAttribute("stroke-dasharray", "8 5");
      boundary.setAttribute("vector-effect", "non-scaling-stroke");
      debugLayer.append(boundary);

      const anchor = document.createElementNS(namespace, "g");
      anchor.dataset.streetAlignAnchor = "true";
      anchor.setAttribute("transform", "translate(0 0)");
      for (const [x1, y1, x2, y2] of [
        [-18, 0, 18, 0],
        [0, -18, 0, 18],
      ]) {
        const line = document.createElementNS(namespace, "line");
        line.setAttribute("x1", String(x1));
        line.setAttribute("y1", String(y1));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(y2));
        line.setAttribute("stroke", "rgba(26, 113, 99, 0.98)");
        line.setAttribute("stroke-width", "2");
        line.setAttribute("vector-effect", "non-scaling-stroke");
        anchor.append(line);
      }
      const circle = document.createElementNS(namespace, "circle");
      circle.setAttribute("cx", "0");
      circle.setAttribute("cy", "0");
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", "rgba(245, 238, 223, 0.95)");
      circle.setAttribute("stroke", "rgba(26, 113, 99, 0.98)");
      circle.setAttribute("stroke-width", "2");
      circle.setAttribute("vector-effect", "non-scaling-stroke");
      anchor.append(circle);
      debugLayer.append(anchor);
      link.append(debugLayer);
    }

    function setArtOpacity(value) {
      opacity = Math.min(1, Math.max(0, Number(value)));
      const art = selectedArt();
      if (art) art.style.opacity = String(opacity);
    }

    function updateReadout() {
      if (!panel) return;
      const transform = currentTransform();
      if (!transform) return;
      const readout = panel.querySelector("[data-street-align-readout]");
      const values = {
        x: transform.x,
        y: transform.y,
        scale: transform.scale,
        opacity,
      };
      for (const [key, value] of Object.entries(values)) {
        const input = panel.querySelector(`[data-street-align-input="${key}"]`);
        const output = panel.querySelector(`[data-street-align-value="${key}"]`);
        if (input && document.activeElement !== input) {
          input.value = String(value);
        }
        if (output) {
          output.textContent =
            key === "opacity"
              ? `${Math.round(value * 100)}%`
              : key === "scale"
                ? value.toFixed(4)
                : value.toFixed(1);
        }
      }
      if (readout) {
        readout.textContent = `translate(${formatNumber(transform.x)} ${formatNumber(transform.y)}) scale(${formatNumber(transform.scale)}) · ${Math.round(opacity * 100)}%`;
      }
    }

    function syncControls() {
      if (!panel) return;
      panel.querySelector("[data-street-align-entry]").value = selectedKey;
      updateReadout();
    }

    function selectEntry(key) {
      if (!calibrationEntries[key] || !linkByKey.has(key)) return;
      const previousArt = selectedArt();
      if (previousArt) previousArt.style.opacity = "1";
      selectedKey = key;
      createDebugLayer();
      setArtOpacity(0.5);
      syncControls();
    }

    function resetEntry() {
      const link = selectedLink();
      if (!link) return;
      link.setAttribute(
        "transform",
        configuredTransforms.get(selectedKey),
      );
      setArtOpacity(0.5);
      syncControls();
    }

    function makePanel() {
      panel = document.createElement("section");
      panel.id = "streetAlignCalibrator";
      panel.className = "street-align-calibrator";
      panel.dataset.streetAlignCalibrator = "true";
      panel.setAttribute("aria-label", "天津老街三处素材对齐校准");
      panel.innerHTML = `
        <header>
          <strong>老街素材对齐</strong>
          <button type="button" data-street-align-close aria-label="关闭对齐校准">关闭</button>
        </header>
        <p>仅开发环境显示。将当前素材设为 50% 后，与底图轮廓叠加对照。</p>
        <label>校准素材
          <select data-street-align-entry>
            ${Object.entries(calibrationEntries)
              .map(
                ([key, entry]) =>
                  `<option value="${key}">${entry.label}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label>X 坐标 <output data-street-align-value="x"></output>
          <input data-street-align-input="x" type="range" min="-100" max="1600" step="0.5">
        </label>
        <label>Y 坐标 <output data-street-align-value="y"></output>
        <input data-street-align-input="y" type="range" min="-100" max="900" step="0.5">
        </label>
        <label>等比例缩放 <output data-street-align-value="scale"></output>
          <input data-street-align-input="scale" type="range" min="0.02" max="0.6" step="0.0001">
        </label>
        <label>素材透明度 <output data-street-align-value="opacity"></output>
          <input data-street-align-input="opacity" type="range" min="0.1" max="1" step="0.01" value="0.5">
        </label>
        <div class="street-align-actions">
          <button type="button" data-street-align-reset>恢复最终参数</button>
        </div>
        <code data-street-align-readout></code>
      `;
      scene.append(panel);

      panel
        .querySelector("[data-street-align-entry]")
        .addEventListener("change", (event) => selectEntry(event.target.value));
      panel
        .querySelector("[data-street-align-close]")
        .addEventListener("click", close);
      panel
        .querySelector("[data-street-align-reset]")
        .addEventListener("click", resetEntry);

      for (const input of panel.querySelectorAll("[data-street-align-input]")) {
        input.addEventListener("input", () => {
          if (input.dataset.streetAlignInput === "opacity") {
            setArtOpacity(input.value);
            updateReadout();
            return;
          }
          const transform = currentTransform();
          if (!transform) return;
          const key = input.dataset.streetAlignInput;
          transform[key] = Number(input.value);
          applyTransform(transform);
        });
      }
    }

    function makeStyles() {
      style = document.createElement("style");
      style.id = "streetAlignCalibratorStyles";
      style.textContent = `
        .street-align-calibrator {
          position: absolute;
          right: 14px;
          bottom: 14px;
          z-index: 30;
          width: min(286px, calc(100% - 28px));
          padding: 14px;
          border: 1px solid rgba(75, 62, 45, .36);
          border-radius: 3px;
          color: #302b25;
          background:
            linear-gradient(rgba(247, 241, 226, .96), rgba(239, 230, 210, .96)),
            repeating-linear-gradient(0deg, transparent 0 3px, rgba(92, 74, 50, .04) 3px 4px);
          box-shadow: 0 8px 28px rgba(36, 29, 20, .22);
          font: 12px/1.45 "Microsoft YaHei", sans-serif;
          pointer-events: auto;
        }
        .street-align-calibrator[hidden] { display: none; }
        .street-align-calibrator header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .street-align-calibrator strong { font: 700 16px/1.4 "STKaiti", "KaiTi", serif; }
        .street-align-calibrator p { margin: 0 0 9px; color: #6d604f; }
        .street-align-calibrator label { display: grid; gap: 2px; margin-top: 7px; }
        .street-align-calibrator select,
        .street-align-calibrator input[type="range"] { width: 100%; }
        .street-align-calibrator output { float: right; color: #8b3f2f; font-variant-numeric: tabular-nums; }
        .street-align-calibrator button { border: 1px solid rgba(75, 62, 45, .35); border-radius: 2px; color: #302b25; background: #f5eedf; cursor: pointer; }
        .street-align-calibrator header button { padding: 2px 8px; }
        .street-align-actions { margin-top: 10px; }
        .street-align-actions button { width: 100%; padding: 5px; }
        .street-align-calibrator code { display: block; margin-top: 8px; padding-top: 7px; border-top: 1px solid rgba(75, 62, 45, .18); color: #6b3e2e; overflow-wrap: anywhere; }
      `;
      document.head.append(style);
    }

    function open() {
      if (!isDevelopment || active) return;
      active = true;
      makeStyles();
      makePanel();
      selectEntry(selectedKey);
      scene.classList.add("is-street-aligning");
    }

    function close() {
      if (!active) return;
      for (const art of layer.querySelectorAll(".street-entry-art")) {
        art.style.opacity = "1";
      }
      for (const link of links) {
        const configured = configuredTransforms.get(link.dataset.streetEntry);
        if (configured) link.setAttribute("transform", configured);
      }
      removeDebugLayer();
      panel?.remove();
      panel = null;
      style?.remove();
      style = null;
      scene.classList.remove("is-street-aligning");
      active = false;
    }

    function toggle() {
      if (active) close();
      else open();
    }

    function getState() {
      const transform = currentTransform();
      return Object.freeze({
        isDevelopment,
        active,
        selectedKey,
        transform: transform ? { ...transform } : null,
        opacity,
        boundaryVisible: Boolean(
          linkByKey
            .get(selectedKey)
            ?.querySelector("[data-street-align-boundary]"),
        ),
        anchorVisible: Boolean(
          linkByKey
            .get(selectedKey)
            ?.querySelector("[data-street-align-anchor]"),
        ),
      });
    }

    return Object.freeze({
      open,
      close,
      toggle,
      select: selectEntry,
      getState,
    });
  })();

  window.addEventListener("keydown", (event) => {
    if (
      event.ctrlKey &&
      event.shiftKey &&
      event.key.toLowerCase() === "a"
    ) {
      event.preventDefault();
      StreetEntryCalibrator.toggle();
    }
  });

  function createMask(link) {
    const image = link.querySelector(".street-entry-art");
    const href = image?.getAttribute("href");
    if (!href) return;

    const source = new Image();
    source.decoding = "async";
    source.addEventListener("load", () => {
      const ratio = Math.min(
        1,
        maskSize / Math.max(source.naturalWidth, source.naturalHeight),
      );
      const width = Math.max(1, Math.round(source.naturalWidth * ratio));
      const height = Math.max(1, Math.round(source.naturalHeight * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(source, 0, 0, width, height);
      try {
        const pixels = context.getImageData(0, 0, width, height).data;
        const alpha = new Uint8Array(width * height);
        for (let index = 0; index < alpha.length; index += 1) {
          alpha[index] = pixels[index * 4 + 3];
        }
        masks.set(link, {
          width,
          height,
          alpha,
          sourceWidth: source.naturalWidth,
          sourceHeight: source.naturalHeight,
        });
      } catch {
        masks.delete(link);
      }
    });
    source.addEventListener("error", () => masks.delete(link));
    source.src = href;
  }

  function localPoint(link, clientX, clientY) {
    const matrix = link.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(
      matrix.inverse(),
    );
    const mask = masks.get(link);
    if (!mask) return null;
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= mask.sourceWidth ||
      point.y >= mask.sourceHeight
    ) {
      return null;
    }
    return {
      x: Math.min(
        mask.width - 1,
        Math.floor((point.x / mask.sourceWidth) * mask.width),
      ),
      y: Math.min(
        mask.height - 1,
        Math.floor((point.y / mask.sourceHeight) * mask.height),
      ),
    };
  }

  function entryAt(clientX, clientY) {
    for (const link of [...links].reverse()) {
      const point = localPoint(link, clientX, clientY);
      if (!point) continue;
      const mask = masks.get(link);
      if (mask.alpha[point.y * mask.width + point.x] > 8) return link;
    }
    return null;
  }

  let hoveredLink = null;

  function clearHover() {
    hoveredLink = null;
    scene.classList.remove("is-street-entry-hit");
    nameTooltip.hide();
  }

  function updatePointer(event) {
    const link = entryAt(event.clientX, event.clientY);
    const hit = Boolean(link);
    scene.classList.toggle("is-street-entry-hit", hit);
    const canShowTooltip =
      event.pointerType === "mouse" || event.pointerType === "";
    if (!canShowTooltip) return;
    if (link === hoveredLink) return;
    hoveredLink = link;
    if (link) {
      nameTooltip.show(link);
    } else {
      nameTooltip.hide();
    }
  }

  function enterAt(event) {
    if (event.target.closest?.(".street-entry-link")) return;
    if (event.type === "click" && event.detail === 0) return;
    if (event.button !== undefined && event.button !== 0) return;
    const link = entryAt(event.clientX, event.clientY);
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    link.focus({ preventScroll: true });
    nameTooltip.hide();
    window.location.assign(link.getAttribute("href"));
  }

  links.forEach((link) => {
    createMask(link);
    link.addEventListener("focus", () => {
      hoveredLink = link;
      nameTooltip.show(link);
    });
    link.addEventListener("blur", () => {
      if (hoveredLink === link) clearHover();
    });
  });
  world.addEventListener("pointermove", updatePointer, { passive: true });
  world.addEventListener("pointerleave", clearHover);
  world.addEventListener("click", (event) => {
    if (event.detail !== 0) enterAt(event);
  });
  window.addEventListener("resize", () => nameTooltip.refresh(), {
    passive: true,
  });
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => nameTooltip.refresh()).observe(scene);
  }

  window.StreetEntries = Object.freeze({
    entryAt,
    calibrator: StreetEntryCalibrator,
    getEntryState: () =>
      links.map((link) => ({
        key: link.dataset.streetEntry,
        href: link.getAttribute("href"),
        transform: link.getAttribute("transform"),
        alphaReady: masks.has(link),
      })),
  });
})();
