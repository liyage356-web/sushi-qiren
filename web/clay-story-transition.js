(() => {
  "use strict";

  const CONFIG = Object.freeze({
    enterShoe: 600,
    shoeHold: 2000,
    shoeToTable: 800,
    tableHold: 1000,
    enterCraft: 600,
    captionDelay: 500,
    captionDuration: 700,
  });

  const root = document.querySelector("#clayStoryTransition");
  const experience = document.querySelector("#niRenZhangExperience");
  const observePage = document.querySelector("#nrPageObserve");
  const shoeImage = document.querySelector("#clayStoryShoeImage");
  const tableImage = document.querySelector("#clayStoryTableImage");
  const caption = document.querySelector("#clayStoryTransitionCaption");
  const skipButton = document.querySelector("#clayStoryTransitionSkip");
  const status = root?.querySelector("[data-clay-transition-status]");

  if (
    !root ||
    !experience ||
    !observePage ||
    !shoeImage ||
    !tableImage ||
    !caption ||
    !skipButton
  ) {
    return;
  }

  const timers = new Set();
  let state = "idle";
  let onComplete = null;
  let completing = false;
  let previousFocus = null;

  function announce(message) {
    if (!status) return;
    status.textContent = "";
    window.requestAnimationFrame(() => {
      status.textContent = message;
    });
  }

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
  }

  function later(callback, delay) {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
    return timer;
  }

  function setState(nextState) {
    const showingTable =
      nextState === "table-clay" ||
      (nextState === "completed" && root.classList.contains("is-table"));
    state = nextState;
    root.dataset.state = nextState;
    root.classList.toggle("is-table", showingTable);
    const shoeVisible = !showingTable && nextState !== "idle";
    shoeImage.setAttribute("aria-hidden", String(!shoeVisible));
    tableImage.setAttribute("aria-hidden", String(!showingTable));
    caption.setAttribute("aria-hidden", String(!shoeVisible));
  }

  function hideLayer() {
    root.hidden = true;
    root.classList.remove(
      "is-visible",
      "is-table",
      "is-caption-visible",
      "is-exiting",
    );
    root.setAttribute("aria-busy", "false");
    experience.classList.remove("is-clay-story-transition");
    if (observePage) observePage.inert = false;
  }

  function finish(reason = "complete") {
    if (
      completing ||
      (state !== "shoe-clay" && state !== "table-clay")
    ) {
      return false;
    }

    completing = true;
    clearTimers();
    root.classList.remove("is-caption-visible");
    root.classList.add("is-exiting");
    root.setAttribute("aria-busy", "false");
    setState("completed");
    announce(
      reason === "skipped"
        ? "已跳过故事过渡，进入袖中捏泥"
        : "故事过渡完成，进入袖中捏泥",
    );

    const complete = onComplete;
    onComplete = null;
    complete?.();
    completing = false;

    if (reason === "skipped") {
      hideLayer();
      return true;
    }

    later(hideLayer, CONFIG.enterCraft);
    return true;
  }

  function start({ onComplete: complete } = {}) {
    if (state === "shoe-clay" || state === "table-clay") return false;
    if (
      window.niRenZhangStory?.getCurrentPage?.() !== "observe" ||
      window.niRenZhangStory?.getObserveScene?.() !== "mockery"
    ) {
      return false;
    }

    clearTimers();
    onComplete = complete;
    completing = false;
    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    root.hidden = false;
    root.classList.remove("is-table", "is-caption-visible", "is-exiting");
    root.setAttribute("aria-busy", "true");
    experience.classList.add("is-clay-story-transition");
    observePage.inert = true;
    setState("shoe-clay");
    window.requestAnimationFrame(() => {
      root.classList.add("is-visible");
      root.focus({ preventScroll: true });
    });
    announce("鞋底取泥，故事随即转到天庆馆桌边");

    later(() => {
      if (state !== "shoe-clay") return;
      root.classList.add("is-caption-visible");
    }, CONFIG.captionDelay);

    later(() => {
      if (state !== "shoe-clay") return;
      root.classList.remove("is-caption-visible");
      setState("table-clay");
      announce("桌边捏泥");
    }, CONFIG.enterShoe + CONFIG.shoeHold);

    later(
      () => finish("complete"),
      CONFIG.enterShoe +
        CONFIG.shoeHold +
        CONFIG.shoeToTable +
        CONFIG.tableHold,
    );
    return true;
  }

  function cancel({ restoreFocus = true } = {}) {
    if (state === "idle" || completing) return false;
    clearTimers();
    onComplete = null;
    setState("idle");
    hideLayer();
    if (
      restoreFocus &&
      previousFocus instanceof HTMLElement &&
      previousFocus.isConnected
    ) {
      previousFocus.focus({ preventScroll: true });
    }
    announce("故事过渡已停止");
    return true;
  }

  async function preload() {
    await Promise.all(
      [shoeImage, tableImage].map(async (image) => {
        try {
          if (image.decode) await image.decode();
        } catch {
          // The browser will still render the image once it finishes loading.
        }
      }),
    );
  }

  skipButton.addEventListener("click", () => finish("skipped"));

  void preload();

  window.ClayStoryTransition = Object.freeze({
    config: CONFIG,
    start,
    cancel,
    finish,
    isRunning: () =>
      state === "shoe-clay" || state === "table-clay",
    getState: () => state,
    getDiagnostics: () => ({
      state,
      running: state === "shoe-clay" || state === "table-clay",
      captionVisible: root.classList.contains("is-caption-visible"),
      shoeOpacity: Number.parseFloat(getComputedStyle(shoeImage).opacity),
      tableOpacity: Number.parseFloat(getComputedStyle(tableImage).opacity),
    }),
  });
})();
