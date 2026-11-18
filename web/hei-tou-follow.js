(() => {
  "use strict";

  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  // Calibrated against the road's vanishing point in distant-street-alt.png.
  const HORIZON_Y = 646;
  const FOCAL_LENGTH = 1015;
  const CAMERA_HEIGHT = 1.2;
  const CAMERA_INTRO_HEIGHT = 2.02;
  const NEAR_CLIP = 1.45;
  const ROAD_HALF_WIDTH = 9.2;
  const SHANG_HEIGHT = 1.72;
  const SHANG_VISIBLE_HEIGHT = 0.973;
  const SHANG_VISIBLE_BOTTOM = 0.982;
  const END_Z = 56.5;
  const GATE_Z = 65.5;
  const SHANG_GATE_Z = 63.25;
  const INITIAL_SHANG_Z = 8.4;
  const DESIRED_DISTANCE = 8.2;
  // The previous route took about 33.1s in-browser; 2.9x keeps its
  // distance-based pacing while bringing a continuous hold to about 12s.
  const FOLLOW_DURATION_MS = 12000;
  const FOLLOW_SPEED_SCALE = 2.9;
  const followSpeed = (baseSpeed) => baseSpeed * FOLLOW_SPEED_SCALE;
  const PLAYER_MAX_SPEED = followSpeed(2.25);
  const PLAYER_ACCELERATION = followSpeed(3.1);
  const PLAYER_DECELERATION = followSpeed(4.4);
  const ROAD_SEGMENT_LENGTH = 3.4;
  const ROAD_SEGMENT_COUNT = 22;
  const NARRATION_LABEL = "叙事引导 · 非原文";

  const ASSETS = Object.freeze({
    sky: "images/hei-tou/follow/sky.png",
    rooftops: "images/hei-tou/follow/rooftops.png",
    distant: "images/hei-tou/follow/distant-street-alt.png",
    road: "images/hei-tou/follow/road.png",
    shang: "images/hei-tou/follow/shang-basket-back.png",
    shangAlt: "images/hei-tou/follow/shang-back-alt.png",
  });

  // Replace any entry with a verified recording when it becomes available.
  const AUDIO_MANIFEST = Object.freeze({
    street: null,
    vendor: null,
    heiTouSteps: null,
    shangSteps: null,
    cloth: null,
  });

  // The supplied street panorama already contains a coherent set of shop
  // facades. Keep it as one painted layer instead of compositing separate
  // storefront billboards whose vanishing directions do not match.
  const WORLD_OBJECTS = Object.freeze([]);

  const NARRATION_NODES = Object.freeze([
    { z: 5.2, text: "起初，它只敢隔着这么远。", duration: 3800 },
    { z: 16, text: "他走得不快，像是知道身后有脚步。", duration: 4000 },
    { z: 29, text: "黑头渐渐跟近了一点。", duration: 3600 },
    { z: 41, text: "街声落到身后，前面的院门慢慢近了。", duration: 4000 },
    { z: 50.2, text: "商大爷放慢脚步，黑头也收住了步子。", duration: 4200 },
  ]);

  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const elements = {};
  const projectedObjects = [];
  const roadTiles = [];
  const preloadedImages = new Map();

  const state = {
    active: false,
    paused: false,
    ready: false,
    holding: false,
    completed: false,
    transitionDispatched: false,
    introElapsed: 0,
    arrivalElapsed: 0,
    playerZ: 0,
    shangZ: INITIAL_SHANG_Z,
    cameraX: 0,
    cameraHeight: CAMERA_INTRO_HEIGHT,
    speed: 0,
    shangSpeed: followSpeed(1.05),
    distance: INITIAL_SHANG_Z,
    action: "intro",
    narrationsShown: 0,
    narrationUntil: 0,
    warning: false,
    footstepPhase: 0,
    lastFrameAt: 0,
    fps: 60,
    debugVisible: false,
    anchorsVisible: false,
    vanishingVisible: false,
  };

  let abortController = null;
  let animationFrameId = 0;
  let resizeFrameId = 0;
  let debugRenderAt = 0;
  let audioContext = null;
  let audioMaster = null;
  let stepNoiseBuffer = null;
  let soundEnabled = false;
  let audioStopToken = 0;
  let shangFrame = 0;
  let shangFrameClock = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const easeOutCubic = (value) => 1 - (1 - value) ** 3;
  const easeInOutCubic = (value) =>
    value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
  const approach = (current, target, maxDelta) => {
    if (current < target) return Math.min(target, current + maxDelta);
    return Math.max(target, current - maxDelta);
  };

  function queryElements() {
    elements.root = document.querySelector("#heiTouFollow");
    elements.page = document.querySelector("#storyPageFollow");
    elements.canvas = document.querySelector("#followCanvas");
    elements.viewport = document.querySelector("#followViewport");
    elements.stage = document.querySelector("#followStage");
    elements.camera = document.querySelector("#followCamera");
    elements.sky = document.querySelector("#followSky");
    elements.distant = document.querySelector("#followDistant");
    elements.rooftops = document.querySelector("#followRooftops");
    elements.roadLayer = document.querySelector("#followRoadLayer");
    elements.worldLayer = document.querySelector("#followWorldLayer");
    elements.shang = document.querySelector("#followShang");
    elements.shangImage = document.querySelector("#followShangImage");
    elements.shangShadow = document.querySelector("#followShangShadow");
    elements.narration = document.querySelector("#followNarration");
    elements.narrationText = document.querySelector("#followNarrationText");
    elements.warning = document.querySelector("#followWarning");
    elements.status = document.querySelector("#followStatus");
    elements.progress = document.querySelector("#followProgress");
    elements.progressFill = document.querySelector("#followProgressFill");
    elements.holdButton = document.querySelector("#followHold");
    elements.intro = document.querySelector("#followIntro");
    elements.restartButton = document.querySelector("#followRestart");
    elements.skipButton = document.querySelector("#followSkip");
    elements.arrival = document.querySelector("#followArrival");
    elements.debugPanel = document.querySelector("#followDebugPanel");
    elements.debugPause = document.querySelector("#followDebugPause");
    elements.debugReset = document.querySelector("#followDebugReset");
    elements.debugSlider = document.querySelector("#followDebugSlider");
    elements.debugAnchors = document.querySelector("#followDebugAnchors");
    elements.debugVanishing = document.querySelector("#followDebugVanishing");
    elements.debugMetrics = document.querySelector("#followDebugMetrics");
    elements.vanishingPoint = document.querySelector("#followVanishingPoint");
    elements.roadAnchor = document.querySelector("#followRoadAnchor");
    elements.shangAnchor = document.querySelector("#followShangAnchor");
    elements.soundToggle = document.querySelector("#storySoundToggle");
  }

  function createRoadTiles() {
    if (!elements.roadLayer) return;
    for (let index = 0; index < ROAD_SEGMENT_COUNT; index += 1) {
      const tile = document.createElement("span");
      tile.className = "follow-road-tile";
      tile.setAttribute("aria-hidden", "true");
      tile.style.setProperty(
        "--tile-shade",
        String(0.3 + (index % 3) * 0.035),
      );
      elements.roadLayer.append(tile);
      roadTiles.push({ element: tile, worldIndex: 0 });
    }
  }

  function createWorldObject(specification) {
    const element = document.createElement("figure");
    element.className = `follow-world-object follow-world-object--${specification.kind}`;
    element.dataset.objectId = specification.id;
    element.setAttribute("aria-hidden", "true");
    element.style.setProperty("--base-aspect", String(specification.fallbackAspect));
    element.style.width = `${specification.fallbackAspect * 100}px`;
    element.style.height = "100px";

    if (specification.image) {
      const image = document.createElement("img");
      image.src = specification.image;
      image.alt = "";
      image.decoding = "async";
      image.draggable = false;
      image.addEventListener("load", () => {
        if (!image.naturalWidth || !image.naturalHeight) return;
        const aspect = image.naturalWidth / image.naturalHeight;
        specification.aspect = aspect;
        element.style.width = `${aspect * 100}px`;
        element.classList.add("is-asset-ready");
      });
      image.addEventListener("error", () => {
        specification.aspect = specification.fallbackAspect;
        element.dataset.assetFailed = "true";
      });
      element.append(image);
    } else if (specification.kind === "sign") {
      const panel = document.createElement("span");
      panel.className = "follow-sign-panel";
      panel.textContent = specification.text;
      element.append(panel);
    } else {
      const prop = document.createElement("span");
      prop.className = "follow-prop";
      element.append(prop);
    }

    elements.worldLayer.append(element);
    projectedObjects.push({
      ...specification,
      aspect: specification.fallbackAspect,
      element,
    });
  }

  function buildScene() {
    if (!elements.worldLayer || elements.worldLayer.dataset.built === "true") {
      return;
    }
    createRoadTiles();
    WORLD_OBJECTS.forEach(createWorldObject);
    elements.worldLayer.dataset.built = "true";
    elements.shangImage?.addEventListener("error", () => {
      elements.shang?.setAttribute("data-asset-failed", "true");
    });
  }

  function preloadImages() {
    Object.values(ASSETS).forEach((source) => {
      if (preloadedImages.has(source)) return;
      const image = new Image();
      image.decoding = "async";
      image.src = source;
      preloadedImages.set(source, image);
    });
  }

  function projectWorldPoint(worldX, worldZ, worldY = 0) {
    const depth = worldZ - state.playerZ;
    if (depth <= NEAR_CLIP || depth > 125) return null;
    return {
      depth,
      x:
        DESIGN_WIDTH / 2 +
        (FOCAL_LENGTH * (worldX - state.cameraX)) / depth,
      y:
        HORIZON_Y +
        (FOCAL_LENGTH * (state.cameraHeight - worldY)) / depth,
      scale: FOCAL_LENGTH / depth,
    };
  }

  function positionBillboard(object) {
    const depth = object.z - state.playerZ;
    const element = object.element;
    if (depth <= NEAR_CLIP || depth > 118) {
      element.hidden = true;
      return;
    }

    let worldX = object.x;
    if (object.drift) {
      worldX += Math.sin(state.playerZ * 0.18 + object.z) * object.drift;
    }
    const point = projectWorldPoint(worldX, object.z);
    const height = (FOCAL_LENGTH * object.height) / depth;
    const width = height * object.aspect;
    if (
      point.x + width / 2 < -90 ||
      point.x - width / 2 > DESIGN_WIDTH + 90 ||
      point.y < 120
    ) {
      element.hidden = true;
      return;
    }

    element.hidden = false;
    const baseScale = height / 100;
    element.style.transform = `translate3d(${point.x - width / 2}px, ${
      point.y - height * (object.footRatio || 1)
    }px, 0) scale(${baseScale})`;
    element.style.zIndex = String(9000 - Math.round(depth * 52));
    element.dataset.groundX = point.x.toFixed(2);
    element.dataset.groundY = point.y.toFixed(2);
    element.dataset.depth = depth.toFixed(2);
    element.style.setProperty(
      "--object-fog",
      String(clamp((depth - 34) / 80, 0, 0.45)),
    );
  }

  function positionShang() {
    const depth = state.shangZ - state.playerZ;
    if (!elements.shang || depth <= NEAR_CLIP || depth > 92) {
      if (elements.shang) elements.shang.hidden = true;
      return;
    }

    const point = projectWorldPoint(state.cameraX + 0.06, state.shangZ);
    const aspect = elements.shangImage?.naturalWidth
      ? elements.shangImage.naturalWidth / elements.shangImage.naturalHeight
      : 0.667;
    const visibleHeight = (FOCAL_LENGTH * SHANG_HEIGHT) / depth;
    const height = visibleHeight / SHANG_VISIBLE_HEIGHT;
    const width = height * aspect;
    const bob =
      state.speed > followSpeed(0.08)
        ? Math.sin(shangFrameClock * Math.PI) * Math.min(1.8, height * 0.004)
        : 0;

    elements.shang.hidden = false;
    elements.shang.style.width = `${aspect * 100}px`;
    elements.shang.style.height = "100px";
    elements.shang.style.transform = `translate3d(${point.x - width / 2}px, ${
      point.y - height * SHANG_VISIBLE_BOTTOM + bob
    }px, 0) scale(${height / 100})`;
    elements.shang.style.zIndex = String(9300 - Math.round(depth * 52));
    elements.shang.dataset.groundX = point.x.toFixed(2);
    elements.shang.dataset.groundY = point.y.toFixed(2);
    elements.shang.dataset.depth = depth.toFixed(2);
    elements.shang.dataset.walkFrame = String(shangFrame);
    elements.shang.dataset.action =
      state.completed || state.arrivalElapsed > 0
        ? "stop"
        : state.speed > followSpeed(0.08)
          ? "walk"
          : "wait";

    if (elements.shangShadow) {
      const shadowWidth = width * 0.58;
      const shadowHeight = Math.max(7, height * 0.075);
      elements.shangShadow.style.width = `${shadowWidth}px`;
      elements.shangShadow.style.height = `${shadowHeight}px`;
      elements.shangShadow.style.transform = `translate3d(${
        point.x - shadowWidth / 2
      }px, ${point.y - shadowHeight / 2}px, 0)`;
      elements.shangShadow.style.zIndex = String(
        9299 - Math.round(depth * 52),
      );
    }

    if (elements.shangAnchor) {
      elements.shangAnchor.style.left = `${point.x}px`;
      elements.shangAnchor.style.top = `${point.y}px`;
    }
  }

  function positionRoad() {
    const firstWorldIndex = Math.floor(state.playerZ / ROAD_SEGMENT_LENGTH) - 1;
    roadTiles.forEach((tile, index) => {
      const worldIndex = firstWorldIndex + index;
      tile.worldIndex = worldIndex;
      const worldNear = worldIndex * ROAD_SEGMENT_LENGTH;
      const worldFar = worldNear + ROAD_SEGMENT_LENGTH;
      const nearDepth = Math.max(NEAR_CLIP, worldNear - state.playerZ);
      const farDepth = Math.max(NEAR_CLIP + 0.05, worldFar - state.playerZ);
      const topY =
        HORIZON_Y + (FOCAL_LENGTH * state.cameraHeight) / farDepth;
      const bottomY =
        HORIZON_Y + (FOCAL_LENGTH * state.cameraHeight) / nearDepth;
      const topHalf = (ROAD_HALF_WIDTH * FOCAL_LENGTH) / farDepth;
      const topLeft = clamp((DESIGN_WIDTH / 2 - topHalf) / DESIGN_WIDTH, 0, 1);
      const topRight = clamp((DESIGN_WIDTH / 2 + topHalf) / DESIGN_WIDTH, 0, 1);
      const height = Math.max(1, bottomY - topY);
      tile.element.style.top = `${topY}px`;
      tile.element.style.height = `${height}px`;
      tile.element.style.clipPath = `polygon(${topLeft * 100}% 0, ${
        topRight * 100
      }% 0, 100% 100%, 0 100%)`;
      tile.element.hidden = bottomY < HORIZON_Y - 2;
    });
  }

  function resizeScene() {
    if (!elements.viewport || !elements.stage) return;
    const bounds = elements.viewport.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const fitScale = Math.min(
      bounds.width / DESIGN_WIDTH,
      bounds.height / DESIGN_HEIGHT,
    );
    const coverScale = Math.max(
      bounds.width / DESIGN_WIDTH,
      bounds.height / DESIGN_HEIGHT,
    );
    const scale =
      bounds.width / bounds.height < 0.9
        ? coverScale
        : fitScale;
    elements.stage.style.setProperty("--follow-stage-scale", String(scale));
    elements.root.dataset.viewportRatio =
      bounds.width / bounds.height < 0.9 ? "portrait" : "landscape";
  }

  function scheduleResize() {
    if (resizeFrameId) return;
    resizeFrameId = window.requestAnimationFrame(() => {
      resizeFrameId = 0;
      resizeScene();
      renderScene();
    });
  }

  function renderScene() {
    const bobEnabled = !reducedMotionQuery.matches;
    const journeyProgress = clamp(state.playerZ / END_Z, 0, 1);
    const bob = bobEnabled
      ? Math.sin(state.footstepPhase) *
        (state.speed > 0.04 ? 3.1 : 0)
      : 0;
    const sway = bobEnabled
      ? Math.sin(state.footstepPhase * 0.5) *
        (state.speed > 0.04 ? 0.9 : 0)
      : 0;
    elements.camera?.style.setProperty("--camera-bob", `${bob}px`);
    elements.camera?.style.setProperty("--camera-sway", `${sway}px`);

    const distantShift = lerp(3, -10, easeInOutCubic(journeyProgress));
    const distantZoom = 1.018 + journeyProgress * 0.034;
    elements.distant?.style.setProperty(
      "--distant-shift",
      `${distantShift}px`,
    );
    elements.distant?.style.setProperty(
      "--distant-zoom",
      String(distantZoom),
    );
    elements.rooftops?.style.setProperty(
      "--rooftop-shift",
      `${(state.playerZ % 44) * -0.35}px`,
    );

    positionRoad();
    projectedObjects.forEach(positionBillboard);
    positionShang();

    if (elements.progressFill) {
      elements.progressFill.style.transform = `scaleX(${clamp(
        state.playerZ / END_Z,
        0,
        1,
      )})`;
    }

    if (elements.roadAnchor) {
      const anchor = projectWorldPoint(0, state.playerZ + 4.2);
      elements.roadAnchor.style.left = `${anchor?.x ?? DESIGN_WIDTH / 2}px`;
      elements.roadAnchor.style.top = `${anchor?.y ?? DESIGN_HEIGHT}px`;
    }
  }

  function showNarration(text, duration = 3900) {
    if (!elements.narration || !elements.narrationText) return;
    elements.narrationText.textContent = text;
    elements.narration.classList.add("is-visible");
    state.narrationUntil = performance.now() + duration;
  }

  function hideNarration() {
    elements.narration?.classList.remove("is-visible");
    state.narrationUntil = 0;
  }

  function updateNarration(now) {
    if (state.narrationUntil && now >= state.narrationUntil) {
      hideNarration();
    }

    while (
      state.narrationsShown < NARRATION_NODES.length &&
      state.playerZ >= NARRATION_NODES[state.narrationsShown].z
    ) {
      const node = NARRATION_NODES[state.narrationsShown];
      showNarration(node.text, node.duration);
      state.narrationsShown += 1;
    }

    state.warning = state.distance > 10.15 && !state.completed;
    if (elements.warning) {
      elements.warning.classList.toggle("is-visible", state.warning);
    }
    elements.canvas?.classList.toggle("is-too-far", state.warning);
  }

  function setStatus(message) {
    if (elements.status) elements.status.textContent = message;
  }

  function setHolding(nextHolding) {
    if (!state.active || !state.ready || state.completed || state.paused) {
      state.holding = false;
      elements.canvas?.classList.remove("is-holding");
      return;
    }
    state.holding = Boolean(nextHolding);
    elements.canvas?.classList.toggle("is-holding", state.holding);
    if (state.holding) {
      elements.canvas?.classList.add("has-started");
      hideNarration();
      setStatus("黑头正在跟着商大爷向前走。");
      void ensureAudio();
    } else {
      setStatus("脚步正在慢下来。松开后会自然停住。");
    }
  }

  function updatePlayer(deltaTime) {
    const distance = state.shangZ - state.playerZ;
    const arrivalFactor = clamp((state.playerZ - 47) / (END_Z - 47), 0, 1);
    const speedCeiling =
      PLAYER_MAX_SPEED * lerp(1, 0.32, easeInOutCubic(arrivalFactor));
    const wantsToMove =
      state.holding && !state.completed && distance > 4.15 && !state.paused;
    const targetSpeed = wantsToMove ? speedCeiling : 0;
    const rate =
      targetSpeed > state.speed
        ? PLAYER_ACCELERATION
        : PLAYER_DECELERATION;
    state.speed = approach(state.speed, targetSpeed, rate * deltaTime);

    if (distance <= 4.15 && state.holding) {
      state.speed = Math.min(state.speed, followSpeed(0.18));
      elements.canvas?.classList.add("is-too-close");
      setStatus("太近了。留一点距离，让商大爷先走。");
    } else {
      elements.canvas?.classList.remove("is-too-close");
    }

    state.playerZ = clamp(
      state.playerZ + state.speed * deltaTime,
      0,
      state.completed ? END_Z + 0.8 : END_Z,
    );
    state.cameraX =
      Math.sin(state.playerZ * 0.23) * 0.055 +
      Math.sin(state.footstepPhase * 0.5) * 0.006;
    state.distance = state.shangZ - state.playerZ;

    if (
      wantsToMove &&
      !NARRATION_NODES.slice(0, Math.max(1, state.narrationsShown)).some(
        (node) => Math.abs(state.playerZ - node.z) < 3.2,
      )
    ) {
      setStatus("按住时，街道会随着黑头的脚步向前展开。");
    }

    if (state.playerZ >= END_Z - 0.015 && !state.completed) {
      beginArrival();
    }
  }

  function updateShang(deltaTime) {
    let targetSpeed = 0;
    if (!state.completed && state.arrivalElapsed === 0) {
      if (state.distance > 10.15) {
        targetSpeed = followSpeed(0.52);
      } else if (state.distance < DESIRED_DISTANCE - 0.8) {
        targetSpeed = followSpeed(1.7);
      } else if (
        state.holding ||
        (state.distance < DESIRED_DISTANCE + 1.4 &&
          state.speed > followSpeed(0.08))
      ) {
        targetSpeed = Math.min(
          followSpeed(2.08),
          Math.max(
            followSpeed(1.05),
            state.speed * 0.94 + followSpeed(0.32),
          ),
        );
      }
    }

    const desiredGapCap =
      state.distance > 11.4 ? PLAYER_MAX_SPEED : followSpeed(2.2);
    state.shangSpeed = approach(
      state.shangSpeed,
      targetSpeed,
      (targetSpeed > state.shangSpeed
        ? followSpeed(1.8)
        : followSpeed(2.5)) * deltaTime,
    );
    state.shangSpeed = Math.min(state.shangSpeed, desiredGapCap);
    state.shangZ = clamp(
      state.shangZ + state.shangSpeed * deltaTime,
      INITIAL_SHANG_Z,
      SHANG_GATE_Z,
    );
    state.distance = state.shangZ - state.playerZ;

    shangFrameClock +=
      deltaTime * Math.max(followSpeed(0.5), state.shangSpeed * 1.55);
    if (state.shangSpeed > followSpeed(0.08)) {
      shangFrame = Math.floor(shangFrameClock * 4) % 4;
    } else {
      shangFrame = 0;
    }
  }

  function updateIntro(deltaTime) {
    if (state.ready) return;
    state.introElapsed += deltaTime;
    const progress = clamp(state.introElapsed / 1.25, 0, 1);
    state.cameraHeight = lerp(
      CAMERA_INTRO_HEIGHT,
      CAMERA_HEIGHT,
      easeOutCubic(progress),
    );
    state.action = "intro";
    if (progress >= 1) {
      state.ready = true;
      state.cameraHeight = CAMERA_HEIGHT;
      state.action = "ready";
      elements.root.dataset.state = "ready";
      elements.intro?.classList.add("is-visible");
      setStatus("按住鼠标、空格键或触摸屏幕，跟着商大爷向前走。");
    }
  }

  function beginArrival() {
    if (state.completed) return;
    state.completed = true;
    state.holding = false;
    state.action = "arriving";
    state.arrivalElapsed = 0;
    elements.canvas?.classList.remove("is-holding", "is-too-far");
    elements.canvas?.classList.add("is-arriving");
    elements.root.dataset.state = "arriving";
    showNarration("商大爷停在院门前。门还没有开。", 3800);
    setStatus("目的地到了。等脚步和街声一起静下来。");
    fadeAudio();
  }

  function updateArrival(deltaTime) {
    if (!state.completed) return;
    state.arrivalElapsed += deltaTime;
    state.speed = approach(
      state.speed,
      0,
      followSpeed(5.6) * deltaTime,
    );
    state.shangSpeed = approach(
      state.shangSpeed,
      0,
      followSpeed(5.2) * deltaTime,
    );
    state.playerZ = Math.min(END_Z + 0.45, state.playerZ + state.speed * deltaTime);
    state.shangZ = Math.min(SHANG_GATE_Z, state.shangZ + state.shangSpeed * deltaTime);
    state.distance = state.shangZ - state.playerZ;

    const reduceMotion = reducedMotionQuery.matches;
    const washAt = reduceMotion ? 0.25 : 1.05;
    const completeAt = reduceMotion ? 0.72 : 2.38;
    if (state.arrivalElapsed >= washAt) {
      elements.root.classList.add("is-washing-to-courtyard");
      elements.arrival?.setAttribute("aria-hidden", "false");
    }
    if (state.arrivalElapsed >= completeAt) {
      dispatchCompletion("arrival");
    }
  }

  function dispatchCompletion(reason) {
    if (state.transitionDispatched) return;
    state.transitionDispatched = true;
    elements.root.dispatchEvent(
      new CustomEvent("heitou:follow-complete", {
        bubbles: true,
        detail: { reason },
      }),
    );
  }

  function updateFootsteps(deltaTime) {
    if (state.speed > followSpeed(0.08)) {
      const previousPhase = state.footstepPhase;
      state.footstepPhase += deltaTime * (2.15 + state.speed * 1.45) * Math.PI;
      if (
        Math.floor(previousPhase / (Math.PI * 0.8)) !==
        Math.floor(state.footstepPhase / (Math.PI * 0.8))
      ) {
        playSyntheticFootstep();
      }
    }
  }

  function getAudioContext() {
    if (audioContext) return audioContext;
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
    audioMaster = audioContext.createGain();
    audioMaster.gain.value = 0;
    audioMaster.connect(audioContext.destination);
    const sampleRate = audioContext.sampleRate;
    stepNoiseBuffer = audioContext.createBuffer(
      1,
      Math.max(1, Math.floor(sampleRate * 0.075)),
      sampleRate,
    );
    const channel = stepNoiseBuffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      const envelope = 1 - index / channel.length;
      channel[index] = (Math.random() * 2 - 1) * envelope;
    }
    return audioContext;
  }

  async function ensureAudio() {
    soundEnabled =
      elements.soundToggle?.getAttribute("aria-pressed") === "true";
    if (!soundEnabled) return;
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch (error) {
        return;
      }
    }
    audioMaster?.gain.setTargetAtTime(0.11, context.currentTime, 0.18);
  }

  function playSyntheticFootstep() {
    if (
      !soundEnabled ||
      !audioContext ||
      !audioMaster ||
      !stepNoiseBuffer ||
      !state.active ||
      state.paused
    ) {
      return;
    }
    const now = audioContext.currentTime;
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = stepNoiseBuffer;
    filter.type = "lowpass";
    filter.frequency.value = 460;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.13, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioMaster);
    source.start(now);
    source.stop(now + 0.08);
  }

  function fadeAudio() {
    if (!audioContext || !audioMaster) return;
    audioMaster.gain.setTargetAtTime(0, audioContext.currentTime, 0.32);
  }

  function stopAudio() {
    if (!audioContext) return;
    try {
      void audioContext.close();
    } catch (error) {
      // Closing an already-closed context is harmless.
    }
    audioContext = null;
    audioMaster = null;
    stepNoiseBuffer = null;
  }

  function updateDebug(now) {
    if (!state.debugVisible || now < debugRenderAt) return;
    debugRenderAt = now + 180;
    const metrics = [
      ["cameraZ", state.playerZ.toFixed(2)],
      ["playerZ", state.playerZ.toFixed(2)],
      ["shangZ", state.shangZ.toFixed(2)],
      ["distance", state.distance.toFixed(2)],
      ["speed", state.speed.toFixed(2)],
      ["state", state.action],
      ["FPS", String(Math.round(state.fps))],
    ];
    if (elements.debugMetrics) {
      elements.debugMetrics.replaceChildren(
        ...metrics.flatMap(([label, value]) => {
          const term = document.createElement("dt");
          const description = document.createElement("dd");
          term.textContent = label;
          description.textContent = value;
          return [term, description];
        }),
      );
    }
    if (elements.debugSlider) {
      elements.debugSlider.value = String(
        clamp((state.playerZ / END_Z) * 100, 0, 100),
      );
    }
  }

  function frame(now) {
    if (!state.active) return;
    const previous = state.lastFrameAt || now;
    const deltaTime = clamp((now - previous) / 1000, 0.001, 0.05);
    state.lastFrameAt = now;
    state.fps = lerp(state.fps, 1 / deltaTime, 0.08);

    if (!state.paused) {
      updateIntro(deltaTime);
      if (state.ready && !state.completed) {
        updatePlayer(deltaTime);
        updateShang(deltaTime);
        updateFootsteps(deltaTime);
        if (!state.holding) {
          state.speed = approach(state.speed, 0, PLAYER_DECELERATION * deltaTime);
        }
      }
      updateArrival(deltaTime);
      updateNarration(now);
      updateDebug(now);
    }

    state.action = state.completed
      ? state.arrivalElapsed >= 0.9
        ? "quiet"
        : "arriving"
      : !state.ready
        ? "intro"
        : state.paused
          ? "paused"
          : state.holding
            ? "walking"
            : state.speed > followSpeed(0.08)
              ? "slowing"
              : "waiting";
    renderScene();
    animationFrameId = window.requestAnimationFrame(frame);
  }

  function reset() {
    state.paused = false;
    state.ready = false;
    state.holding = false;
    state.completed = false;
    state.transitionDispatched = false;
    state.introElapsed = 0;
    state.arrivalElapsed = 0;
    state.playerZ = 0;
    state.shangZ = INITIAL_SHANG_Z;
    state.cameraX = 0;
    state.cameraHeight = CAMERA_INTRO_HEIGHT;
    state.speed = 0;
    state.shangSpeed = followSpeed(1.05);
    state.distance = INITIAL_SHANG_Z;
    state.action = "intro";
    state.narrationsShown = 0;
    state.narrationUntil = 0;
    state.warning = false;
    state.footstepPhase = 0;
    state.lastFrameAt = 0;
    state.fps = 60;
    shangFrame = 0;
    shangFrameClock = 0;
    elements.root.dataset.state = "intro";
    elements.root.classList.remove(
      "is-washing-to-courtyard",
      "show-anchors",
      "show-vanishing",
    );
    elements.canvas?.classList.remove(
      "has-started",
      "is-holding",
      "is-too-far",
      "is-too-close",
      "is-arriving",
    );
    elements.intro?.classList.remove("is-visible");
    elements.warning?.classList.remove("is-visible");
    hideNarration();
    if (elements.arrival) elements.arrival.setAttribute("aria-hidden", "true");
    if (elements.debugPause) elements.debugPause.textContent = "暂停";
    setStatus("正在降到黑头的第一视角。");
    renderScene();
  }

  function activate() {
    if (!elements.root) return;
    if (state.active) return;
    state.active = true;
    preloadImages();
    reset();
    soundEnabled =
      elements.soundToggle?.getAttribute("aria-pressed") === "true";
    resizeScene();
    bindEvents();
    state.lastFrameAt = performance.now();
    animationFrameId = window.requestAnimationFrame(frame);
    elements.root.dataset.active = "true";
  }

  function deactivate() {
    if (!elements.root) return;
    state.active = false;
    state.holding = false;
    state.paused = false;
    elements.root.dataset.active = "false";
    elements.canvas?.classList.remove("is-holding");
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
    if (resizeFrameId) {
      window.cancelAnimationFrame(resizeFrameId);
      resizeFrameId = 0;
    }
    abortController?.abort();
    abortController = null;
    fadeAudio();
    const scheduledToken = ++audioStopToken;
    window.setTimeout(() => {
      if (scheduledToken === audioStopToken) stopAudio();
    }, 300);
  }

  function bindEvents() {
    abortController?.abort();
    abortController = new AbortController();
    const { signal } = abortController;

    elements.canvas?.addEventListener(
      "pointerdown",
      (event) => {
        if (
          event.button !== 0 ||
          event.target.closest(
            "button, a, input, textarea, select, [data-follow-no-hold]",
          )
        ) {
          return;
        }
        event.preventDefault();
        elements.canvas.setPointerCapture?.(event.pointerId);
        setHolding(true);
      },
      { signal },
    );

    const stopHolding = () => setHolding(false);
    elements.canvas?.addEventListener("pointerup", stopHolding, { signal });
    elements.canvas?.addEventListener("pointercancel", stopHolding, { signal });
    elements.canvas?.addEventListener("lostpointercapture", stopHolding, {
      signal,
    });
    window.addEventListener("pointerup", stopHolding, { signal });
    window.addEventListener("pointercancel", stopHolding, { signal });
    window.addEventListener("blur", stopHolding, { signal });
    window.addEventListener("resize", scheduleResize, { signal });
    window.visualViewport?.addEventListener("resize", scheduleResize, {
      signal,
    });

    window.addEventListener(
      "keydown",
      (event) => {
        if (event.code !== "Space" && event.code !== "ArrowUp") return;
        const target = event.target;
        const blockedControl =
          target instanceof Element &&
          target.closest(
            "button:not(#followHold), a, input, textarea, select",
          );
        if (blockedControl) return;
        event.preventDefault();
        if (!event.repeat) setHolding(true);
      },
      { signal },
    );
    window.addEventListener(
      "keyup",
      (event) => {
        if (event.code !== "Space" && event.code !== "ArrowUp") return;
        event.preventDefault();
        setHolding(false);
      },
      { signal },
    );

    elements.holdButton?.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setHolding(true);
      },
      { signal },
    );
    elements.holdButton?.addEventListener("pointerup", stopHolding, { signal });
    elements.holdButton?.addEventListener("pointercancel", stopHolding, {
      signal,
    });
    elements.holdButton?.addEventListener(
      "keydown",
      (event) => {
        if (event.code !== "Space" && event.code !== "Enter") return;
        if (event.code === "Space") {
          event.preventDefault();
          if (!event.repeat) setHolding(true);
        }
      },
      { signal },
    );
    elements.holdButton?.addEventListener(
      "keyup",
      (event) => {
        if (event.code !== "Space") return;
        event.preventDefault();
        setHolding(false);
      },
      { signal },
    );

    elements.restartButton?.addEventListener(
      "click",
      () => {
        stopAudio();
        reset();
      },
      { signal },
    );
    elements.skipButton?.addEventListener(
      "click",
      () => dispatchCompletion("skip"),
      { signal },
    );
    elements.soundToggle?.addEventListener(
      "click",
      () => {
        window.setTimeout(() => {
          soundEnabled =
            elements.soundToggle.getAttribute("aria-pressed") === "true";
          if (!soundEnabled) fadeAudio();
          else void ensureAudio();
        }, 0);
      },
      { signal },
    );

    elements.debugPause?.addEventListener(
      "click",
      () => {
        state.paused = !state.paused;
        elements.debugPause.textContent = state.paused ? "继续" : "暂停";
        setHolding(false);
      },
      { signal },
    );
    elements.debugReset?.addEventListener("click", reset, { signal });
    elements.debugSlider?.addEventListener(
      "input",
      () => {
        state.playerZ =
          (Number(elements.debugSlider.value) / 100) * END_Z;
        state.shangZ = Math.min(
          SHANG_GATE_Z,
          state.playerZ + DESIRED_DISTANCE,
        );
        state.distance = state.shangZ - state.playerZ;
        state.completed = false;
        state.arrivalElapsed = 0;
        state.speed = 0;
        state.shangSpeed = 0;
        state.ready = true;
        state.cameraHeight = CAMERA_HEIGHT;
        renderScene();
      },
      { signal },
    );
    elements.debugAnchors?.addEventListener(
      "click",
      () => {
        state.anchorsVisible = !state.anchorsVisible;
        elements.root.classList.toggle("show-anchors", state.anchorsVisible);
        elements.debugAnchors.setAttribute(
          "aria-pressed",
          String(state.anchorsVisible),
        );
      },
      { signal },
    );
    elements.debugVanishing?.addEventListener(
      "click",
      () => {
        state.vanishingVisible = !state.vanishingVisible;
        elements.root.classList.toggle(
          "show-vanishing",
          state.vanishingVisible,
        );
        elements.debugVanishing.setAttribute(
          "aria-pressed",
          String(state.vanishingVisible),
        );
      },
      { signal },
    );
  }

  function setupDebugPanel() {
    const enabled =
      new URLSearchParams(window.location.search).get("followDebug") === "1";
    state.debugVisible = enabled;
    if (elements.debugPanel) elements.debugPanel.hidden = !enabled;
    if (!enabled) return;
    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() !== "d" || !event.ctrlKey) return;
      event.preventDefault();
      elements.debugPanel.hidden = !elements.debugPanel.hidden;
    });
  }

  function getSnapshot() {
    return {
      active: state.active,
      paused: state.paused,
      ready: state.ready,
      holding: state.holding,
      completed: state.completed,
      followDurationMs: FOLLOW_DURATION_MS,
      followSpeedScale: FOLLOW_SPEED_SCALE,
      cameraHeight: Number(state.cameraHeight.toFixed(3)),
      cameraX: Number(state.cameraX.toFixed(3)),
      cameraZ: Number(state.playerZ.toFixed(3)),
      playerZ: Number(state.playerZ.toFixed(3)),
      shangZ: Number(state.shangZ.toFixed(3)),
      distance: Number(state.distance.toFixed(3)),
      speed: Number(state.speed.toFixed(3)),
      shangSpeed: Number(state.shangSpeed.toFixed(3)),
      action: state.action,
      warning: state.warning,
      fps: Number(state.fps.toFixed(1)),
      narration: elements.narrationText?.textContent || "",
      transitionDispatched: state.transitionDispatched,
      audioEnabled:
        elements.soundToggle?.getAttribute("aria-pressed") === "true",
      audioManifest: AUDIO_MANIFEST,
    };
  }

  function init() {
    queryElements();
    if (!elements.root || !elements.canvas) return;
    buildScene();
    setupDebugPanel();
    reset();
    window.addEventListener("pagehide", deactivate, { once: true });
  }

  window.heiTouFollow = Object.freeze({
    activate,
    deactivate,
    reset,
    getSnapshot,
    setProgress(progress, shangProgress = null) {
      state.ready = true;
      state.cameraHeight = CAMERA_HEIGHT;
      state.playerZ = clamp(Number(progress) || 0, 0, END_Z);
      state.shangZ =
        shangProgress === null
          ? Math.min(SHANG_GATE_Z, state.playerZ + DESIRED_DISTANCE)
          : clamp(Number(shangProgress) || 0, state.playerZ, GATE_Z);
      state.distance = state.shangZ - state.playerZ;
      state.speed = 0;
      state.shangSpeed = 0;
      renderScene();
    },
    complete() {
      state.ready = true;
      state.cameraHeight = CAMERA_HEIGHT;
      state.playerZ = END_Z - 0.1;
      state.shangZ = SHANG_GATE_Z;
      state.distance = state.shangZ - state.playerZ;
      state.speed = followSpeed(0.6);
      beginArrival();
    },
  });

  // This script is loaded after the follow-page markup, so bind immediately.
  // Initial route restoration runs in the page's following inline script.
  init();
})();
