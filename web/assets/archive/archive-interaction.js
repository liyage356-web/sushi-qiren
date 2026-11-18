(function initialiseArchiveInteraction() {
  "use strict";

  const ARCHIVE_STATES = Object.freeze({
    HOME: "HOME",
    ENTERING: "ENTERING",
    CLOSED: "CLOSED",
    UNTYING: "UNTYING",
    OPEN: "OPEN",
    ROTATING: "ROTATING",
    PAPER_SLIDING: "PAPER_SLIDING",
    COMPLETE: "COMPLETE",
  });

  // Deliver one interaction phase at a time. Later-phase code remains in this
  // module so already-approved visuals and animation work are preserved.
  const ARCHIVE_IMPLEMENTATION_STAGE = 4;

  const NEXT_STATE = Object.freeze({
    [ARCHIVE_STATES.HOME]: ARCHIVE_STATES.ENTERING,
    [ARCHIVE_STATES.ENTERING]: ARCHIVE_STATES.CLOSED,
    [ARCHIVE_STATES.CLOSED]: ARCHIVE_STATES.UNTYING,
    [ARCHIVE_STATES.UNTYING]: ARCHIVE_STATES.OPEN,
    [ARCHIVE_STATES.OPEN]: ARCHIVE_STATES.ROTATING,
    [ARCHIVE_STATES.ROTATING]: ARCHIVE_STATES.PAPER_SLIDING,
    [ARCHIVE_STATES.PAPER_SLIDING]: ARCHIVE_STATES.COMPLETE,
    [ARCHIVE_STATES.COMPLETE]: null,
  });

  const HINTS = Object.freeze({
    [ARCHIVE_STATES.HOME]: "",
    [ARCHIVE_STATES.ENTERING]: "入巷 · 奇人档案登场",
    [ARCHIVE_STATES.CLOSED]: "档案落定 · 点击系绳启封",
    [ARCHIVE_STATES.UNTYING]: "纸扣已按下 · 系绳沿双扣逆时针解绕",
    [ARCHIVE_STATES.OPEN]: "封口已展开 · 点击档案袋任意处向右横置",
    [ARCHIVE_STATES.ROTATING]: "案卷横置 · 顺时针 90°",
    [ARCHIVE_STATES.PAPER_SLIDING]: "人物内页 · 正在抽出",
    [ARCHIVE_STATES.COMPLETE]: "案卷已展 · 点击纸张入巷",
  });

  const PAPER_PAGE_HINTS = Object.freeze([
    "卷宗总览 · 轻触纸页继续翻阅",
    "狗不理 · 轻触纸页继续翻阅",
    "黑头 · 轻触纸页继续翻阅",
    "泥人张 · 轻触纸页继续翻阅",
    "俞六 · 再次轻触进入天津老街",
  ]);
  const PAPER_STACK_POSES = Object.freeze([
    Object.freeze({ x: 0, y: 0, rotation: 0 }),
    Object.freeze({ x: -9, y: -7, rotation: -2 }),
    Object.freeze({ x: 7, y: -5, rotation: 1.5 }),
    Object.freeze({ x: -13, y: 4, rotation: -3 }),
    Object.freeze({ x: 4, y: 7, rotation: 2 }),
  ]);
  const HORIZONTAL_ASSET = Object.freeze({
    width: 3352,
    height: 1719,
    coverLeft: 22,
    coverRight: 2419,
    bodyTop: 12,
    bodyBottom: 1631,
    bodyRight: 2675,
  });

  const PHASE_DURATION_MS = Object.freeze({
    ENTERING: 800,
    UNTYING: 4480,
    ROTATING: 900,
    PAPER_SLIDING: 2100,
  });

  // The interval is split into a 0.2 s response, two 1.5 s CCW releases,
  // and a 0.5 s slack/drop. The flap only starts after this parameter is 1.
  const CORD_UNTIE_DURATION = 3.7;
  const TIE_PIVOTS = Object.freeze({
    upper: Object.freeze({ x: 823, y: 270, radius: 84, maskRadius: 77 }),
    lower: Object.freeze({ x: 823, y: 607, radius: 86, maskRadius: 79 }),
  });
  const TIE_ROPE_CONFIGS = Object.freeze([
    Object.freeze({
      firstRelease: 0.054,
      lastRelease: 0.459,
      upperStartAngle: 270,
      upperWrapAngle: 100,
      lowerStartAngle: 300,
      lowerWrapAngle: 260,
      connectorBend: -18,
      tailStart: Object.freeze([1035, 744]),
      untiedUpper: Object.freeze([748, 365]),
      untiedLower: Object.freeze([746, 706]),
      untiedTail: Object.freeze([690, 842]),
      tailBend: -38,
    }),
    Object.freeze({
      firstRelease: 0.459,
      lastRelease: 0.865,
      upperStartAngle: 90,
      upperWrapAngle: 80,
      lowerStartAngle: 240,
      lowerWrapAngle: 280,
      connectorBend: 18,
      tailStart: Object.freeze([925, 790]),
      untiedUpper: Object.freeze([898, 365]),
      untiedLower: Object.freeze([900, 706]),
      untiedTail: Object.freeze([1005, 842]),
      tailBend: 38,
    }),
  ]);
  const TIE_SLACK_START = 0.865;

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function smoothCordStep(value) {
    const clamped = clamp01(value);
    return clamped * clamped * (3 - 2 * clamped);
  }

  function rangeProgress(progress, start, end) {
    if (progress <= start) return 0;
    if (progress >= end) return 1;
    return smoothCordStep((progress - start) / (end - start));
  }

  function pointOnCircle(pivot, radius, angle) {
    const radians = (angle * Math.PI) / 180;
    return [
      pivot.x + Math.cos(radians) * radius,
      pivot.y + Math.sin(radians) * radius,
    ];
  }

  function sampleCordArc(pivot, radius, startAngle, wrapAngle, steps) {
    const points = [];
    for (let index = 0; index <= steps; index += 1) {
      const angle = startAngle - (wrapAngle * index) / steps;
      points.push(pointOnCircle(pivot, radius, angle));
    }
    return points;
  }

  function sampleCordConnector(from, to, bend, steps = 30) {
    const control = [
      (from[0] + to[0]) / 2 + bend,
      (from[1] + to[1]) / 2,
    ];
    const points = [];
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const inverse = 1 - t;
      points.push([
        inverse * inverse * from[0] +
          2 * inverse * t * control[0] +
          t * t * to[0],
        inverse * inverse * from[1] +
          2 * inverse * t * control[1] +
          t * t * to[1],
      ]);
    }
    return points;
  }

  function mixPoint(from, to, amount) {
    return [
      from[0] + (to[0] - from[0]) * amount,
      from[1] + (to[1] - from[1]) * amount,
    ];
  }

  function tieFrameAt(progress) {
    const clamped = clamp01(progress);
    const slack = rangeProgress(clamped, TIE_SLACK_START, 1);
    const ropes = TIE_ROPE_CONFIGS.map((config) => {
      const release = rangeProgress(
        clamped,
        config.firstRelease,
        config.lastRelease,
      );
      // Screen-space angles increase clockwise. Subtracting the travel angle
      // therefore moves every tangency point counter-clockwise around both
      // fasteners. The arc itself continuously contracts on the same frames.
      const travel = -360 * release;
      const upperStartAngle = config.upperStartAngle + travel;
      const lowerStartAngle = config.lowerStartAngle + travel;
      const upperWrapAngle = config.upperWrapAngle * (1 - release);
      const lowerWrapAngle = config.lowerWrapAngle * (1 - release);
      const upperEndAngle = upperStartAngle - upperWrapAngle;
      const lowerEndAngle = lowerStartAngle - lowerWrapAngle;

      let upperEnd = pointOnCircle(
        TIE_PIVOTS.upper,
        TIE_PIVOTS.upper.radius,
        upperEndAngle,
      );
      let lowerStart = pointOnCircle(
        TIE_PIVOTS.lower,
        TIE_PIVOTS.lower.radius,
        lowerStartAngle,
      );
      let lowerEnd = pointOnCircle(
        TIE_PIVOTS.lower,
        TIE_PIVOTS.lower.radius,
        lowerEndAngle,
      );
      const tail = mixPoint(config.tailStart, config.untiedTail, slack);

      if (slack > 0) {
        upperEnd = mixPoint(upperEnd, config.untiedUpper, slack);
        lowerStart = mixPoint(lowerStart, config.untiedLower, slack);
        lowerEnd = mixPoint(lowerEnd, config.untiedLower, slack);
      }

      const upperArc =
        upperWrapAngle > 0.05
          ? sampleCordArc(
              TIE_PIVOTS.upper,
              TIE_PIVOTS.upper.radius,
              upperStartAngle,
              upperWrapAngle,
              34,
            )
          : [upperEnd];
      const connector = sampleCordConnector(
        upperEnd,
        lowerStart,
        config.connectorBend *
          (1 + Math.sin(Math.PI * release) * 1.25 + slack * 0.8),
      );
      const lowerArc =
        lowerWrapAngle > 0.05
          ? sampleCordArc(
              TIE_PIVOTS.lower,
              TIE_PIVOTS.lower.radius,
              lowerStartAngle,
              lowerWrapAngle,
              48,
            )
          : [lowerStart];
      const tailCurve = sampleCordConnector(
        lowerEnd,
        tail,
        config.tailBend * (1 + slack * 0.35),
        22,
      );

      return {
        release,
        travel,
        upperStartAngle,
        lowerStartAngle,
        upperWrapAngle,
        lowerWrapAngle,
        upperEnd,
        lowerStart,
        lowerEnd,
        remainingWrapTurns:
          upperWrapAngle / 360 + lowerWrapAngle / 360,
        points: [...upperArc, ...connector, ...lowerArc, ...tailCurve],
      };
    });
    const stage =
      clamped < TIE_ROPE_CONFIGS[0].firstRelease
        ? "response"
        : clamped < TIE_ROPE_CONFIGS[1].firstRelease
          ? "first-loop"
          : clamped < TIE_SLACK_START
            ? "second-loop"
            : "slack";

    return {
      progress: clamped,
      slack,
      stage,
      ropes,
      remainingWrapTurns: ropes.reduce(
        (total, rope) =>
          total +
          rope.upperWrapAngle / 360 +
          rope.lowerWrapAngle / 360,
        0,
      ),
    };
  }

  function tiePointsToPath(points) {
    const format = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
    let path = `M ${format(points[0])}`;
    for (let index = 1; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const midpoint = [
        (current[0] + next[0]) / 2,
        (current[1] + next[1]) / 2,
      ];
      path += ` Q ${format(current)} ${format(midpoint)}`;
    }
    path += ` L ${format(points[points.length - 1])}`;
    return path;
  }

  class ArchiveInteraction {
    constructor(root) {
      if (!root) throw new Error("Archive interaction root was not found.");
      if (!window.gsap) throw new Error("GSAP must load before archive-interaction.js.");

      this.root = root;
      this.dialog = root.querySelector("#archiveDialog");
      this.canvas = root.querySelector("#archiveCanvas");
      this.object = root.querySelector("#archiveObject");
      this.folder = root.querySelector("#archiveFolder");
      this.bagBack = root.querySelector("#archiveBagBack");
      this.bagBody = root.querySelector(".archive-bag-body");
      this.closedFlap = root.querySelector("#archiveFlapClosed");
      this.openFlap = root.querySelector("#archiveFlapOpen");
      this.upperFastener = root.querySelector("#archiveUpperFastener");
      this.looseCord = root.querySelector("#archiveLooseCord");
      this.tieCord = root.querySelector("#archiveTieCord");
      this.tieShadowPaths = [
        ...this.tieCord.querySelectorAll(
          ".archive-tie-cord-shadow .archive-tie-stroke",
        ),
      ];
      this.tieMainPaths = [
        ...this.tieCord.querySelectorAll(
          ".archive-tie-cord-main .archive-tie-stroke",
        ),
      ];
      this.tieHighlightPaths = [
        ...this.tieCord.querySelectorAll(
          ".archive-tie-cord-highlight .archive-tie-stroke",
        ),
      ];
      this.openThread = root.querySelector("#archiveOpenThread");
      this.openThreadPath = this.openThread.querySelector("path");
      this.fastener = root.querySelector("#archiveFastener");
      this.threadButton = root.querySelector("#archiveThreadButton");
      this.openButton = root.querySelector("#archiveOpenButton");
      this.paperWindow = root.querySelector("#archivePaperWindow");
      this.paperStack = root.querySelector("#archivePaperStack");
      this.paperPages = [...root.querySelectorAll(".archive-paper-sheet")];
      this.contactShadow = root.querySelector("#archiveContactShadow");
      this.horizontalAsset = root.querySelector("#archiveHorizontalAsset");
      this.mouthShadow = root.querySelector("#archiveMouthShadow");
      this.hint = root.querySelector("#archiveHint");
      this.replayButton = root.querySelector("#archiveReplayButton");
      this.closeButton = root.querySelector("#archiveCloseButton");
      this.paperBack = root.querySelector(".paper-sheet-back");
      this.paperMid = root.querySelector(".paper-sheet-mid");
      this.reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

      this.state = ARCHIVE_STATES.HOME;
      this.timeline = null;
      this.currentPaperIndex = 0;
      this.paperTransitioning = false;
      this.paperMotionLayout = null;
      this.tieMotion = { progress: 0 };
      this.tieFrame = null;
      this.mobileQuery = window.matchMedia("(max-width: 760px)");

      this.prepareDom();
      this.bindEvents();
      this.fitCanvas();
    }

    renderTieCord(progress = 0) {
      const frame = tieFrameAt(progress);
      this.tieFrame = frame;
      const [firstPath, secondPath] = frame.ropes.map((rope) =>
        tiePointsToPath(rope.points),
      );
      [...this.tieShadowPaths, ...this.tieMainPaths, ...this.tieHighlightPaths]
        .forEach((path, index) => {
          path.setAttribute("d", index % 2 === 0 ? firstPath : secondPath);
        });
      this.tieCord.dataset.unwindProgress = frame.progress.toFixed(4);
      this.tieCord.dataset.remainingWrapTurns =
        frame.remainingWrapTurns.toFixed(3);
      this.tieCord.dataset.firstCcwTravel =
        frame.ropes[0].travel.toFixed(2);
      this.tieCord.dataset.secondCcwTravel =
        frame.ropes[1].travel.toFixed(2);
      this.tieCord.dataset.firstRemainingTurns =
        frame.ropes[0].remainingWrapTurns.toFixed(4);
      this.tieCord.dataset.secondRemainingTurns =
        frame.ropes[1].remainingWrapTurns.toFixed(4);
      this.tieCord.dataset.unwindStage = frame.stage;
    }

    prepareDom() {
      gsap.set([this.bagBack, this.folder], {
        xPercent: -50,
        yPercent: -50,
        rotation: 0,
        x: 0,
        y: 0,
        scale: 1,
      });
      gsap.set(this.paperStack, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        visibility: "hidden",
        opacity: 0,
      });
      gsap.set(this.mouthShadow, {
        autoAlpha: 0,
      });
      this.layoutPaperPages();

      this.applyStateUI();
    }

    bindEvents() {
      this.threadButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.untie();
      });

      this.openButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.rotate();
      });

      this.paperPages.forEach((page) => {
        page.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.handlePaperClick(Number(page.dataset.paperIndex));
        });
      });

      this.replayButton.addEventListener("click", () => {
        this.replay();
      });

      this.root
        .querySelectorAll("[data-close-archive]")
        .forEach((button) =>
          button.addEventListener("click", () => this.close()),
        );

      this.mobileQuery.addEventListener("change", () => this.fitCanvas());
      window.addEventListener("resize", () => this.fitCanvas(), {
        passive: true,
      });
    }

    duration(milliseconds) {
      return this.reducedMotion.matches ? 0.04 : milliseconds / 1000;
    }

    at(seconds) {
      return this.reducedMotion.matches ? 0 : seconds;
    }

    transition(nextState) {
      if (NEXT_STATE[this.state] !== nextState) {
        throw new Error(
          `Invalid archive transition: ${this.state} -> ${nextState}`,
        );
      }
      this.state = nextState;
      this.applyStateUI();
    }

    applyStateUI() {
      this.root.dataset.archiveState = this.state;
      this.dialog.dataset.archiveState = this.state;

      const isAnimating = [
        ARCHIVE_STATES.ENTERING,
        ARCHIVE_STATES.UNTYING,
        ARCHIVE_STATES.ROTATING,
        ARCHIVE_STATES.PAPER_SLIDING,
      ].includes(this.state);

      this.dialog.setAttribute("aria-busy", String(isAnimating));
      this.hint.textContent =
        this.state === ARCHIVE_STATES.COMPLETE
          ? PAPER_PAGE_HINTS[this.currentPaperIndex]
          : HINTS[this.state];

      this.threadButton.disabled = this.state !== ARCHIVE_STATES.CLOSED;
      this.threadButton.tabIndex =
        this.state === ARCHIVE_STATES.CLOSED ? 0 : -1;

      const canRotate = this.state === ARCHIVE_STATES.OPEN;
      this.openButton.hidden = !canRotate;
      this.openButton.disabled = !canRotate;
      this.openButton.tabIndex = canRotate ? 0 : -1;

      const paperIsVisible = [
        ARCHIVE_STATES.PAPER_SLIDING,
        ARCHIVE_STATES.COMPLETE,
      ].includes(this.state);
      const paperIsInteractive = this.state === ARCHIVE_STATES.COMPLETE;
      this.paperStack.setAttribute(
        "aria-hidden",
        String(!paperIsVisible),
      );
      this.paperWindow.setAttribute("aria-hidden", String(!paperIsVisible));
      this.paperStack.setAttribute(
        "aria-busy",
        String(this.paperTransitioning),
      );
      this.paperPages.forEach((page, index) => {
        const isCurrent = index === this.currentPaperIndex;
        const isReadable = paperIsVisible && isCurrent;
        page.classList.toggle("archive-paper-current", isCurrent);
        page.disabled = !paperIsInteractive || !isCurrent;
        page.tabIndex = paperIsInteractive && isCurrent ? 0 : -1;
        page.setAttribute("aria-hidden", String(!isReadable));
      });
    }

    handlePaperClick(index) {
      if (
        this.state !== ARCHIVE_STATES.COMPLETE ||
        this.paperTransitioning ||
        index !== this.currentPaperIndex
      ) {
        return;
      }

      if (index === this.paperPages.length - 1) {
        document.dispatchEvent(
          new CustomEvent("archive:enter-street", { bubbles: true }),
        );
        return;
      }

      this.turnPaper(index);
    }

    turnPaper(index) {
      const currentPage = this.paperPages[index];
      const nextPage = this.paperPages[index + 1];
      if (!currentPage || !nextPage) return;

      this.paperTransitioning = true;
      this.applyStateUI();
      this.hint.textContent = "纸页翻动 · 下一份人物档案";
      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          gsap.set(currentPage, { autoAlpha: 0 });
          this.currentPaperIndex = index + 1;
          this.paperTransitioning = false;
          this.layoutPaperPages();
          this.applyStateUI();
          window.requestAnimationFrame(() =>
            nextPage.focus({ preventScroll: true }),
          );
        },
      });
      this.timeline = timeline;

      timeline
        .to(currentPage, {
          x: -20,
          y: -14,
          rotation: -1.8,
          scale: 0.996,
          autoAlpha: 0,
          duration: this.duration(420),
          ease: "power2.in",
        });

      this.paperPages.slice(index + 1).forEach((page, offset) => {
        const pose =
          PAPER_STACK_POSES[
            Math.min(offset, PAPER_STACK_POSES.length - 1)
          ];
        timeline.to(
          page,
          {
            x: pose.x,
            y: pose.y,
            rotation: pose.rotation,
            scale: 1,
            duration: this.duration(380),
            ease: "power2.inOut",
          },
          this.at(0.06),
        );
      });
    }

    layoutPaperPages() {
      this.paperPages.forEach((page, index) => {
        const visibleIndex = index - this.currentPaperIndex;
        const pose =
          PAPER_STACK_POSES[
            Math.max(
              0,
              Math.min(visibleIndex, PAPER_STACK_POSES.length - 1),
            )
          ];
        gsap.set(page, {
          zIndex:
            visibleIndex >= 0 ? this.paperPages.length - visibleIndex : 0,
          x: pose.x,
          y: pose.y,
          rotation: pose.rotation,
          scale: 1,
          autoAlpha: visibleIndex < 0 ? 0 : 1,
        });
        page.style.pointerEvents = visibleIndex === 0 ? "auto" : "none";
      });
    }

    getPaperVisualBounds() {
      const visiblePages = this.paperPages
        .filter((page) => page.getClientRects().length > 0)
        .filter((page) => Number(getComputedStyle(page).opacity) > 0.01)
        .map((page) => page.getBoundingClientRect());

      if (!visiblePages.length) {
        return this.paperStack.getBoundingClientRect();
      }

      return {
        left: Math.min(...visiblePages.map((rect) => rect.left)),
        top: Math.min(...visiblePages.map((rect) => rect.top)),
        right: Math.max(...visiblePages.map((rect) => rect.right)),
        bottom: Math.max(...visiblePages.map((rect) => rect.bottom)),
      };
    }

    getLayout() {
      const mobile = this.mobileQuery.matches;
      const canvasRect = this.canvas.getBoundingClientRect();
      const canvasScale = canvasRect.width / this.canvas.offsetWidth;
      const targetDisplayWidth = mobile
        ? Math.min(window.innerWidth * 0.92, window.innerHeight * 0.42, 420)
        : Math.min(window.innerWidth * 0.45, window.innerHeight * 0.8, 640);
      const pairGap = mobile ? 12 : Math.max(6, window.innerWidth * 0.006);
      const openFlapHeight =
        this.openFlap.offsetHeight || this.folder.offsetWidth * (384 / 1656);
      const bagNaturalWidth =
        (this.folder.offsetHeight + openFlapHeight) * canvasScale;
      const finalFolderScale = targetDisplayWidth / bagNaturalWidth;
      const desiredBagCenterX = mobile
        ? window.innerWidth / 2
        : (window.innerWidth - targetDisplayWidth - pairGap) / 2;
      const canvasCenterX = canvasRect.left + canvasRect.width / 2;

      this.finalFolderScale = finalFolderScale;
      this.paperStack.style.width = `${(
        targetDisplayWidth / canvasScale
      ).toFixed(2)}px`;

      return mobile
        ? {
            folderX: (desiredBagCenterX - canvasCenterX) / canvasScale,
            folderY: -520,
            paperFinalX: 0,
            paperFinalY: 0,
            finalFolderScale,
            targetDisplayWidth,
            pairGap,
          }
        : {
            folderX: (desiredBagCenterX - canvasCenterX) / canvasScale,
            folderY: 0,
            paperFinalX: 0,
            paperFinalY: 0,
            finalFolderScale,
            targetDisplayWidth,
            pairGap,
          };
    }

    showHorizontalAsset() {
      const folderRect = this.folder.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();
      const canvasScale = canvasRect.width / this.canvas.offsetWidth;
      const coverWidth =
        HORIZONTAL_ASSET.coverRight - HORIZONTAL_ASSET.coverLeft;
      const desiredAssetWidth =
        (folderRect.width * HORIZONTAL_ASSET.width) / coverWidth;
      const assetWidth = this.mobileQuery.matches
        ? Math.min(desiredAssetWidth, window.innerWidth - 18)
        : desiredAssetWidth;
      const assetHeight =
        (assetWidth * HORIZONTAL_ASSET.height) / HORIZONTAL_ASSET.width;
      const folderCenterX = folderRect.left + folderRect.width / 2;
      const folderCenterY = folderRect.top + folderRect.height / 2;
      const coverCenter =
        (HORIZONTAL_ASSET.coverLeft + HORIZONTAL_ASSET.coverRight) /
        2 /
        HORIZONTAL_ASSET.width;
      const bodyCenter =
        (HORIZONTAL_ASSET.bodyTop + HORIZONTAL_ASSET.bodyBottom) /
        2 /
        HORIZONTAL_ASSET.height;

      const assetLeft =
        this.mobileQuery.matches && assetWidth < desiredAssetWidth
          ? window.innerWidth / 2 - assetWidth / 2
          : folderCenterX - assetWidth * coverCenter;
      this.horizontalAsset.style.left = `${(
        (assetLeft - canvasRect.left) /
        canvasScale
      ).toFixed(2)}px`;
      this.horizontalAsset.style.top = `${(
        (folderCenterY - assetHeight * bodyCenter - canvasRect.top) /
        canvasScale
      ).toFixed(2)}px`;
      this.horizontalAsset.style.width = `${(assetWidth / canvasScale).toFixed(
        2,
      )}px`;
      this.horizontalAsset.style.height = `${(
        assetHeight / canvasScale
      ).toFixed(2)}px`;
      this.horizontalAsset.dataset.sourceBounds =
        `${HORIZONTAL_ASSET.coverLeft},${HORIZONTAL_ASSET.coverRight},` +
        `${HORIZONTAL_ASSET.bodyTop},${HORIZONTAL_ASSET.bodyBottom}`;
      this.horizontalAsset.setAttribute("aria-hidden", "false");
      this.canvas.classList.add("archive-horizontal-final");
    }

    getHorizontalBagBounds() {
      const assetRect = this.horizontalAsset.getBoundingClientRect();
      return {
        left:
          assetRect.left +
          assetRect.width * (HORIZONTAL_ASSET.coverLeft / HORIZONTAL_ASSET.width),
        top:
          assetRect.top +
          assetRect.height * (HORIZONTAL_ASSET.bodyTop / HORIZONTAL_ASSET.height),
        right:
          assetRect.left +
          assetRect.width *
            (HORIZONTAL_ASSET.bodyRight / HORIZONTAL_ASSET.width),
        bottom:
          assetRect.top +
          assetRect.height *
            (HORIZONTAL_ASSET.bodyBottom / HORIZONTAL_ASSET.height),
      };
    }

    measurePaperMotionLayout(layout) {
      const canvasRect = this.canvas.getBoundingClientRect();
      const folderRect = this.folder.getBoundingClientRect();
      const canvasScale = canvasRect.width / this.canvas.offsetWidth;
      // The sheet exits after the complete bag body's right edge. The supplied
      // foreground artwork hides the pocket and the rope remains above it.
      const bagBounds = this.getHorizontalBagBounds();
      const mouthRight = bagBounds.right;
      const bagDisplayWidth = folderRect.width;

      // Match the sheet to the main paper-bag body, excluding the open flap
      // projection. This keeps the page inside the bag's actual width.
      this.paperStack.style.width = `${(bagDisplayWidth / canvasScale).toFixed(
        2,
      )}px`;

      // The paper is a sibling behind the complete Figma bag-front layer.
      // Measure its real final box so the mouth-relative travel follows the
      // responsive folder transform instead of relying on viewport guesses.
      gsap.set(this.paperStack, {
        visibility: "visible",
        opacity: 1,
        x: layout.paperFinalX,
        y: layout.paperFinalY,
        rotation: 0,
        scale: 1,
      });

      const paperRect = this.paperStack.getBoundingClientRect();
      const paperBoundsAtOrigin = this.getPaperVisualBounds();
      const mouthGap = Math.max(5, Math.min(11, paperRect.width * 0.014));
      const pocketInset = Math.max(
        2,
        Math.min(3, paperRect.width * 0.006),
      );
      const readerWidth = Math.min(
        this.mobileQuery.matches
          ? window.innerWidth - 24
          : window.innerWidth * 0.82,
        (window.innerHeight - 140) * 1.5,
        1040,
      );
      const readerScale = readerWidth / paperRect.width;
      const finalDelta =
        (mouthRight + mouthGap - paperBoundsAtOrigin.left) / canvasScale;
      const paperFinalX = layout.paperFinalX + finalDelta;
      const paperStartX =
        layout.paperFinalX +
        (mouthRight -
          pocketInset -
          paperBoundsAtOrigin.right) /
          canvasScale;
      const bagCenterY = (bagBounds.top + bagBounds.bottom) / 2;
      const paperCenterY =
        (paperBoundsAtOrigin.top + paperBoundsAtOrigin.bottom) / 2;
      const paperStartY =
        layout.paperFinalY + (bagCenterY - paperCenterY) / canvasScale;

      gsap.set(this.paperStack, {
        x: paperStartX,
        y: paperStartY,
      });

      const paperWindowRect = this.paperWindow.getBoundingClientRect();
      const paperWindowScale =
        paperWindowRect.width / this.paperWindow.offsetWidth;
      const mouthLocalX =
        (mouthRight - paperWindowRect.left) / paperWindowScale;
      const mouthLocalTop = Math.max(
        0,
        (bagBounds.top - paperWindowRect.top) / paperWindowScale + 1,
      );
      const mouthLocalBottom = Math.max(
        0,
        (paperWindowRect.bottom - bagBounds.bottom) / paperWindowScale + 1,
      );
      const formatClipInset = (value) =>
        value <= 0 ? "0px" : `${value.toFixed(2)}px`;
      const pocketClip =
        `inset(${formatClipInset(mouthLocalTop)} 0px ` +
        `${formatClipInset(mouthLocalBottom)} ${mouthLocalX.toFixed(2)}px)`;
      this.paperWindow.style.clipPath = pocketClip;
      this.paperWindow.dataset.paperPocketClip = pocketClip;
      this.paperWindow.dataset.paperMouthX = mouthLocalX.toFixed(2);

      const startBounds = this.getPaperVisualBounds();
      const mouthX = (mouthRight - canvasRect.left) / canvasScale;
      const paperTop = (startBounds.top - canvasRect.top) / canvasScale;
      const paperHeight = (startBounds.bottom - startBounds.top) / canvasScale;
      this.contactShadow.style.left = `${mouthX - 7}px`;
      this.contactShadow.style.top = `${paperTop}px`;
      this.contactShadow.style.height = `${paperHeight}px`;

      return {
        ...layout,
        paperStartX,
        paperStartY,
        paperFinalX,
        paperFinalY: layout.paperFinalY,
        paperBaseWidth:
          Number.parseFloat(this.paperStack.style.width) ||
          this.paperStack.offsetWidth,
        mouthX,
        paperTop,
        paperHeight,
        readerScale,
      };
    }

    settlePaperStackForReading() {
      const layout = this.paperMotionLayout;
      if (!layout?.paperBaseWidth || !layout?.readerScale) return;

      this.paperStack.style.width = `${(
        layout.paperBaseWidth * layout.readerScale
      ).toFixed(2)}px`;
      gsap.set(this.paperStack, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        filter: "none",
      });
      this.paperWindow.style.clipPath = "none";
      delete this.paperWindow.dataset.paperPocketClip;
      this.canvas.classList.remove("archive-paper-extracting");
      this.canvas.classList.add("archive-paper-settled");
    }

    fitCanvas() {
      const mobile = this.mobileQuery.matches;
      const width = mobile ? 720 : 1480;
      const height = mobile ? 980 : 720;
      const horizontalSpace = window.innerWidth - (mobile ? 18 : 72);
      const verticalSpace = window.innerHeight - (mobile ? 150 : 150);
      const scale = Math.max(
        0.22,
        Math.min(horizontalSpace / width, verticalSpace / height, 1.24),
      );

      this.canvas.style.setProperty("--archive-scale", scale.toFixed(4));
      const cssFolderWidth = mobile
        ? Math.min(window.innerWidth * 0.78, 300)
        : Math.min(window.innerWidth * 0.29, window.innerHeight * 0.43, 430);
      const folderAspect = 1656 / 2276;
      const targetDisplayWidth = Math.min(
        window.innerWidth * (mobile ? 0.86 : 0.36),
        window.innerHeight * (mobile ? 0.64 : 0.84) * folderAspect,
      );

      this.closedFolderScale = targetDisplayWidth / (cssFolderWidth * scale);
      this.openFolderScale = this.closedFolderScale * 0.85;
      this.openFolderY = cssFolderWidth * this.openFolderScale * 0.1312;
      this.finalFolderScale = 0.8;

      if (this.state === ARCHIVE_STATES.COMPLETE) {
        const layout = this.getLayout();
        gsap.set([this.bagBack, this.folder], {
          rotation: 90,
          x: layout.folderX,
          y: layout.folderY,
          scale: layout.finalFolderScale,
        });
        this.showHorizontalAsset();
        const paperLayout = this.measurePaperMotionLayout(layout);
        this.paperMotionLayout = paperLayout;
        this.canvas.classList.add("archive-paper-reading");
        gsap.set(this.paperStack, { visibility: "visible", opacity: 1 });
        this.settlePaperStackForReading();
      } else if (this.state === ARCHIVE_STATES.OPEN) {
        gsap.set([this.bagBack, this.folder], {
          x: 0,
          y: this.openFolderY,
          scale: this.openFolderScale,
        });
      } else if (this.state === ARCHIVE_STATES.CLOSED) {
        gsap.set([this.bagBack, this.folder], {
          scale: this.closedFolderScale,
        });
      }
    }

    resetVisuals() {
      this.killTimeline();
      this.currentPaperIndex = 0;
      this.paperTransitioning = false;
      this.paperMotionLayout = null;
      this.canvas.classList.remove("archive-paper-presented");
      this.canvas.classList.remove("archive-paper-reading");
      this.canvas.classList.remove("archive-paper-settled");
      this.canvas.classList.remove("archive-paper-extracting");
      this.canvas.classList.remove("archive-horizontal-final");
      this.horizontalAsset.setAttribute("aria-hidden", "true");

      gsap.set(this.root.querySelector(".archive-backdrop"), { opacity: 0 });
      gsap.set(this.object, {
        opacity: 0,
        scale: 0.65,
        y: 12,
        rotation: -0.35,
        transformOrigin: "50% 50%",
      });
      gsap.set([this.bagBack, this.folder], {
        rotation: 0,
        x: 0,
        y: 0,
        scale: this.closedFolderScale || 1,
      });
      gsap.set(this.bagBody, {
        autoAlpha: 1,
      });
      gsap.set(this.closedFlap, {
        autoAlpha: 1,
        rotationY: 0,
        rotationX: 0,
        yPercent: 0,
        scaleY: 1,
        transformPerspective: 1500,
      });
      gsap.set(this.openFlap, {
        autoAlpha: 0,
        rotationX: 8,
        yPercent: 20,
        scaleY: 0.35,
        transformOrigin: "50% 100%",
        transformPerspective: 1500,
      });
      this.tieMotion.progress = 0;
      this.renderTieCord(0);
      gsap.set(this.tieCord, {
        autoAlpha: 1,
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
      });
      gsap.set(this.upperFastener, {
        autoAlpha: 1,
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
      });
      gsap.set(this.looseCord, {
        autoAlpha: 1,
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      });
      gsap.set(this.openThread, {
        autoAlpha: 0,
        yPercent: 8,
        rotation: -2,
      });
      gsap.set(this.openThreadPath, {
        strokeDashoffset: 1,
      });
      gsap.set(this.fastener, {
        autoAlpha: 0,
        scale: 0.82,
      });
      gsap.set(this.threadButton, {
        autoAlpha: 1,
        rotation: 0,
        scale: 1,
      });
      gsap.set(this.paperStack, {
        visibility: "hidden",
        opacity: 0,
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
      });
      this.paperWindow.style.clipPath = "none";
      delete this.paperWindow.dataset.paperPocketClip;
      gsap.set(this.contactShadow, {
        autoAlpha: 0,
        scaleX: 1,
      });
      gsap.set(this.paperBack, { x: 15, y: 12, rotation: -0.7, opacity: 0.92 });
      gsap.set(this.paperMid, { x: 8, y: 7, rotation: -0.3, opacity: 0.96 });
      this.layoutPaperPages();
      gsap.set(this.hint, { opacity: 1 });
    }

    open({ pushHistory = true } = {}) {
      if (this.state !== ARCHIVE_STATES.HOME) return;

      this.resetVisuals();
      this.root.hidden = false;
      this.root.dataset.archiveImplementationStage = String(
        ARCHIVE_IMPLEMENTATION_STAGE,
      );
      this.transition(ARCHIVE_STATES.ENTERING);

      if (pushHistory) {
        history.pushState({ view: "archive" }, "", "#archive");
      }

      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          if (this.state !== ARCHIVE_STATES.ENTERING) return;
          this.transition(ARCHIVE_STATES.CLOSED);
          window.requestAnimationFrame(() =>
            this.threadButton.focus({ preventScroll: true }),
          );
        },
      });
      this.timeline = timeline;

      const backdrop = this.root.querySelector(".archive-backdrop");
      timeline
        .to(
          backdrop,
          {
            opacity: 1,
            duration: this.duration(480),
            ease: "power2.out",
          },
          this.at(0),
        )
        .to(
          this.object,
          {
            opacity: 1,
            y: -5,
            scale: 1.04,
            duration: this.duration(390),
            ease: "power3.out",
          },
          this.at(0.04),
        )
        .to(
          this.object,
          {
            y: 2,
            scale: 0.988,
            duration: this.duration(110),
            ease: "sine.inOut",
          },
          this.at(0.43),
        )
        .to(
          this.object,
          {
            scale: 1,
            y: 0,
            rotation: 0,
            duration: this.duration(210),
            ease: "back.out(1.5)",
          },
          this.at(0.54),
        )
        .fromTo(
          this.hint,
          { opacity: 0 },
          {
            opacity: 1,
            duration: this.duration(260),
            ease: "power1.out",
          },
          this.at(0.42),
        );
    }

    untie() {
      if (this.state !== ARCHIVE_STATES.CLOSED) return;
      if (ARCHIVE_IMPLEMENTATION_STAGE < 2) {
        this.root.dataset.archiveCordState = "waiting-for-stage-2";
        document.dispatchEvent(
          new CustomEvent("archive:stage-one-cord-click", {
            bubbles: true,
          }),
        );
        return;
      }
      this.transition(ARCHIVE_STATES.UNTYING);
      this.tieMotion.progress = 0;
      this.renderTieCord(0);

      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          if (this.state !== ARCHIVE_STATES.UNTYING) return;
          gsap.set(this.closedFlap, {
            autoAlpha: 0,
            rotationX: -74,
            yPercent: -11,
            scaleY: 0.88,
          });
          gsap.set(this.openFlap, {
            autoAlpha: 1,
            rotationX: 0,
            yPercent: 0,
            scaleY: 1,
          });
          gsap.set(this.looseCord, {
            autoAlpha: 0,
            xPercent: 22,
            yPercent: 24,
            rotation: 8,
          });
          gsap.set(this.openThread, {
            autoAlpha: 1,
            yPercent: 0,
            rotation: 0,
          });
          gsap.set(this.openThreadPath, {
            strokeDashoffset: 0,
          });
          gsap.set(this.fastener, { autoAlpha: 1, scale: 1 });
          gsap.set(this.threadButton, { autoAlpha: 0 });
          gsap.set(this.tieCord, { autoAlpha: 0 });
          gsap.set(this.looseCord, { autoAlpha: 0 });
          gsap.set(this.upperFastener, { autoAlpha: 0 });
          gsap.set([this.bagBack, this.folder], {
            x: 0,
            y: this.openFolderY,
            scale: this.openFolderScale,
          });
          this.transition(ARCHIVE_STATES.OPEN);
          window.requestAnimationFrame(() =>
            this.openButton.focus({ preventScroll: true }),
          );
        },
      });
      this.timeline = timeline;

      timeline
        .to(
          this.tieMotion,
          {
            progress: 1,
            duration: this.duration(CORD_UNTIE_DURATION * 1000),
            ease: "none",
            onUpdate: () => this.renderTieCord(this.tieMotion.progress),
          },
          this.at(0),
        )
        .to(
          this.looseCord,
          {
            scaleX: 1.035,
            scaleY: 0.86,
            y: 2.2,
            duration: this.duration(80),
            ease: "power2.in",
          },
          this.at(0),
        )
        .to(
          this.looseCord,
          {
            scaleX: 1,
            scaleY: 1,
            y: 0,
            duration: this.duration(120),
            ease: "back.out(2.4)",
          },
          this.at(0.08),
        )
        .call(
          () => {
            this.hint.textContent = "第一圈 · 沿双扣逆时针解绕";
          },
          null,
          this.at(0.2),
        )
        .call(
          () => {
            this.hint.textContent = "第二圈 · 沿双扣逆时针解绕";
          },
          null,
          this.at(1.7),
        )
        .call(
          () => {
            this.hint.textContent = "两圈已解 · 系绳松脱垂落";
          },
          null,
          this.at(3.2),
        )
        .to(
          this.tieCord,
          {
            y: 430,
            duration: this.duration(430),
            ease: "power2.in",
          },
          this.at(CORD_UNTIE_DURATION),
        )
        .to(
          this.closedFlap,
          {
            rotationX: -74,
            yPercent: -11,
            scaleY: 0.88,
            duration: this.duration(540),
            ease: "power3.inOut",
          },
          this.at(CORD_UNTIE_DURATION),
        )
        .to(
          this.openFlap,
          {
            autoAlpha: 1,
            rotationX: 0,
            yPercent: 0,
            scaleY: 1,
            duration: this.duration(480),
            ease: "power3.inOut",
          },
          this.at(CORD_UNTIE_DURATION + 0.04),
        )
        .to(
          [this.bagBack, this.folder],
          {
            scale: this.openFolderScale * 1.012,
            y: this.openFolderY,
            duration: this.duration(540),
            ease: "power2.out",
          },
          this.at(CORD_UNTIE_DURATION),
        )
        .to(
          [this.bagBack, this.folder],
          {
            scale: this.openFolderScale,
            y: this.openFolderY,
            duration: this.duration(120),
            ease: "power2.out",
          },
          this.at(CORD_UNTIE_DURATION + 0.54),
        )
        .fromTo(
          this.openThread,
          { autoAlpha: 0, yPercent: 8, rotation: -2 },
          {
            autoAlpha: 1,
            yPercent: 0,
            rotation: 0,
            duration: this.duration(380),
            ease: "power2.out",
          },
          this.at(CORD_UNTIE_DURATION + 0.12),
        )
        .fromTo(
          this.openThreadPath,
          { strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            duration: this.duration(660),
            ease: "power2.inOut",
          },
          this.at(CORD_UNTIE_DURATION + 0.12),
        )
        .to(
          this.closedFlap,
          {
            autoAlpha: 0,
            duration: this.duration(120),
            ease: "none",
          },
          this.at(CORD_UNTIE_DURATION + 0.51),
        )
        .fromTo(
          this.fastener,
          { autoAlpha: 0, scale: 0.82 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: this.duration(140),
            ease: "power1.out",
          },
          this.at(CORD_UNTIE_DURATION + 0.52),
        );

      const debugProgressParam = new URLSearchParams(
        window.location.search,
      ).get("cordProgress");
      if (debugProgressParam !== null) {
        const debugProgress = Number(debugProgressParam);
        if (
          Number.isFinite(debugProgress) &&
          debugProgress >= 0 &&
          debugProgress <= 1
        ) {
          timeline.pause(CORD_UNTIE_DURATION * debugProgress);
        }
      }
    }

    rotate() {
      if (this.state !== ARCHIVE_STATES.OPEN) return;
      this.transition(ARCHIVE_STATES.ROTATING);

      const layout = this.getLayout();
      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          if (this.state !== ARCHIVE_STATES.ROTATING) return;
          this.showHorizontalAsset();
          this.transition(ARCHIVE_STATES.PAPER_SLIDING);
          this.slidePaper();
        },
      });
      this.timeline = timeline;

      timeline
        .to(
          this.openThread,
          {
            autoAlpha: 0,
            duration: this.duration(220),
            ease: "power1.out",
          },
          this.at(0),
        )
        .to(
          [this.bagBack, this.folder],
          {
            rotation: 90,
            x: layout.folderX,
            y: layout.folderY,
            scale: layout.finalFolderScale,
            duration: this.duration(900),
            ease: "power3.inOut",
          },
          this.at(0),
        );
    }

    slidePaper() {
      if (this.state !== ARCHIVE_STATES.PAPER_SLIDING) return;

      const layout = this.measurePaperMotionLayout(this.getLayout());
      this.paperMotionLayout = layout;
      this.canvas.classList.remove("archive-paper-settled");
      this.canvas.classList.add("archive-paper-extracting");
      gsap.set(this.paperStack, {
        visibility: "visible",
        opacity: 1,
        x: layout.paperStartX,
        y: layout.paperStartY - 1.2,
        rotation: 0,
        scale: 1,
        filter: "none",
      });
      gsap.set(this.contactShadow, {
        autoAlpha: 0.72,
        scaleX: 1,
        transformOrigin: "0 50%",
      });
      gsap.set(this.mouthShadow, {
        autoAlpha: 0.3,
        scaleY: 1,
      });
      gsap.set(this.paperBack, {
        x: 15,
        y: 12,
        rotation: -0.7,
        opacity: 0.92,
      });
      gsap.set(this.paperMid, {
        x: 8,
        y: 7,
        rotation: -0.3,
        opacity: 0.96,
      });

      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          if (this.state !== ARCHIVE_STATES.PAPER_SLIDING) return;
          this.settlePaperStackForReading();
          this.transition(ARCHIVE_STATES.COMPLETE);
          window.requestAnimationFrame(() =>
            this.paperPages[this.currentPaperIndex].focus({
              preventScroll: true,
            }),
          );
        },
      });
      this.timeline = timeline;

      timeline
        .to(
          this.paperStack,
          {
            x: layout.paperFinalX,
            duration: this.duration(1550),
            ease: "power2.inOut",
          },
          this.at(0),
        )
        .to(
          this.paperStack,
          {
            filter: "drop-shadow(-6px 10px 14px rgba(13, 10, 6, 0.24))",
            duration: this.duration(280),
            ease: "power1.out",
          },
          this.at(0.08),
        )
        .to(
          this.paperStack,
          {
            y: layout.paperStartY + 1.2,
            duration: this.duration(790),
            ease: "sine.inOut",
          },
          this.at(0),
        )
        .to(
          this.paperStack,
          {
            y: layout.paperStartY,
            duration: this.duration(760),
            ease: "sine.out",
          },
          this.at(0.79),
        )
        .to(
          this.contactShadow,
          {
            autoAlpha: 0.42,
            scaleX: 0.82,
            duration: this.duration(1120),
            ease: "power2.out",
          },
          this.at(0),
        )
        .to(
          this.contactShadow,
          {
            autoAlpha: 0,
            scaleX: 0.65,
            duration: this.duration(350),
            ease: "power1.out",
          },
          this.at(1.2),
        )
        .to(
          this.mouthShadow,
          {
            autoAlpha: 0.12,
            scaleY: 0.76,
            duration: this.duration(1550),
            ease: "power2.out",
          },
          this.at(0),
        )
        .to(
          this.paperBack,
          {
            x: 3,
            y: 2,
            rotation: 0,
            duration: this.duration(1550),
            ease: "power2.inOut",
          },
          this.at(0),
        )
        .to(
          this.paperMid,
          {
            x: 1,
            y: 1,
            rotation: 0,
            duration: this.duration(1550),
            ease: "power2.inOut",
          },
          this.at(0),
        )
        .call(
          () => {
            this.canvas.classList.remove("archive-paper-extracting");
            this.canvas.classList.add("archive-paper-presented");
            this.canvas.classList.add("archive-paper-reading");
            this.hint.textContent = "人物内页 · 移至阅读区";
          },
          null,
          this.at(1.55),
        )
        .to(
          this.paperStack,
          {
            x: 0,
            y: layout.paperFinalY,
            scale: layout.readerScale,
            filter: "drop-shadow(0 28px 46px rgba(13, 10, 6, 0.38))",
            duration: this.duration(550),
            ease: "power2.inOut",
          },
          this.at(1.55),
        )
        .to(
          this.mouthShadow,
          {
            autoAlpha: 0,
            duration: this.duration(180),
            ease: "power1.out",
          },
          this.at(1.37),
        );

      const debugProgressParam = new URLSearchParams(
        window.location.search,
      ).get("paperProgress");
      if (debugProgressParam !== null) {
        const debugProgress = Number(debugProgressParam);
        if (
          Number.isFinite(debugProgress) &&
          debugProgress >= 0 &&
          debugProgress <= 1
        ) {
          timeline.pause(this.duration(1550) * debugProgress);
        }
      }
    }

    replay() {
      this.killTimeline();
      this.state = ARCHIVE_STATES.HOME;
      this.resetVisuals();
      this.fitCanvas();
      this.open({ pushHistory: false });
    }

    close({ pushHistory = true } = {}) {
      if (this.root.hidden) return;
      this.killTimeline();
      this.root.hidden = true;
      this.state = ARCHIVE_STATES.HOME;
      this.applyStateUI();
      this.resetVisuals();

      if (pushHistory) {
        history.pushState({ view: "home" }, "", "#home");
      }

      const entryButton = document.querySelector("#enterButton");
      if (entryButton instanceof HTMLElement) {
        entryButton.focus({ preventScroll: true });
      }
    }

    resetForFreshLoad() {
      this.killTimeline();
      this.root.hidden = true;
      this.state = ARCHIVE_STATES.HOME;
      this.applyStateUI();
      this.resetVisuals();
    }

    killTimeline() {
      if (this.timeline) {
        this.timeline.kill();
        this.timeline = null;
      }
      gsap.killTweensOf([
        this.object,
        this.folder,
        this.bagBack,
        this.bagBody,
        this.closedFlap,
        this.openFlap,
        this.upperFastener,
        this.looseCord,
        this.tieCord,
        this.tieMotion,
        this.openThread,
        this.openThreadPath,
        this.fastener,
        this.threadButton,
        this.paperWindow,
        this.paperStack,
        this.mouthShadow,
        ...this.paperPages,
        this.paperBack,
        this.paperMid,
        this.contactShadow,
        this.hint,
        this.root.querySelector(".archive-backdrop"),
      ]);
    }

    getFocusableElements() {
      return [
        ...this.root.querySelectorAll(
          "button:not([disabled]):not([hidden])",
        ),
      ].filter((button) => button.getClientRects().length > 0);
    }
  }

  const root = document.querySelector("#archiveModal");
  const instance = new ArchiveInteraction(root);
  instance.resetForFreshLoad();
  window.archiveExperience = instance;
  window.ARCHIVE_STATES = ARCHIVE_STATES;
})();
