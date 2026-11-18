(() => {
  "use strict";

  const component = document.querySelector("#dragonAssembly");
  const stage = document.querySelector("#assemblyStage");
  const canvas = document.querySelector(".dragon-assembly__coordinate");
  const partsPanel = document.querySelector("#dragonAssemblyParts");
  const progressBar = document.querySelector("#dragonAssemblyProgressBar");
  const progressText = document.querySelector("#dragonAssemblyProgressText");
  const stepLabel = document.querySelector("#dragonAssemblyStepLabel");
  const stepTitle = document.querySelector("#assemblyStepTitle");
  const stepBody = document.querySelector("#assemblyStepBody");
  const stageCaption = document.querySelector("#assemblyStageCaption");
  const stageNumber = document.querySelector("#assemblyStageNumber");
  const baseline = document.querySelector("#dragonAssemblyBaseline");
  const advanceButton = document.querySelector("#assemblyAdvance");
  const returnButton = document.querySelector("#dragonAssemblyReturn");
  const fallback = document.querySelector(".dragon-assembly__asset-fallback");
  const soundToggle = document.querySelector("#soundToggle");
  const completionPanel = document.querySelector("#assemblyComplete");
  const bridge = window.assemblyStageBridge;

  if (!component || !stage || !canvas || !partsPanel || !progressBar) {
    return;
  }

  const ASSET_ROOT = "../../public/assets/forty-eight/dragon-assembly/";
  const ASSETS = Object.freeze({
    "background.courtyard": "background/courtyard-background.png",
    "structure.yoke": "structure/yoke.png",
    "structure.bucketLeft": "structure/bucket-left.png",
    "structure.bucketRight": "structure/bucket-right.png",
    "parts.dragonLeft": "parts/dragon-left.png",
    "parts.dragonRight": "parts/dragon-right.png",
    "parts.goldBead": "parts/gold-bead.png",
    "parts.pompomLeft": "parts/pompom-left.png",
    "parts.pompomRight": "parts/pompom-right.png",
    "parts.lacquerSign": "parts/lacquer-sign.png",
    "parts.chainLeft": "parts/chain-left.png",
    "parts.chainRight": "parts/chain-right.png",
    "ui.stepSeal": "ui/step-seal.png",
    "ui.panelDivider": "ui/panel-divider.png",
  });
  const FALLBACK_ASSETS = Object.freeze({
    "background.courtyard": "background/courtyard-background.svg",
    "structure.yoke": "structure/yoke.svg",
    "structure.bucketLeft": "structure/bucket-left.svg",
    "structure.bucketRight": "structure/bucket-right.svg",
    "parts.dragonLeft": "parts/dragon-left.svg",
    "parts.dragonRight": "parts/dragon-right.svg",
    "parts.goldBead": "parts/gold-bead.svg",
    "parts.pompomLeft": "parts/pompom-left.svg",
    "parts.pompomRight": "parts/pompom-right.svg",
    "parts.lacquerSign": "parts/lacquer-sign.svg",
    "ui.stepSeal": "ui/step-seal.svg",
    "ui.panelDivider": "ui/panel-divider.svg",
  });
  const ASSET_LABELS = Object.freeze({
    "background.courtyard": "后院背景",
    "structure.yoke": "扁担",
    "structure.bucketLeft": "左桶柜",
    "structure.bucketRight": "右桶柜",
    "parts.dragonLeft": "左龙头",
    "parts.dragonRight": "右龙头",
    "parts.goldBead": "金珠",
    "parts.pompomLeft": "左绒球",
    "parts.pompomRight": "右绒球",
    "parts.lacquerSign": "金漆招牌",
    "parts.chainLeft": "左链条",
    "parts.chainRight": "右链条",
    "ui.stepSeal": "巧夺天工朱印",
    "ui.panelDivider": "链环分隔纹样",
  });
  const AUDIO_ASSETS = Object.freeze({
    assemblyStep: "audio/assembly-step.mp3",
    completion: "audio/assembly-complete.mp3",
    status: "missing",
  });
  const DESIGN = Object.freeze({ width: 1920, height: 1080 });
  const STAGES = Object.freeze([
    Object.freeze({
      number: 1,
      title: "安装左右桶柜",
      short: "双桶落肩",
      hint: "把左右桶柜拖到左侧，桶底靠近地面虚线后松手。",
      complete:
        "两只桶柜都已落稳，担子轻轻下沉，重心回到了肩位。",
      parts: ["bucketLeft", "bucketRight"],
    }),
    Object.freeze({
      number: 2,
      title: "放置扁担横梁",
      short: "横梁承肩",
      hint: "把扁担横梁拖到画布中任意位置，通常放在两只桶柜上方。",
      complete: "横梁落在双桶之上，挑担的轮廓终于立住。",
      parts: ["yoke"],
    }),
    Object.freeze({
      number: 3,
      title: "安装左右龙头",
      short: "龙头相向",
      hint: "将两只龙头拖到画布中任意位置，方向与间距都由你决定。",
      complete: "双龙落定，头颈微微一转，目光聚到中央。",
      parts: ["dragonLeft", "dragonRight"],
    }),
    Object.freeze({
      number: 4,
      title: "放置金珠与挂饰",
      short: "金珠挂饰",
      hint: "把金珠、左右链条和两只红绒球自由放到画布内。",
      complete: "两对挂件都已相连，红绒球轻轻荡了一下。",
      parts: [
        "goldBead",
        "springLeft",
        "springRight",
        "pompomLeft",
        "pompomRight",
      ],
    }),
    Object.freeze({
      number: 5,
      title: "显现金漆文字",
      short: "金漆落字",
      hint: "把两块金漆招牌分别送到左右桶柜的正面。",
      complete: "金漆字落定，一担四十八样终于成了。",
      parts: ["signLeft", "signRight"],
    }),
  ]);
  const PART_META = Object.freeze({
    bucketLeft: Object.freeze({
      stage: 1,
      label: "左桶柜",
      sublabel: "左肩",
      assetKey: "structure.bucketLeft",
      layerSelector: ".dragon-assembly__layer--bucket-left",
      alt: "中式古董糖药桶水彩插画",
    }),
    bucketRight: Object.freeze({
      stage: 1,
      label: "右桶柜",
      sublabel: "右肩",
      assetKey: "structure.bucketRight",
      layerSelector: ".dragon-assembly__layer--bucket-right",
      alt: "复古中式糖果筒插画",
    }),
    yoke: Object.freeze({
      stage: 2,
      label: "扁担横梁",
      sublabel: "承肩",
      assetKey: "structure.yoke",
      layerSelector: ".dragon-assembly__layer--yoke",
      alt: "弯曲的木质扁担横梁水彩插画",
    }),
    dragonLeft: Object.freeze({
      stage: 3,
      label: "左龙头",
      sublabel: "朝右",
      assetKey: "parts.dragonLeft",
      layerSelector: ".dragon-assembly__layer--dragon-left",
      alt: "朝右的金色水墨龙首",
    }),
    dragonRight: Object.freeze({
      stage: 3,
      label: "右龙头",
      sublabel: "朝左",
      assetKey: "parts.dragonRight",
      layerSelector: ".dragon-assembly__layer--dragon-right",
      alt: "朝左的金色水墨龙首",
    }),
    goldBead: Object.freeze({
      stage: 4,
      label: "金珠",
      sublabel: "梁心",
      assetKey: "parts.goldBead",
      layerSelector: ".dragon-assembly__layer--bead",
      alt: "手绘金色球形饰件",
    }),
    springLeft: Object.freeze({
      stage: 4,
      label: "左弹簧",
      sublabel: "链条",
      assetKey: "parts.chainLeft",
      layerSelector: ".dragon-assembly__layer--chain-left",
      alt: "复古青铜色斜向链条",
    }),
    springRight: Object.freeze({
      stage: 4,
      label: "右弹簧",
      sublabel: "链条",
      assetKey: "parts.chainRight",
      layerSelector: ".dragon-assembly__layer--chain-right",
      alt: "水彩手绘链环连接件",
    }),
    pompomLeft: Object.freeze({
      stage: 4,
      label: "左绒球",
      sublabel: "垂挂",
      assetKey: "parts.pompomLeft",
      layerSelector: ".dragon-assembly__layer--pompom-left",
      alt: "红色毛绒挂饰球",
    }),
    pompomRight: Object.freeze({
      stage: 4,
      label: "右绒球",
      sublabel: "垂挂",
      assetKey: "parts.pompomRight",
      layerSelector: ".dragon-assembly__layer--pompom-right",
      alt: "红色毛绒挂饰球",
    }),
    signLeft: Object.freeze({
      stage: 5,
      label: "左金漆字",
      sublabel: "四十八样",
      assetKey: "parts.lacquerSign",
      layerSelector: ".dragon-assembly__layer--sign",
      alt: "金色书法四十八样招牌",
    }),
    signRight: Object.freeze({
      stage: 5,
      label: "右金漆字",
      sublabel: "四十八样",
      assetKey: "parts.lacquerSign",
      layerSelector: ".dragon-assembly__layer--sign-right",
      alt: "金色书法四十八样招牌",
    }),
  });

  /*
   * Width values are normalized canvas widths. Height is always derived from
   * the supplied artwork's native aspect ratio, so drag previews, manual drops
   * and automatic assembly cannot apply conflicting scales to the same asset.
   */
  const makePartConfig = (definition) =>
    Object.freeze({
      id: definition.id,
      imageSrc: ASSETS[definition.assetKey],
      width: definition.width,
      height:
        (definition.width * DESIGN.width) /
        definition.aspectRatio /
        DESIGN.height,
      aspectRatio: definition.aspectRatio,
      anchorX: definition.anchorX,
      anchorY: definition.anchorY,
      zIndex: definition.zIndex,
      rotation: definition.rotation,
      scaleX: definition.scaleX,
    });

  const PART_CONFIG = Object.freeze({
    bucketLeft: makePartConfig({
      id: "bucketLeft",
      assetKey: "structure.bucketLeft",
      width: 0.154,
      aspectRatio: 812 / 1365,
      anchorX: 0.5,
      anchorY: 1,
      zIndex: 4,
      rotation: -0.4,
      scaleX: 1,
    }),
    bucketRight: makePartConfig({
      id: "bucketRight",
      assetKey: "structure.bucketRight",
      width: 0.154,
      aspectRatio: 809 / 1363,
      anchorX: 0.5,
      anchorY: 1,
      zIndex: 4,
      rotation: 0.4,
      scaleX: 1,
    }),
    yoke: makePartConfig({
      id: "yoke",
      assetKey: "structure.yoke",
      width: 0.614,
      aspectRatio: 2094 / 628,
      anchorX: 0.5,
      anchorY: 1,
      zIndex: 2,
      rotation: 0,
      scaleX: 1,
    }),
    dragonLeft: makePartConfig({
      id: "dragonLeft",
      assetKey: "parts.dragonLeft",
      width: 0.123,
      aspectRatio: 1083 / 749,
      anchorX: 0.5,
      anchorY: 1,
      zIndex: 6,
      rotation: -2,
      scaleX: 1,
    }),
    dragonRight: makePartConfig({
      id: "dragonRight",
      assetKey: "parts.dragonRight",
      width: 0.123,
      aspectRatio: 1087 / 750,
      anchorX: 0.5,
      anchorY: 1,
      zIndex: 6,
      rotation: 2,
      scaleX: 1,
    }),
    goldBead: makePartConfig({
      id: "goldBead",
      assetKey: "parts.goldBead",
      width: 0.039,
      aspectRatio: 550 / 613,
      anchorX: 0.5,
      anchorY: 1,
      zIndex: 7,
      rotation: 0,
      scaleX: 1,
    }),
    springLeft: makePartConfig({
      id: "springLeft",
      assetKey: "parts.chainLeft",
      width: 0.06,
      aspectRatio: 770 / 868,
      anchorX: 0,
      anchorY: 0,
      zIndex: 5,
      rotation: 0,
      scaleX: 1,
    }),
    springRight: makePartConfig({
      id: "springRight",
      assetKey: "parts.chainRight",
      width: 0.045,
      aspectRatio: 671 / 1074,
      anchorX: 1,
      anchorY: 0,
      zIndex: 5,
      rotation: 0,
      scaleX: 1,
    }),
    pompomLeft: makePartConfig({
      id: "pompomLeft",
      assetKey: "parts.pompomLeft",
      width: 0.036,
      aspectRatio: 590 / 612,
      anchorX: 0.5,
      anchorY: 0.5,
      zIndex: 8,
      rotation: 180,
      scaleX: 1,
    }),
    pompomRight: makePartConfig({
      id: "pompomRight",
      assetKey: "parts.pompomRight",
      width: 0.036,
      aspectRatio: 590 / 612,
      anchorX: 0.5,
      anchorY: 0.5,
      zIndex: 8,
      rotation: 180,
      scaleX: 1,
    }),
    signLeft: makePartConfig({
      id: "signLeft",
      assetKey: "parts.lacquerSign",
      width: 0.104,
      aspectRatio: 1908 / 517,
      anchorX: 0.5,
      anchorY: 0.5,
      zIndex: 9,
      rotation: -0.5,
      scaleX: 1,
    }),
    signRight: makePartConfig({
      id: "signRight",
      assetKey: "parts.lacquerSign",
      width: 0.104,
      aspectRatio: 1908 / 517,
      anchorX: 0.5,
      anchorY: 0.5,
      zIndex: 9,
      rotation: 0.5,
      scaleX: 1,
    }),
  });

  const ASSEMBLY_LAYOUT = Object.freeze({
    bucketLeft: Object.freeze({ anchorX: 0.27, anchorY: 0.82 }),
    bucketRight: Object.freeze({ anchorX: 0.73, anchorY: 0.82 }),
    yoke: Object.freeze({ anchorX: 0.5, anchorY: 0.38 }),
    dragonLeft: Object.freeze({ anchorX: 0.285, anchorY: 0.216 }),
    dragonRight: Object.freeze({ anchorX: 0.715, anchorY: 0.216 }),
    goldBead: Object.freeze({ anchorX: 0.5, anchorY: 0.12 }),
    springLeft: Object.freeze({ anchorX: 0.251, anchorY: 0.098 }),
    springRight: Object.freeze({ anchorX: 0.755, anchorY: 0.098 }),
    pompomLeft: Object.freeze({ anchorX: 0.255, anchorY: 0.073 }),
    pompomRight: Object.freeze({ anchorX: 0.745, anchorY: 0.073 }),
    signLeft: Object.freeze({ anchorX: 0.27, anchorY: 0.59 }),
    signRight: Object.freeze({ anchorX: 0.73, anchorY: 0.59 }),
  });

  const PARTS = Object.freeze(
    Object.fromEntries(
      Object.entries(PART_META).map(([id, meta]) => {
        const config = PART_CONFIG[id];
        const layout = ASSEMBLY_LAYOUT[id];
        const target = Object.freeze({
          x:
            (layout.anchorX - config.width * config.anchorX) *
            DESIGN.width,
          y:
            (layout.anchorY - config.height * config.anchorY) *
            DESIGN.height,
          width: config.width * DESIGN.width,
          height: config.height * DESIGN.height,
          rotation: config.rotation,
          scaleX: config.scaleX,
          radius: 180,
        });
        return [
          id,
          Object.freeze({
            id,
            ...meta,
            imageSrc: config.imageSrc,
            config,
            defaultPosition: layout,
            target,
          }),
        ];
      }),
    ),
  );
  const PART_ORDER = Object.freeze(Object.keys(PARTS));
  const BASELINE_Y = 0.82;
  const BASELINE_SNAP_THRESHOLD = 0.09;
  const stageParts = (stageNumber) =>
    STAGES[stageNumber - 1]?.parts.map((id) => PARTS[id]) || [];
  const allStagePartsInstalled = (stageNumber, completed) =>
    stageParts(stageNumber).every((part) => completed.has(part.id));

  const completedParts = new Set();
  const completedStages = new Set();
  const partPositions = new Map();
  const timers = new Set();
  const abortController = new AbortController();
  const signal = abortController.signal;
  let activeStage = 1;
  let drag = null;
  let suppressCardClickUntil = 0;
  let tickContext = null;
  let placementSoundCount = 0;
  let finaleState = "idle";
  let finalePlayCount = 0;
  let finaleTimer = null;
  let finalePageObserver = null;
  let destroyed = false;

  function setTimer(callback, delay) {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
    return timer;
  }

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
  }

  function assetUrl(key) {
    return `${ASSET_ROOT}${ASSETS[key] || ""}`;
  }

  function markAssetFailure(image) {
    image.classList.add("is-missing");
    image.closest(".assembly-part-card")?.classList.add("is-media-missing");
    if (fallback) {
      const label = ASSET_LABELS[image.dataset.assemblyAsset] || "素材";
      fallback.textContent = `${label}缺失 · 使用名称占位`;
      fallback.hidden = false;
    }
  }

  function bindAsset(image, key) {
    const assetPath = ASSETS[key];
    if (!assetPath) {
      markAssetFailure(image);
      return;
    }
    image.dataset.assemblyAsset = key;
    image.addEventListener("error", () => {
      const fallbackPath = FALLBACK_ASSETS[key];
      if (fallbackPath && image.dataset.assetFallback !== "true") {
        image.dataset.assetFallback = "true";
        image.src = `${ASSET_ROOT}${fallbackPath}`;
        return;
      }
      markAssetFailure(image);
    });
    image.src = assetUrl(key);
  }

  function partLayer(id) {
    const part = PARTS[id];
    return part ? component.querySelector(part.layerSelector) : null;
  }

  const PART_Z = Object.freeze({
    yoke: 2,
    bucketLeft: 4,
    bucketRight: 4,
    chainLeft: 5,
    chainRight: 5,
    dragonLeft: 6,
    dragonRight: 6,
    goldBead: 7,
    pompomLeft: 8,
    pompomRight: 8,
    signLeft: 9,
    signRight: 9,
  });

  function targetPosition(part) {
    return {
      x: part.target.x / DESIGN.width,
      y: part.target.y / DESIGN.height,
      width: part.target.width / DESIGN.width,
      height: part.target.height / DESIGN.height,
    };
  }

  function setPartPosition(id, position) {
    const part = PARTS[id];
    const layer = partLayer(id);
    if (!part || !layer) return false;
    const next = {
      x: Math.max(0, Math.min(1 - position.width, position.x)),
      y: Math.max(0, Math.min(1 - position.height, position.y)),
      width: position.width,
      height: position.height,
    };
    partPositions.set(id, next);
    layer.dataset.partId = id;
    layer.dataset.partStage = String(part.stage);
    layer.dataset.positionX = next.x.toFixed(6);
    layer.dataset.positionY = next.y.toFixed(6);
    layer.style.left = `${next.x * 100}%`;
    layer.style.top = `${next.y * 100}%`;
    layer.style.width = `${next.width * 100}%`;
    layer.style.height = `${next.height * 100}%`;
    layer.style.zIndex = String(PART_Z[id] || 1);
    layer.style.setProperty("--part-rotation", `${part.target.rotation}deg`);
    layer.style.setProperty("--part-scale-x", String(part.target.scaleX));
    layer.style.right = "auto";
    return true;
  }

  function applyPartCoordinates() {
    PART_ORDER.forEach((id) => {
      const part = PARTS[id];
      setPartPosition(id, targetPosition(part));
    });
  }

  function renderPartCards() {
    partsPanel.replaceChildren();
    PART_ORDER.forEach((id) => {
      const part = PARTS[id];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "assembly-part-card";
      button.dataset.dragPart = id;
      button.dataset.partStep = String(part.stage);
      button.setAttribute(
        "aria-label",
        `第${part.stage}步，${part.label}。可拖到画布或按回车自动安装。`,
      );

      const image = document.createElement("img");
      image.alt = part.alt;
      image.draggable = false;
      image.dataset.assemblyAsset = part.assetKey;

      const caption = document.createElement("span");
      caption.className = "assembly-part-card__caption";
      caption.textContent = part.label;

      const detail = document.createElement("small");
      detail.className = "assembly-part-card__detail";
      detail.textContent = part.sublabel;

      button.append(image, caption, detail);
      partsPanel.append(button);
      bindAsset(image, part.assetKey);
    });
  }

  function completedStageCount() {
    let count = 0;
    for (const stageConfig of STAGES) {
      if (allStagePartsInstalled(stageConfig.number, completedParts)) count += 1;
      else break;
    }
    return count;
  }

  function currentStageConfig() {
    return STAGES[activeStage - 1] || null;
  }

  function updateProgress() {
    const stageCount = completedStageCount();
    component.dataset.assemblyStep = String(stageCount);
    component.dataset.activeStage = String(activeStage);
    component.dataset.completedParts = String(completedParts.size);
    component.classList.toggle("is-complete", stageCount === STAGES.length);
    component.style.setProperty(
      "--assembly-progress",
      `${(stageCount / STAGES.length) * 100}%`,
    );
    if (progressBar) {
      progressBar.setAttribute("aria-valuenow", String(stageCount));
      progressBar.setAttribute(
        "aria-valuetext",
        `已完成 ${stageCount} 个阶段，共 5 个阶段；已安装 ${completedParts.size} 个零件`,
      );
    }
    if (progressText) progressText.textContent = `${stageCount} / 5`;
  }

  function updatePartCards() {
    partsPanel
      .querySelectorAll("[data-drag-part]")
      .forEach((button) => {
        const part = PARTS[button.dataset.dragPart];
        const installed = completedParts.has(part.id);
        const current = part.stage === activeStage && !installed;
        const detail = button.querySelector(".assembly-part-card__detail");
        button.disabled = false;
        button.classList.toggle("is-installed", installed);
        button.classList.toggle("is-current", current);
        button.classList.remove("is-locked");
        button.setAttribute("aria-pressed", String(installed));
        button.setAttribute("aria-disabled", "false");
        if (detail) {
          detail.textContent = installed ? "已放置 · 可调整" : part.sublabel;
        }
        if (installed) {
          button.setAttribute(
            "aria-label",
            `${part.label}，已放置，可拖动调整位置`,
          );
        } else {
          button.setAttribute(
            "aria-label",
            `${part.label}，可拖到左侧自由摆放，或按回车放到参考位置`,
          );
        }
      });
  }

  function updateLayerStates() {
    PART_ORDER.forEach((id) => {
      const part = PARTS[id];
      const layer = partLayer(id);
      if (!layer) return;
      layer.classList.toggle("is-installed", completedParts.has(id));
      layer.classList.toggle(
        "is-current-part",
        part.stage === activeStage && !completedParts.has(id),
      );
      layer.classList.toggle(
        "is-waiting-stage",
        part.stage > activeStage,
      );
    });
  }

  function updateCopy() {
    const config = currentStageConfig();
    const stageCount = completedStageCount();
    if (!config) {
      if (stepTitle) stepTitle.textContent = "招牌落定，一担齐了";
      if (stepBody) {
        stepBody.textContent =
          "双桶平衡，二龙相望，金珠居中。接下来才是俞六挑着它去走八字。";
      }
      return;
    }
    const installed = config.parts.filter((id) =>
      completedParts.has(id),
    ).length;
    const total = config.parts.length;
    if (stepLabel) {
      stepLabel.textContent = `当前步骤：${config.short} · ${installed} / ${total}`;
    }
    if (stepTitle) stepTitle.textContent = config.title;
    if (stepBody) {
      stepBody.textContent = `${config.hint}${
        installed ? ` 本阶段已完成 ${installed} / ${total}。` : ""
      }`;
    }
    if (stageNumber) {
      stageNumber.textContent =
        installed > 0
          ? ["", "壹", "贰", "叁", "肆", "伍"][config.number]
          : stageCount === 0
            ? "未装"
            : ["", "壹", "贰", "叁", "肆", "伍"][stageCount];
    }
    if (stageCaption) {
      const latestPart = [...completedParts]
        .reverse()
        .find((id) => PARTS[id]?.stage === config.number);
      stageCaption.textContent = latestPart
        ? `${PARTS[latestPart].label}已落位，${
            installed === total
              ? config.complete
              : `还需安装 ${total - installed} 件。`
          }`
        : config.hint;
    }
    if (advanceButton && !advanceButton.hidden) {
      advanceButton.firstChild.textContent = "自动装好本步 ";
    }
  }

  function render() {
    updateProgress();
    updateLayerStates();
    updatePartCards();
    updateCopy();
  }

  function playPlacementTick(isStageComplete = false) {
    if (soundToggle?.getAttribute("aria-pressed") !== "true") return;
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      tickContext ||= new AudioContextClass();
      void tickContext.resume();
      const now = tickContext.currentTime;
      const oscillator = tickContext.createOscillator();
      const gain = tickContext.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(
        isStageComplete ? 220 : 310,
        now,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        isStageComplete ? 165 : 245,
        now + 0.08,
      );
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      oscillator.connect(gain).connect(tickContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.12);
      placementSoundCount += 1;
    } catch {
      // The visual placement remains complete when Web Audio is unavailable.
    }
  }

  function stageFeedback(stageNumberValue) {
    component.classList.remove(
      "stage-feedback-1",
      "stage-feedback-2",
      "stage-feedback-3",
      "stage-feedback-4",
      "stage-feedback-5",
    );
    if (!motionOrMedia()) return;
    void component.offsetWidth;
    component.classList.add(`stage-feedback-${stageNumberValue}`);
    setTimer(
      () => component.classList.remove(`stage-feedback-${stageNumberValue}`),
      760,
    );
  }

  function motionOrMedia() {
    return (
      !document.body.classList.contains("motion-off") &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function dispatchFinaleEvent(type) {
    component.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail: {
          state: finaleState,
          playCount: finalePlayCount,
          completedParts: completedParts.size,
        },
      }),
    );
  }

  function revealFinale({ announce = true } = {}) {
    if (finaleState !== "playing") return;
    if (finaleTimer !== null) {
      window.clearTimeout(finaleTimer);
      timers.delete(finaleTimer);
      finaleTimer = null;
    }
    finaleState = "complete";
    component.dataset.finaleState = finaleState;
    component.classList.remove("is-finalizing");
    component.classList.add("is-finale-complete");
    if (completionPanel) {
      completionPanel.hidden = false;
      completionPanel.setAttribute("aria-hidden", "false");
    }
    if (announce) {
      bridge?.announce?.("二龙戏珠挑担已经完成，可以继续阅读对应原文");
    }
    dispatchFinaleEvent("dragonassembly:finale-reveal");
  }

  function beginFinale() {
    if (
      finaleState !== "idle" ||
      completedParts.size !== PART_ORDER.length ||
      completedStages.size !== STAGES.length
    ) {
      return false;
    }
    finaleState = "playing";
    finalePlayCount += 1;
    component.dataset.finaleState = finaleState;
    component.classList.remove("is-finale-complete");
    component.classList.add("is-finalizing");
    if (completionPanel) {
      completionPanel.hidden = true;
      completionPanel.setAttribute("aria-hidden", "true");
    }
    dispatchFinaleEvent("dragonassembly:finale-start");
    if (!motionOrMedia()) {
      revealFinale({ announce: false });
      bridge?.announce?.("二龙戏珠挑担已经完成，可以继续阅读对应原文");
    } else {
      finaleTimer = setTimer(() => revealFinale(), 2500);
    }
    return true;
  }

  function resetFinale() {
    if (finaleTimer !== null) {
      window.clearTimeout(finaleTimer);
      timers.delete(finaleTimer);
      finaleTimer = null;
    }
    finaleState = "idle";
    component.dataset.finaleState = finaleState;
    component.classList.remove("is-finalizing", "is-finale-complete");
    if (completionPanel) {
      completionPanel.hidden = true;
      completionPanel.setAttribute("aria-hidden", "true");
    }
  }

  function syncStageCompletion({ announce = true } = {}) {
    const previous = new Set(completedStages);
    completedStages.clear();
    STAGES.forEach((stageConfig) => {
      if (allStagePartsInstalled(stageConfig.number, completedParts)) {
        completedStages.add(stageConfig.number);
      }
    });
    const newlyCompleted = STAGES.map((stageConfig) => stageConfig.number)
      .filter(
        (number) =>
          completedStages.has(number) && !previous.has(number),
      );
    activeStage =
      STAGES.find(
        (stageConfig) => !completedStages.has(stageConfig.number),
      )?.number || 6;
    newlyCompleted.forEach((stageNumberValue) => {
      stageFeedback(stageNumberValue);
    });
    if (newlyCompleted.length) {
      playPlacementTick(true);
    }
    bridge?.render(completedStageCount(), {
      announce: announce && newlyCompleted.length > 0,
    });
    render();
    if (
      completedStages.size === STAGES.length &&
      completedParts.size === PART_ORDER.length
    ) {
      beginFinale();
    }
    return newlyCompleted;
  }

  function placePart(id, position, options = {}) {
    const part = PARTS[id];
    if (destroyed || !part || !position) return false;
    const wasInstalled = completedParts.has(id);
    setPartPosition(id, position);
    if (wasInstalled) {
      render();
      if (options.announce !== false) {
        bridge?.announce?.(`${part.label}位置已调整`);
      }
      return true;
    }
    completedParts.add(id);
    const layer = partLayer(id);
    if (layer) {
      layer.classList.add("is-installed", "is-just-installed");
      setTimer(() => layer.classList.remove("is-just-installed"), 680);
    }
    playPlacementTick(false);
    syncStageCompletion({ announce: true });
    if (options.announce !== false) {
      bridge?.announce?.(
        `${part.label}${id.startsWith("bucket") ? "已放稳" : "已放置"}${
          allStagePartsInstalled(part.stage, completedParts)
            ? "，本阶段完成"
            : ""
        }`,
      );
    }
    return true;
  }

  function installPart(id, options = {}) {
    const part = PARTS[id];
    if (!part) return false;
    if (completedParts.has(id) && !options.position) return true;
    return placePart(id, options.position || targetPosition(part), options);
  }

  function focusStage(requestedStep) {
    if (requestedStep <= completedStageCount()) {
      bridge?.announce?.(
        requestedStep === activeStage
          ? `${STAGES[requestedStep - 1].title}正在组装`
          : `${STAGES[requestedStep - 1].title}已经完成`,
      );
    } else if (requestedStep > activeStage) {
      bridge?.announce?.(
        `先把第${activeStage}阶段的全部零件装齐，不能跳过`,
      );
    }
    const first = partsPanel.querySelector(
      `[data-drag-part][data-part-step="${activeStage}"]:not(:disabled)`,
    );
    first?.focus({ preventScroll: true });
  }

  function autoInstallCurrentStage() {
    const pending = stageParts(activeStage).filter(
      (part) => !completedParts.has(part.id),
    );
    pending.forEach((part, index) => {
      setTimer(() => installPart(part.id), index * 360);
    });
    if (pending.length) {
      bridge?.announce?.(
        `正在依次装好第${activeStage}阶段的 ${pending.length} 个零件`,
      );
    }
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function positionFromPointer(part, clientX, clientY, grabX, grabY) {
    const rect = canvas.getBoundingClientRect();
    const width = part.target.width / DESIGN.width;
    const height = part.target.height / DESIGN.height;
    return {
      x: clamp((clientX - rect.left) / rect.width - grabX, 0, 1 - width),
      y: clamp((clientY - rect.top) / rect.height - grabY, 0, 1 - height),
      width,
      height,
    };
  }

  function pointerInsideCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function bucketNearBaseline(part, position) {
    return (
      part.id.startsWith("bucket") &&
      Math.abs(position.y + position.height - BASELINE_Y) <=
        BASELINE_SNAP_THRESHOLD
    );
  }

  function createDragToken(part, source, event) {
    const rect = canvas.getBoundingClientRect();
    const width = (part.target.width / DESIGN.width) * rect.width;
    const height = (part.target.height / DESIGN.height) * rect.height;
    let tokenWidth = width;
    let tokenHeight = height;
    let offsetX = width / 2;
    let offsetY = height / 2;
    if (source instanceof HTMLElement && source.classList.contains("dragon-assembly__layer")) {
      const sourceRect = source.getBoundingClientRect();
      tokenWidth = sourceRect.width;
      tokenHeight = sourceRect.height;
      offsetX = event.clientX - sourceRect.left;
      offsetY = event.clientY - sourceRect.top;
    }
    const token = document.createElement("img");
    token.className = "dragon-drag-token";
    token.src = assetUrl(part.assetKey);
    token.alt = "";
    token.draggable = false;
    token.style.width = `${tokenWidth}px`;
    token.style.height = `${tokenHeight}px`;
    token.style.left = `${event.clientX - offsetX}px`;
    token.style.top = `${event.clientY - offsetY}px`;
    token.style.setProperty(
      "--drag-rotation",
      `${part.target.rotation}deg`,
    );
    document.body.append(token);
    return {
      token,
      grabX: (offsetX / tokenWidth) * (part.target.width / DESIGN.width),
      grabY: (offsetY / tokenHeight) * (part.target.height / DESIGN.height),
    };
  }

  function setDragPrompt(part, snapped = false, inside = false) {
    if (!stepBody) return;
    if (part.id.startsWith("bucket")) {
      stepBody.textContent = snapped
        ? `${part.label}已靠近地面基准线，松手后桶底会对齐。`
        : inside
          ? `正在移动${part.label}，把桶底靠近赭红色虚线。`
          : `把${part.label}从零件栏拖到左侧院落地面。`;
      return;
    }
    stepBody.textContent = inside
      ? `正在自由摆放${part.label}，松手即可停在当前位置。`
      : `把${part.label}拖入左侧画布，可自由摆放、随时调整。`;
  }

  function startDrag(event, source) {
    const isLayer =
      source instanceof HTMLElement &&
      source.classList.contains("dragon-assembly__layer");
    const partId = isLayer ? source.dataset.partId : source.dataset.dragPart;
    const part = PARTS[partId];
    if (
      !part ||
      source.disabled ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      component.classList.contains("is-finalizing")
    ) {
      return;
    }
    if (isLayer && !completedParts.has(partId)) return;
    event.preventDefault();
    const { token, grabX, grabY } = createDragToken(part, source, event);
    const layer = partLayer(partId);
    const previousPosition = partPositions.get(partId);
    const position = positionFromPointer(
      part,
      event.clientX,
      event.clientY,
      grabX,
      grabY,
    );
    drag = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      partId,
      part,
      card: isLayer ? null : source,
      sourceLayer: isLayer ? source : null,
      token,
      layer,
      grabX,
      grabY,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      position,
      previousPosition: previousPosition ? { ...previousPosition } : null,
      moved: false,
      snapped: false,
      inside: false,
    };
    drag.card?.classList.add("is-dragging");
    drag.sourceLayer?.classList.add("is-being-dragged");
    component.classList.add("is-part-dragging");
    source.setPointerCapture?.(event.pointerId);
    setDragPrompt(part);
  }

  function moveDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    if (
      !drag.moved &&
      Math.hypot(
        event.clientX - drag.startX,
        event.clientY - drag.startY,
      ) > 4
    ) {
      drag.moved = true;
    }
    drag.token.style.left = `${event.clientX - drag.grabX * rect.width}px`;
    drag.token.style.top = `${event.clientY - drag.grabY * rect.height}px`;
    drag.position = positionFromPointer(
      drag.part,
      event.clientX,
      event.clientY,
      drag.grabX,
      drag.grabY,
    );
    drag.inside = pointerInsideCanvas(event.clientX, event.clientY);
    drag.snapped = drag.inside && bucketNearBaseline(drag.part, drag.position);
    drag.token.classList.toggle("is-snapped", drag.snapped);
    baseline?.classList.toggle("is-snap-ready", drag.snapped);
    setDragPrompt(drag.part, drag.snapped, drag.inside);
  }

  function cleanupDragVisuals() {
    if (!drag) return;
    drag.card?.classList.remove("is-dragging");
    drag.sourceLayer?.classList.remove("is-being-dragged");
    drag.layer?.classList.remove("is-being-dragged");
    drag.token.remove();
    baseline?.classList.remove("is-snap-ready");
    component.classList.remove("is-part-dragging", "is-returning");
    drag = null;
  }

  function returnDragToSource() {
    if (!drag) return;
    const currentDrag = drag;
    if (currentDrag.previousPosition) {
      setPartPosition(currentDrag.partId, currentDrag.previousPosition);
    }
    currentDrag.card?.classList.remove("is-dragging");
    currentDrag.sourceLayer?.classList.remove("is-being-dragged");
    currentDrag.layer?.classList.remove("is-being-dragged");
    if (currentDrag.card) {
      const rect = currentDrag.card.getBoundingClientRect();
      component.classList.add("is-returning");
      currentDrag.token.style.left = `${rect.left}px`;
      currentDrag.token.style.top = `${rect.top}px`;
      currentDrag.token.style.width = `${rect.width}px`;
      currentDrag.token.style.height = `${rect.height}px`;
      currentDrag.token.style.opacity = "0";
    } else {
      currentDrag.token.remove();
    }
    if (stepBody) {
      stepBody.textContent = currentDrag.part.id.startsWith("bucket")
        ? `${currentDrag.part.label}没有靠近地面基准线，已恢复原位置。`
        : `${currentDrag.part.label}没有落在画布内，已恢复原位置。`;
    }
    bridge?.announce?.(`${currentDrag.part.label}已恢复，可重新拖动调整`);
    const token = currentDrag.token;
    setTimer(
      () => {
        token.remove();
        component.classList.remove("is-returning");
      },
      motionOrMedia() ? 180 : 0,
    );
    drag = null;
  }

  function endDrag(event, cancelled = false) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const currentDrag = drag;
    const source = currentDrag.sourceLayer || currentDrag.card;
    const pointerUpHasCoordinates =
      Number.isFinite(event.clientX) &&
      Number.isFinite(event.clientY) &&
      (event.clientX !== 0 ||
        event.clientY !== 0 ||
        (currentDrag.lastX === 0 && currentDrag.lastY === 0));
    if (!cancelled && pointerUpHasCoordinates) moveDrag(event);
    if (source?.hasPointerCapture?.(event.pointerId)) {
      source.releasePointerCapture(event.pointerId);
    }
    if (!currentDrag.moved && !cancelled) {
      const alreadyInstalled = completedParts.has(currentDrag.partId);
      cleanupDragVisuals();
      suppressCardClickUntil = performance.now() + 420;
      if (!alreadyInstalled) installPart(currentDrag.partId);
      return;
    }
    suppressCardClickUntil = performance.now() + 420;
    const valid =
      !cancelled &&
      currentDrag.inside &&
      (!currentDrag.part.id.startsWith("bucket") || currentDrag.snapped);
    if (valid) {
      const position = currentDrag.part.id.startsWith("bucket")
        ? {
            ...currentDrag.position,
            y: BASELINE_Y - currentDrag.position.height,
          }
        : currentDrag.position;
      currentDrag.token.classList.add("is-snapping");
      cleanupDragVisuals();
      placePart(currentDrag.partId, position);
    } else {
      returnDragToSource();
    }
  }

  function onCardPointerDown(event) {
    const card = event.target.closest("[data-drag-part]");
    if (!card) return;
    startDrag(event, card);
  }

  function onCanvasPointerDown(event) {
    const layer = event.target.closest(
      ".dragon-assembly__layer.is-installed",
    );
    if (!layer) return;
    startDrag(event, layer);
  }

  function onCardClick(event) {
    const card = event.target.closest("[data-drag-part]");
    if (!card) return;
    if (performance.now() < suppressCardClickUntil) {
      event.preventDefault();
      return;
    }
    installPart(card.dataset.dragPart);
  }

  function onCardKeyDown(event) {
    if (!["Enter", " "].includes(event.key)) return;
    const card = event.target.closest("[data-drag-part]");
    if (!card || card.disabled) return;
    event.preventDefault();
    installPart(card.dataset.dragPart);
  }

  function reset(options = {}) {
    clearTimers();
    cleanupDragVisuals();
    resetFinale();
    completedParts.clear();
    completedStages.clear();
    partPositions.clear();
    activeStage = 1;
    component.classList.remove(
      "stage-feedback-1",
      "stage-feedback-2",
      "stage-feedback-3",
      "stage-feedback-4",
      "stage-feedback-5",
      "is-complete",
    );
    component.querySelectorAll(".is-just-installed").forEach((element) => {
      element.classList.remove("is-just-installed");
    });
    component
      .querySelectorAll(".dragon-assembly__layer.is-being-dragged")
      .forEach((layer) => layer.classList.remove("is-being-dragged"));
    baseline?.classList.remove("is-snap-ready");
    applyPartCoordinates();
    bridge?.render(0);
    render();
    if (options.focus) {
      partsPanel
        .querySelector('[data-drag-part][data-part-step="1"]:not(:disabled)')
        ?.focus({ preventScroll: true });
    }
    if (options.announce) {
      bridge?.announce?.("挑担已经拆开，可以重新装配");
    }
  }

  function getSnapshot() {
    return {
      activeStage,
      completedStages: [...completedStages],
      completedParts: [...completedParts],
      totalParts: PART_ORDER.length,
      stageCounts: Object.fromEntries(
        STAGES.map((definition) => [
          definition.number,
          {
            installed: definition.parts.filter((id) =>
              completedParts.has(id),
            ).length,
            total: definition.parts.length,
          },
        ]),
      ),
      dragging: drag?.partId || null,
      snapped: Boolean(drag?.snapped),
      positions: Object.fromEntries(
        [...partPositions].map(([id, position]) => [id, { ...position }]),
      ),
      baselineY: BASELINE_Y,
      placementSoundCount,
      finaleState,
      finalePlayCount,
    };
  }

  function configureStaticAssets() {
    component.querySelectorAll("[data-assembly-asset]").forEach((image) => {
      const key = image.dataset.assemblyAsset;
      if (image.closest(".assembly-part-card")) return;
      bindAsset(image, key);
    });
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    abortController.abort();
    clearTimers();
    cleanupDragVisuals();
    if (tickContext && tickContext.state !== "closed") {
      void tickContext.close();
    }
    finalePageObserver?.disconnect();
    finaleState = "idle";
    component.dataset.finaleState = finaleState;
    component.classList.remove("is-finalizing", "is-finale-complete");
    if (completionPanel) completionPanel.hidden = true;
  }

  component.dataset.finaleState = finaleState;
  applyPartCoordinates();
  renderPartCards();
  configureStaticAssets();
  partsPanel.addEventListener("pointerdown", onCardPointerDown, { signal });
  canvas.addEventListener("pointerdown", onCanvasPointerDown, { signal });
  window.addEventListener("pointermove", moveDrag, {
    signal,
    passive: false,
  });
  window.addEventListener(
    "pointerup",
    (event) => endDrag(event),
    { signal, passive: false },
  );
  window.addEventListener(
    "pointercancel",
    (event) => endDrag(event, true),
    { signal, passive: false },
  );
  component.addEventListener(
    "dragstart",
    (event) => event.preventDefault(),
    { signal },
  );
  partsPanel.addEventListener("click", onCardClick, { signal });
  partsPanel.addEventListener("keydown", onCardKeyDown, { signal });
  window.addEventListener("pagehide", destroy, { once: true, signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden && finaleState === "playing") {
        revealFinale({ announce: false });
      }
    },
    { signal },
  );
  finalePageObserver = new MutationObserver(() => {
    if (finaleState !== "playing") return;
    if (
      document.body.dataset.sishiPage !== "chapter3" ||
      document.body.classList.contains("motion-off")
    ) {
      revealFinale({ announce: false });
    }
  });
  finalePageObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class", "data-sishi-page"],
  });
  render();

  window.dragonAssemblyComponent = Object.freeze({
    assetRoot: ASSET_ROOT,
    assets: ASSETS,
    fallbackAssets: FALLBACK_ASSETS,
    manifest: `${ASSET_ROOT}manifest.json`,
    audioAssets: AUDIO_ASSETS,
    config: Object.freeze({
      coordinateSystem: DESIGN,
      stages: STAGES,
      parts: PARTS,
      partConfigs: PART_CONFIG,
      assemblyLayout: ASSEMBLY_LAYOUT,
    }),
    getStep: () => completedStageCount(),
    getSnapshot,
    installPart,
    autoInstallCurrentStage,
    focusStage,
    reset,
    destroy,
  });
})();
