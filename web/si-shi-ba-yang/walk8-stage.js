(() => {
  "use strict";

  const dialog = document.querySelector("#walk8Experience");
  const stage = document.querySelector("#walk8Stage");
  const route = document.querySelector("#walk8RoutePath");
  const routeProgress = document.querySelector("#walk8RouteProgress");
  const routeCue = document.querySelector("#walk8RouteCue");
  const startButton = document.querySelector("#walk8Start");
  const startLabel = startButton?.querySelector(".walk8-start__label");
  const demoButton = document.querySelector("#walk8Demo");
  const switchButton = document.querySelector("#walk8SwitchButton");
  const switchPrompt = document.querySelector("#walk8SwitchPrompt");
  const closeButton = document.querySelector("#walk8Close");
  const returnButton = document.querySelector("#walk8Return");
  const readingButton = document.querySelector("#walk8OpenReading");
  const stageStatus = document.querySelector("#walk8StageStatus");
  const actor = document.querySelector(".walk8-yu-liu");
  const sprites = [...document.querySelectorAll(".walk8-yu-liu__sprite")];
  const finale = document.querySelector("#walk8Finale");
  const finalePanel = document.querySelector("#walk8FinalePanel");
  const finaleOriginal = document.querySelector("#walk8FinaleOriginal");
  const finaleRestart = document.querySelector("#walk8FinaleRestart");
  const finaleContinue = document.querySelector("#walk8FinaleContinue");
  const finaleBack = document.querySelector("#walk8FinaleBack");
  const reader = document.querySelector("#sishiOriginal-chapter4");
  const originalStory =
    window.SUSHI_QIREN_ORIGINAL_TEXT?.stories?.["si-shi-ba-yang"];
  const walkPassage = originalStory?.paragraphs?.find(
    (paragraph) => paragraph.order === 19,
  );

  if (
    !dialog ||
    !stage ||
    !route ||
    !routeProgress ||
    !startButton ||
    !switchButton ||
    !switchPrompt ||
    !stageStatus ||
    !actor ||
    !finale ||
    !finalePanel ||
    !finaleOriginal ||
    !finaleRestart ||
    !finaleContinue ||
    !finaleBack
  ) {
    return;
  }

  const LOGICAL_WIDTH = 1920;
  const LOGICAL_HEIGHT = 1080;
  const ACTOR_START = Object.freeze({ x: 960, y: 540 });
  const BUCKET_POSITIONS = Object.freeze({
    left: Object.freeze({ x: 691, y: 540 }),
    right: Object.freeze({ x: 1229, y: 540 }),
  });
  const STORAGE_KEY = "sishi-qiren:walk8-route:v1";
  const ACTION_TRANSITION_MS = 190;
  const PICKUP_FEEDBACK_MS = 520;
  const SWITCH_ACTION_MS = 480;
  const FINALE_DURATION_MS = 6800;
  const ROUTE_NODES = Object.freeze([
    Object.freeze({
      id: "left-orbit",
      progress: 0.03,
      label: "左侧绕行",
      action: "left",
      type: "orbit",
    }),
    Object.freeze({
      id: "left-pickup",
      progress: 0.22,
      label: "左侧取糖",
      action: "take-left",
      type: "pickup",
    }),
    Object.freeze({
      id: "center-switch",
      progress: 0.5,
      label: "中央换手",
      action: "switch",
      type: "switch",
    }),
    Object.freeze({
      id: "right-orbit",
      progress: 0.53,
      label: "右侧绕行",
      action: "right",
      type: "orbit",
    }),
    Object.freeze({
      id: "right-pickup",
      progress: 0.72,
      label: "右侧取糖",
      action: "take-right",
      type: "pickup",
    }),
    Object.freeze({
      id: "center-return",
      progress: 0.99,
      label: "回到中心",
      action: "idle",
      type: "return",
    }),
  ]);
  const SWITCH_PROGRESS = ROUTE_NODES[2].progress;
  const COMPLETE_PROGRESS = 0.999;
  const MILESTONES = Object.freeze([
    Object.freeze({
      progress: 0.25,
      message: "左侧弧线已到尽头，顺着上方弧线折回中央。",
    }),
    Object.freeze({
      progress: 0.75,
      message: "右侧弧线已到尽头，沿回程回到中央收势。",
    }),
    Object.freeze({
      progress: 1,
      message: "八字走成了。俞六回到交叉点，路线已完整记下。",
    }),
  ]);

  const state = {
    progress: 0,
    routeProgress: 0,
    active: false,
    dragging: false,
    demo: false,
    pointerId: null,
    pointerType: "mouse",
    pose: "idle",
    currentAction: "idle",
    activeHand: "right",
    switchCompleted: false,
    switchPending: false,
    switchAnimating: false,
    resumeDemoAfterSwitch: false,
    interactionCompleted: false,
    routeCompleted: false,
    manualCompleted: false,
    completionSource: null,
    routeMode: "manual",
    performanceActive: false,
    performancePlayed: false,
    performanceFinished: false,
    offRoute: false,
    passedMilestones: new Set(),
    triggeredActionNodes: new Set(),
    lastMoveAt: 0,
    lastStatusAt: 0,
  };
  const abortController = new AbortController();
  const listenerOptions = { signal: abortController.signal };
  let routeLength = 0;
  let lastFocusedElement = null;
  let demoFrame = 0;
  let delayedStatus = 0;
  let lastStatusText = "";
  let pickupTimeout = 0;
  let switchTimeout = 0;
  let finaleTimeout = 0;

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function measureRoute() {
    routeLength = route.getTotalLength();
    route.dataset.routeLength = routeLength.toFixed(2);
    stage.dataset.routeLength = routeLength.toFixed(2);
    stage.dataset.actorX = String(ACTOR_START.x);
    stage.dataset.actorY = String(ACTOR_START.y);
    stage.dataset.leftBucketX = String(BUCKET_POSITIONS.left.x);
    stage.dataset.leftBucketY = String(BUCKET_POSITIONS.left.y);
    stage.dataset.rightBucketX = String(BUCKET_POSITIONS.right.x);
    stage.dataset.rightBucketY = String(BUCKET_POSITIONS.right.y);
    const switchPoint = routePoint(SWITCH_PROGRESS);
    switchPrompt.style.setProperty(
      "--switch-x",
      `${((switchPoint.x / LOGICAL_WIDTH) * 100).toFixed(5)}%`,
    );
    switchPrompt.style.setProperty(
      "--switch-y",
      `${((switchPoint.y / LOGICAL_HEIGHT) * 100).toFixed(5)}%`,
    );
  }

  function routePoint(progress) {
    return route.getPointAtLength(clamp(progress) * routeLength);
  }

  function readSavedState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          progress: 0,
          activeHand: "right",
          switchCompleted: false,
          interactionCompleted: false,
          routeCompleted: false,
          manualCompleted: false,
          completionSource: null,
          performancePlayed: false,
          performanceFinished: false,
        };
      }
      const parsed = raw.trim().startsWith("{")
        ? JSON.parse(raw)
        : { progress: Number(raw) };
      const switchCompleted = Boolean(parsed.switchCompleted);
      const rawProgress = Number(parsed.progress ?? parsed.routeProgress);
      let progress = Number.isFinite(rawProgress) ? clamp(rawProgress) : 0;
      if (progress > SWITCH_PROGRESS + 0.0001 && !switchCompleted) {
        progress = SWITCH_PROGRESS;
      }
      if (switchCompleted && progress >= COMPLETE_PROGRESS) progress = 1;
      const routeCompleted =
        switchCompleted && progress >= COMPLETE_PROGRESS;
      const manualCompleted =
        routeCompleted &&
        Boolean(parsed.manualCompleted ?? parsed.interactionCompleted);
      return {
        progress,
        activeHand:
          switchCompleted && parsed.activeHand === "left" ? "left" : "right",
        switchCompleted,
        interactionCompleted: manualCompleted,
        routeCompleted,
        manualCompleted,
        completionSource: routeCompleted
          ? parsed.completionSource === "demo" && !manualCompleted
            ? "demo"
            : "manual"
          : null,
        performancePlayed:
          routeCompleted && Boolean(parsed.performancePlayed),
        performanceFinished:
          routeCompleted && Boolean(parsed.performanceFinished),
      };
    } catch {
      return {
        progress: 0,
        activeHand: "right",
        switchCompleted: false,
        interactionCompleted: false,
        routeCompleted: false,
        manualCompleted: false,
        completionSource: null,
        performancePlayed: false,
        performanceFinished: false,
      };
    }
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          progress: state.progress,
          routeProgress: state.progress,
          currentAction: state.currentAction,
          activeHand: state.activeHand,
          switchCompleted: state.switchCompleted,
          interactionCompleted: state.interactionCompleted,
          routeCompleted: state.routeCompleted,
          manualCompleted: state.manualCompleted,
          completionSource: state.completionSource,
          performancePlayed: state.performancePlayed,
          performanceFinished: state.performanceFinished,
        }),
      );
    } catch {
      // Private browsing can disable storage; the in-memory route still works.
    }
  }

  function status(message, { force = false } = {}) {
    if (!message || message === lastStatusText) return;
    const now = window.performance.now();
    window.clearTimeout(delayedStatus);
    if (!force && now - state.lastStatusAt < 180) {
      delayedStatus = window.setTimeout(() => {
        lastStatusText = message;
        state.lastStatusAt = window.performance.now();
        stageStatus.textContent = message;
      }, 180);
      return;
    }
    lastStatusText = message;
    state.lastStatusAt = now;
    stageStatus.textContent = message;
  }

  function routineActionForProgress(progress) {
    if (progress >= ROUTE_NODES[5].progress) return "return";
    if (progress >= SWITCH_PROGRESS) {
      return state.switchCompleted ? "right" : "switch";
    }
    if (progress >= ROUTE_NODES[0].progress) return "left";
    return "idle";
  }

  function poseForAction(action) {
    if (action === "switch") return "switch";
    if (action === "left" || action === "take-left") return "left";
    if (action === "right" || action === "take-right") {
      return "right";
    }
    return "idle";
  }

  function setActorAction(action) {
    if (!action) return;
    const pose = poseForAction(action);
    state.currentAction = action;
    state.pose = pose;
    actor.dataset.pose = pose;
    actor.dataset.action = action;
    sprites.forEach((sprite) => {
      sprite.classList.toggle("is-active", sprite.dataset.pose === pose);
    });
  }

  function syncActionToProgress(progress) {
    if (
      state.switchAnimating ||
      state.switchPending ||
      state.currentAction.startsWith("take-")
    ) {
      return;
    }
    setActorAction(routineActionForProgress(progress));
  }

  function setStartLabel(text) {
    if (startLabel) startLabel.textContent = text;
  }

  function updateActor(progress, { updatePose = true } = {}) {
    state.progress = clamp(progress);
    state.routeProgress = state.progress;
    const point = routePoint(state.progress);
    const xPercent = (point.x / LOGICAL_WIDTH) * 100;
    const yPercent = (point.y / LOGICAL_HEIGHT) * 100;

    stage.style.setProperty("--actor-x", `${xPercent.toFixed(5)}%`);
    stage.style.setProperty("--actor-y", `${yPercent.toFixed(5)}%`);
    stage.dataset.actorX = String(Math.round(point.x * 100) / 100);
    stage.dataset.actorY = String(Math.round(point.y * 100) / 100);
    stage.dataset.progress = (state.progress * 100).toFixed(2);
    routeProgress.style.strokeDasharray = `${
      (state.progress * 1000).toFixed(2)
    } 1000`;

    if (routeCue) {
      routeCue.setAttribute("cx", point.x.toFixed(2));
      routeCue.setAttribute("cy", point.y.toFixed(2));
    }
    if (updatePose) syncActionToProgress(state.progress);
    updateStateLabel();
  }

  function updateStateLabel() {
    const complete = state.progress >= COMPLETE_PROGRESS;
    let label = "开始引导";
    if (complete) label = "重新引导";
    else if (state.switchPending) label = "等待换手";
    else if (state.progress > 0.0001) label = "继续引导";
    setStartLabel(label);
    stage.dataset.experienceState = complete
      ? "complete"
      : state.active
        ? "guiding"
        : state.progress > 0
          ? "paused"
          : "ready";
  }

  function setActive(active) {
    state.active = active;
    stage.classList.toggle("is-guiding", active);
    startButton.setAttribute("aria-pressed", String(active));
    updateStateLabel();
  }

  function markPassedMilestones(progress) {
    MILESTONES.forEach((milestone, index) => {
      if (progress + 0.0001 >= milestone.progress) {
        state.passedMilestones.add(index);
      }
    });
  }

  function nextMilestone() {
    return MILESTONES.findIndex(
      (milestone, index) =>
        state.progress + 0.0001 < milestone.progress &&
        !state.passedMilestones.has(index),
    );
  }

  function markTriggeredActionNodes(progress) {
    ROUTE_NODES.forEach((node, index) => {
      if (progress + 0.0001 >= node.progress) {
        state.triggeredActionNodes.add(index);
      }
    });
  }

  function clearPickupFeedback() {
    if (pickupTimeout) window.clearTimeout(pickupTimeout);
    pickupTimeout = 0;
  }

  function clearSwitchFeedback() {
    if (switchTimeout) window.clearTimeout(switchTimeout);
    switchTimeout = 0;
  }

  function hideSwitchPrompt() {
    switchPrompt.hidden = true;
    switchPrompt.setAttribute("aria-hidden", "true");
    switchPrompt.classList.remove("is-playing");
    switchButton.hidden = true;
    switchButton.disabled = false;
    switchButton.textContent = "完成换手";
  }

  function showSwitchPrompt() {
    switchPrompt.hidden = false;
    switchPrompt.setAttribute("aria-hidden", "false");
    switchPrompt.classList.remove("is-playing");
    switchButton.hidden = false;
    switchButton.disabled = false;
    switchButton.textContent = "完成换手";
  }

  function triggerPickup(node) {
    clearPickupFeedback();
    setActorAction(node.action);
    const hand = state.activeHand === "left" ? "左手" : "右手";
    status(`${node.label}：${hand}舀起一块药糖，路线继续。`, {
      force: true,
    });
    pickupTimeout = window.setTimeout(() => {
      pickupTimeout = 0;
      if (
        state.switchPending ||
        state.switchAnimating ||
        state.progress >= COMPLETE_PROGRESS
      ) {
        return;
      }
      setActorAction(routineActionForProgress(state.progress));
    }, PICKUP_FEEDBACK_MS);
  }

  function pauseAtSwitch() {
    if (state.switchCompleted) return;
    if (state.switchPending) {
      showSwitchPrompt();
      status("换手尚未完成。点击“完成换手”或按空格键。", {
        force: true,
      });
      return;
    }
    const wasDemo = state.demo;
    cancelDemo();
    stopPointerCapture();
    state.resumeDemoAfterSwitch = wasDemo;
    state.switchPending = true;
    state.switchAnimating = false;
    stage.dataset.switchState = "pending";
    setActorAction("switch");
    showSwitchPrompt();
    updateStateLabel();
    saveProgress();
    status("到中央换手点，路线已暂停。点击“完成换手”或按空格键。", {
      force: true,
    });
    window.requestAnimationFrame(() => {
      switchButton.focus({ preventScroll: true });
    });
  }

  function completeSwitch(source = "pointer") {
    if (
      !state.switchPending ||
      state.switchCompleted ||
      state.switchAnimating
    ) {
      return;
    }
    state.switchPending = false;
    state.switchAnimating = true;
    stage.dataset.switchState = "playing";
    setActorAction("switch");
    actor.classList.add("is-switching");
    switchPrompt.classList.add("is-playing");
    switchButton.disabled = true;
    switchButton.textContent = "换手中…";
    updateStateLabel();
    status(
      `换手中：铜勺从${state.activeHand === "right" ? "右" : "左"}手交到${state.activeHand === "right" ? "左" : "右"}手。`,
      { force: true },
    );

    switchTimeout = window.setTimeout(() => {
      switchTimeout = 0;
      state.switchAnimating = false;
      state.switchCompleted = true;
      state.activeHand = state.activeHand === "right" ? "left" : "right";
      actor.classList.remove("is-switching");
      stage.dataset.switchState = "complete";
      hideSwitchPrompt();
      setActorAction(routineActionForProgress(state.progress));
      saveProgress();
      status(
        `换手完成，现在用${state.activeHand === "left" ? "左手" : "右手"}。${
          state.active
            ? "按住人物脚下的路线继续向右绕行。"
            : "点击“继续引导”后按住路线向右绕行。"
        }`,
        { force: true },
      );
      updateStateLabel();
      if (state.resumeDemoAfterSwitch) {
        state.resumeDemoAfterSwitch = false;
        startDemo();
      }
    }, SWITCH_ACTION_MS);
  }

  function triggerActionNodes(previousProgress, targetProgress) {
    ROUTE_NODES.forEach((node, index) => {
      if (
        state.triggeredActionNodes.has(index) ||
        targetProgress + 0.0001 < node.progress
      ) {
        return;
      }
      state.triggeredActionNodes.add(index);
      if (node.type === "switch") {
        pauseAtSwitch();
      } else if (node.type === "pickup") {
        triggerPickup(node);
      } else if (node.type === "return") {
        clearPickupFeedback();
        setActorAction("return");
        status("回到中心，收势后再走半步就完成。", { force: true });
      } else {
        setActorAction(node.action);
      }
    });
  }

  function stopPointerCapture() {
    if (
      state.pointerId !== null &&
      stage.hasPointerCapture?.(state.pointerId)
    ) {
      try {
        stage.releasePointerCapture(state.pointerId);
      } catch {
        // The browser may already have released capture on cancel/blur.
      }
    }
    state.pointerId = null;
    state.dragging = false;
  }

  function cancelDemo({ announce = false } = {}) {
    if (demoFrame) window.cancelAnimationFrame(demoFrame);
    demoFrame = 0;
    const wasPlaying = state.demo;
    state.demo = false;
    demoButton?.setAttribute("aria-pressed", "false");
    if (demoButton) demoButton.textContent = "演示路线";
    if (wasPlaying && announce) {
      status("自动演示已暂停；可继续按住路线前进。");
    }
  }

  function clearFinaleTimer() {
    if (finaleTimeout) window.clearTimeout(finaleTimeout);
    finaleTimeout = 0;
  }

  function hideFinale() {
    clearFinaleTimer();
    state.performanceActive = false;
    stage.classList.remove("is-finale", "is-finale-finished");
    finale.classList.remove("is-playing", "is-finished");
    finale.hidden = true;
    finale.setAttribute("aria-hidden", "true");
    finalePanel.hidden = true;
    stage.dataset.performance = "idle";
    stage.setAttribute("aria-label", "俞六走八字路线引导场景");
  }

  function finishFinale() {
    clearFinaleTimer();
    state.performanceActive = false;
    state.performanceFinished = true;
    stage.classList.remove("is-finale-playing");
    stage.classList.add("is-finale-finished");
    stage.dataset.performance = "finished";
    finale.classList.remove("is-playing");
    finale.classList.add("is-finished");
    finalePanel.hidden = false;
    status(
      state.manualCompleted
        ? "完整表演结束，路线和换手均已记为手动完成。"
        : "完整表演结束；本次由演示完成，不记为手动挑战成功。",
      { force: true },
    );
    saveProgress();
    window.requestAnimationFrame(() =>
      finaleRestart.focus({ preventScroll: true }),
    );
  }

  function startFinale() {
    if (
      !state.switchCompleted ||
      state.progress < COMPLETE_PROGRESS ||
      !dialog.open
    ) {
      return false;
    }
    clearFinaleTimer();
    cancelDemo();
    stopPointerCapture();
    state.performanceActive = true;
    state.performancePlayed = true;
    state.performanceFinished = false;
    stage.classList.remove("is-finale-finished");
    stage.classList.add("is-finale", "is-finale-playing");
    stage.dataset.performance = "playing";
    stage.setAttribute(
      "aria-label",
      "天津老街完整表演，俞六挑着二龙戏珠双桶药糖担走八字",
    );
    finale.hidden = false;
    finale.setAttribute("aria-hidden", "false");
    finale.classList.remove("is-finished");
    finale.classList.remove("is-playing");
    void finale.offsetWidth;
    finale.classList.add("is-playing");
    finalePanel.hidden = true;
    finaleOriginal.textContent =
      walkPassage?.content ||
      "未找到《四十八样》走八字的原著段落，请检查原文数据。";
    status(
      state.manualCompleted
        ? "路线与换手完成，完整表演开始。"
        : "演示路线完成，完整表演开始；本次不记为手动挑战成功。",
      { force: true },
    );
    saveProgress();
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 900
      : FINALE_DURATION_MS;
    finaleTimeout = window.setTimeout(finishFinale, duration);
    return true;
  }

  function resetRoute() {
    hideFinale();
    cancelDemo();
    stopPointerCapture();
    clearPickupFeedback();
    clearSwitchFeedback();
    hideSwitchPrompt();
    actor.classList.remove("is-switching");
    state.dragging = false;
    state.demo = false;
    state.pointerId = null;
    state.pointerType = "mouse";
    state.progress = 0;
    state.routeProgress = 0;
    state.activeHand = "right";
    state.switchCompleted = false;
    state.switchPending = false;
    state.switchAnimating = false;
    state.resumeDemoAfterSwitch = false;
    state.interactionCompleted = false;
    state.routeCompleted = false;
    state.manualCompleted = false;
    state.completionSource = null;
    state.routeMode = "manual";
    state.performanceActive = false;
    state.performancePlayed = false;
    state.performanceFinished = false;
    state.offRoute = false;
    state.currentAction = "idle";
    state.pose = "idle";
    state.passedMilestones.clear();
    state.triggeredActionNodes.clear();
    stage.dataset.switchState = "ready";
    stage.dataset.pointerState = "idle";
    delete stage.dataset.lastNode;
    updateActor(0);
    setActive(false);
    updateStateLabel();
    saveProgress();
  }

  function completeRoute({ announce = true } = {}) {
    const completionSource = state.demo ? "demo" : "manual";
    cancelDemo();
    stopPointerCapture();
    updateActor(1);
    markPassedMilestones(1);
    markTriggeredActionNodes(1);
    state.routeCompleted = true;
    state.completionSource = completionSource;
    state.manualCompleted =
      completionSource === "manual" && state.switchCompleted;
    state.interactionCompleted = state.manualCompleted;
    setActive(false);
    stage.dataset.experienceState = "complete";
    setStartLabel("重新引导");
    saveProgress();
    if (announce) {
      status(MILESTONES[MILESTONES.length - 1].message, { force: true });
    }
    startFinale();
  }

  function advanceRouteTo(candidate) {
    if (state.switchPending || state.switchAnimating) return false;

    const nextIndex = nextMilestone();
    const milestone =
      nextIndex >= 0 && candidate + 0.0001 >= MILESTONES[nextIndex].progress
        ? MILESTONES[nextIndex]
        : null;
    const milestoneTarget = milestone
      ? Math.min(candidate, milestone.progress)
      : Math.min(candidate, 1);
    const target =
      !state.switchCompleted && candidate + 0.0001 >= SWITCH_PROGRESS
        ? Math.min(milestoneTarget, SWITCH_PROGRESS)
        : milestoneTarget;

    if (target <= state.progress + 0.00001) return false;
    const previousProgress = state.progress;
    updateActor(target);
    triggerActionNodes(previousProgress, target);

    if (milestone) {
      state.passedMilestones.add(nextIndex);
      stage.dataset.lastNode = String(milestone.progress);
      status(milestone.message, { force: true });
    }
    if (state.progress >= COMPLETE_PROGRESS) {
      completeRoute();
    }
    return true;
  }

  function pointerTolerance(pointerType) {
    return pointerType === "touch" || pointerType === "pen" ? 168 : 78;
  }

  function toLogicalPoint(event) {
    const rect = stage.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
      rect,
    };
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function nearestForwardRoutePoint(point, maxAdvance) {
    const start = state.progress * routeLength;
    const end = Math.min(
      routeLength,
      start + Math.max(maxAdvance * 3.2, 190),
    );
    const step = Math.max(2, routeLength / 1800);
    let bestOffset = start;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let offset = start; offset <= end; offset += step) {
      const candidate = route.getPointAtLength(offset);
      const candidateDistance = distance(point, candidate);
      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance;
        bestOffset = offset;
      }
    }
    return { offset: bestOffset, distance: bestDistance };
  }

  function moveAdvanceLimit(now, pointerType) {
    const elapsed = clamp(
      (now - state.lastMoveAt) / 1000,
      0.012,
      pointerType === "touch" || pointerType === "pen" ? 0.12 : 0.08,
    );
    return clamp(routeLength * 0.004 + 920 * elapsed, 14, routeLength * 0.035);
  }

  function beginGuidance() {
    if (state.progress >= COMPLETE_PROGRESS) resetRoute();
    cancelDemo();
    state.routeMode = "manual";
    setActive(true);
    stage.dataset.experienceState = "guiding";
    setStartLabel("引导中");
    status(
      state.progress > 0
        ? "已继续。按住人物脚下的当前路线位置，沿前方淡墨路线顺向前进。"
        : "已开始。按住中央起始点，沿淡墨路线顺向前进。",
      {
      force: true,
      },
    );
  }

  function startDemo() {
    if (state.switchPending || state.switchAnimating) {
      status("先完成中央换手，再继续演示。", { force: true });
      return;
    }
    if (state.demo) {
      cancelDemo({ announce: true });
      return;
    }
    stopPointerCapture();
    if (state.progress >= COMPLETE_PROGRESS) resetRoute();
    setActive(true);
    state.routeMode = "demo";
    state.demo = true;
    demoButton?.setAttribute("aria-pressed", "true");
    if (demoButton) demoButton.textContent = "停止演示";
    status("自动演示开始：看俞六如何依次绕过左右两桶。", {
      force: true,
    });

    const startProgress = state.progress;
    const startedAt = window.performance.now();
    const duration = Math.max(1300, 6800 * (1 - startProgress));
    state.lastMoveAt = startedAt;

    function animate(now) {
      if (!state.demo) return;
      const nextProgress =
        startProgress + clamp((now - startedAt) / duration, 0, 1);
      advanceRouteTo(nextProgress);
      if (state.progress >= COMPLETE_PROGRESS) return;
      demoFrame = window.requestAnimationFrame(animate);
    }

    demoFrame = window.requestAnimationFrame(animate);
  }

  function closeExperience({ returnToReader = false } = {}) {
    if (!dialog.open) return;
    clearFinaleTimer();
    cancelDemo();
    stopPointerCapture();
    saveProgress();
    dialog.close("walk8-return");
    document.body.classList.remove("walk8-modal-open");

    const focusTarget =
      returnToReader && reader
        ? reader
        : lastFocusedElement?.isConnected
          ? lastFocusedElement
          : document.querySelector(
              "[data-walk8-open], [data-walk8-reset-open]",
            );

    if (returnToReader) {
      reader?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }
    window.setTimeout(() => focusTarget?.focus?.({ preventScroll: true }), 60);
  }

  function openExperience() {
    lastFocusedElement = document.activeElement;
    hideFinale();
    cancelDemo();
    stopPointerCapture();
    clearPickupFeedback();
    clearSwitchFeedback();
    hideSwitchPrompt();
    actor.classList.remove("is-switching");
    measureRoute();
    const saved = readSavedState();
    state.progress = saved.progress;
    state.routeProgress = saved.progress;
    state.activeHand = saved.activeHand;
    state.switchCompleted = saved.switchCompleted;
    state.switchPending = false;
    state.switchAnimating = false;
    state.resumeDemoAfterSwitch = false;
    state.interactionCompleted = saved.interactionCompleted;
    state.routeCompleted = saved.routeCompleted;
    state.manualCompleted = saved.manualCompleted;
    state.completionSource = saved.completionSource;
    state.performanceActive = false;
    state.performancePlayed = saved.performancePlayed;
    state.performanceFinished = saved.performanceFinished;
    state.offRoute = false;
    state.passedMilestones.clear();
    markPassedMilestones(state.progress);
    state.triggeredActionNodes.clear();
    markTriggeredActionNodes(state.progress);
    updateActor(state.progress);
    setActive(false);
    if (
      !state.switchCompleted &&
      state.progress >= SWITCH_PROGRESS - 0.0001
    ) {
      state.switchPending = true;
      stage.dataset.switchState = "pending";
      setActorAction("switch");
      showSwitchPrompt();
    } else {
      stage.dataset.switchState = state.switchCompleted ? "complete" : "ready";
    }
    updateStateLabel();
    stage.dataset.experienceState =
      state.progress >= COMPLETE_PROGRESS
        ? "complete"
        : state.progress > 0
          ? "paused"
          : "ready";
    if (state.switchPending) {
      status(
        "已回到中央换手点。点击“完成换手”或按空格键，换手后才能继续。",
        { force: true },
      );
    } else if (state.progress >= COMPLETE_PROGRESS) {
      status("路线已完成。可播放演示，或点击“重新引导”再走一次。", {
        force: true,
      });
    } else if (state.progress > 0) {
      status(
        `已回到上次位置（${Math.round(state.progress * 100)}%）。点击“继续引导”后按住路线。`,
        { force: true },
      );
    } else {
      status("点击“开始引导”，再按住中央的起始标记沿路线前进。", {
        force: true,
      });
    }

    document.body.classList.add("walk8-modal-open");
    dialog.showModal();
    if (state.routeCompleted) startFinale();
    window.requestAnimationFrame(() => {
      if (state.routeCompleted) return;
      (state.switchPending ? switchButton : startButton).focus({
        preventScroll: true,
      });
    });
  }

  document.addEventListener(
    "click",
    (event) => {
      const opener = event.target.closest(
        "[data-walk8-open], [data-walk8-reset-open]",
      );
      if (!opener) return;
      event.preventDefault();
      if (opener.hasAttribute("data-walk8-reset-open")) resetRoute();
      openExperience();
    },
    listenerOptions,
  );

  startButton.addEventListener(
    "click",
    () => {
      if (state.active) {
        status("引导已开始；请按住当前路线位置，再沿前方淡墨路线前进。", {
          force: true,
        });
        return;
      }
      beginGuidance();
    },
    listenerOptions,
  );

  demoButton?.addEventListener("click", startDemo, listenerOptions);
  switchButton.addEventListener(
    "click",
    () => completeSwitch("pointer"),
    listenerOptions,
  );
  finaleRestart.addEventListener(
    "click",
    () => {
      resetRoute();
      beginGuidance();
    },
    listenerOptions,
  );
  finaleContinue.addEventListener(
    "click",
    () => {
      closeExperience({ returnToReader: true });
      window.setTimeout(() => {
        if (typeof window.openReadingDialog === "function") {
          window.openReadingDialog("si-shi-ba-yang-p20");
        } else {
          document.querySelector("#readingEntry")?.click();
        }
      }, 100);
    },
    listenerOptions,
  );
  finaleBack.addEventListener(
    "click",
    () => {
      closeExperience();
      window.setTimeout(() => {
        const walkSection = document.querySelector("#walkFigureEight");
        walkSection?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        });
        walkSection?.focus?.({ preventScroll: true });
      }, 80);
    },
    listenerOptions,
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        !state.switchPending ||
        state.switchAnimating ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.code !== "Space" && event.key !== " ")
      ) {
        return;
      }
      event.preventDefault();
      completeSwitch("keyboard");
    },
    listenerOptions,
  );

  stage.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (state.progress >= COMPLETE_PROGRESS) {
        status("路线已经完成。如需再走一次，请点击“重新引导”。", {
          force: true,
        });
        return;
      }
      if (!state.active) {
        status("请先点击“开始引导”，再按住起始标记。", { force: true });
        return;
      }
      if (state.switchPending || state.switchAnimating) {
        status("中央换手尚未完成，请先点击“完成换手”或按空格键。", {
          force: true,
        });
        return;
      }

      const point = toLogicalPoint(event);
      const current = routePoint(state.progress);
      const startTolerance =
        event.pointerType === "touch" || event.pointerType === "pen" ? 230 : 120;
      if (distance(point, current) > startTolerance) {
        state.offRoute = true;
        stage.dataset.pointerState = "off-route";
        status("还没抓住路线。请按住当前人物脚下的淡墨位置。", {
          force: true,
        });
        return;
      }

      event.preventDefault();
      cancelDemo();
      state.routeMode = "manual";
      setActive(true);
      state.dragging = true;
      state.pointerId = event.pointerId;
      state.pointerType = event.pointerType;
      state.lastMoveAt = window.performance.now();
      state.offRoute = false;
      stage.dataset.pointerState = "following";
      try {
        stage.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is an enhancement; normal pointermove still works.
      }
      status(
        state.progress > 0
          ? "已抓住当前路线位置。沿前方路线拖动，松手会保存进度。"
          : "已抓住起始点。沿路线向前拖动，松手会保存进度。",
        { force: true },
      );
    },
    listenerOptions,
  );

  stage.addEventListener(
    "pointermove",
    (event) => {
      if (
        !state.dragging ||
        state.pointerId !== event.pointerId ||
        state.progress >= COMPLETE_PROGRESS
      ) {
        return;
      }
      event.preventDefault();
      const now = window.performance.now();
      const point = toLogicalPoint(event);
      const { rect } = point;
      const edgeMargin = 32;
      if (
        event.clientX < rect.left - edgeMargin ||
        event.clientX > rect.right + edgeMargin ||
        event.clientY < rect.top - edgeMargin ||
        event.clientY > rect.bottom + edgeMargin
      ) {
        stopPointerCapture();
        saveProgress();
        stage.dataset.pointerState = "paused";
        status("指针已经离开场景，路线已暂停；回到场景后可再次按住继续。", {
          force: true,
        });
        return;
      }

      const maxAdvance = moveAdvanceLimit(now, event.pointerType);
      const nearest = nearestForwardRoutePoint(point, maxAdvance);
      const tolerance = pointerTolerance(event.pointerType);
      if (nearest.distance > tolerance) {
        if (!state.offRoute) {
          state.offRoute = true;
          stage.dataset.pointerState = "off-route";
          status("偏离路线，前进已暂停。回到当前人物附近的淡墨线即可继续。", {
            force: true,
          });
        }
        state.lastMoveAt = now;
        return;
      }

      if (state.offRoute) {
        state.offRoute = false;
        stage.dataset.pointerState = "following";
        status("已回到路线，继续沿当前方向前进。", { force: true });
      }
      const candidate =
        (nearest.offset + Math.min(maxAdvance, nearest.distance * 0.2)) /
        routeLength;
      advanceRouteTo(candidate);
      state.lastMoveAt = now;
    },
    listenerOptions,
  );

  function finishPointer(event) {
    if (!state.dragging || state.pointerId !== event.pointerId) return;
    stopPointerCapture();
    saveProgress();
    stage.dataset.pointerState = "paused";
    if (!state.currentAction.startsWith("take-")) {
      status(
        state.progress >= COMPLETE_PROGRESS
          ? MILESTONES[MILESTONES.length - 1].message
          : `已松手并保存进度（${Math.round(state.progress * 100)}%）。再次按住人物脚下的路线即可继续。`,
        { force: true },
      );
    }
  }

  stage.addEventListener("pointerup", finishPointer, listenerOptions);
  stage.addEventListener(
    "pointercancel",
    (event) => {
      if (!state.dragging || state.pointerId !== event.pointerId) return;
      stopPointerCapture();
      saveProgress();
      stage.dataset.pointerState = "paused";
      status("系统取消了本次触摸，进度已保存；可再次按住继续。", {
        force: true,
      });
    },
    listenerOptions,
  );
  stage.addEventListener(
    "lostpointercapture",
    (event) => {
      if (state.dragging && state.pointerId === event.pointerId) {
        state.dragging = false;
        state.pointerId = null;
        saveProgress();
        stage.dataset.pointerState = "paused";
      }
    },
    listenerOptions,
  );

  closeButton?.addEventListener(
    "click",
    () => closeExperience(),
    listenerOptions,
  );
  returnButton?.addEventListener(
    "click",
    () => closeExperience({ returnToReader: true }),
    listenerOptions,
  );
  readingButton?.addEventListener(
    "click",
    () => {
      closeExperience({ returnToReader: true });
      window.setTimeout(
        () => document.querySelector("#readingEntry")?.click(),
        80,
      );
    },
    listenerOptions,
  );
  dialog.addEventListener(
    "close",
    () => {
      cancelDemo();
      stopPointerCapture();
      saveProgress();
      document.body.classList.remove("walk8-modal-open");
    },
    listenerOptions,
  );
  dialog.addEventListener(
    "cancel",
    () => {
      cancelDemo();
      stopPointerCapture();
      saveProgress();
      document.body.classList.remove("walk8-modal-open");
    },
    listenerOptions,
  );
  dialog.addEventListener(
    "click",
    (event) => {
      if (event.target === dialog) closeExperience();
    },
    listenerOptions,
  );

  function pauseOnInterruption() {
    if (state.dragging) {
      stopPointerCapture();
      saveProgress();
      stage.dataset.pointerState = "paused";
      status("窗口失去焦点，路线已暂停并保存。", { force: true });
    }
    cancelDemo({ announce: true });
  }

  window.addEventListener("blur", pauseOnInterruption, listenerOptions);
  window.addEventListener("pagehide", destroy, listenerOptions);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) pauseOnInterruption();
    },
    listenerOptions,
  );

  function destroy() {
    clearFinaleTimer();
    cancelDemo();
    stopPointerCapture();
    window.clearTimeout(delayedStatus);
    abortController.abort();
  }

  measureRoute();
  updateActor(0);
  window.walk8StageModel = Object.freeze({
    logicalWidth: LOGICAL_WIDTH,
    logicalHeight: LOGICAL_HEIGHT,
    routePath: route.getAttribute("d"),
    routeLength,
    actorStart: ACTOR_START,
    bucketPositions: BUCKET_POSITIONS,
    crossingPasses: Object.freeze([SWITCH_PROGRESS, 1]),
    routeNodes: ROUTE_NODES,
  });
  window.walk8StageController = Object.freeze({
    destroy,
    getSnapshot: () => ({
      progress: state.progress,
      routeProgress: state.routeProgress,
      active: state.active,
      dragging: state.dragging,
      demo: state.demo,
      pointerState: stage.dataset.pointerState || "idle",
      experienceState: stage.dataset.experienceState || "ready",
      pose: state.pose,
      currentAction: state.currentAction,
      activeHand: state.activeHand,
      switchCompleted: state.switchCompleted,
      switchPending: state.switchPending,
      switchAnimating: state.switchAnimating,
      interactionCompleted: state.interactionCompleted,
      routeCompleted: state.routeCompleted,
      manualCompleted: state.manualCompleted,
      completionSource: state.completionSource,
      performanceActive: state.performanceActive,
      performancePlayed: state.performancePlayed,
      performanceFinished: state.performanceFinished,
      routeMode: state.routeMode,
      performanceState: stage.dataset.performance || "idle",
      triggeredActionNodes: [...state.triggeredActionNodes],
      lastNode: stage.dataset.lastNode || "",
    }),
  });
})();
