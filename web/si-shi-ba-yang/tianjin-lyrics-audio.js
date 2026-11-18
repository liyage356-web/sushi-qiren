(() => {
  "use strict";

  const DEFAULT_ROOT =
    "../../public/assets/forty-eight/tianjin-lyrics/audio/";
  const DEFAULT_LINE_FILES = Object.freeze([
    "tianjin-line-01.mp3",
    "tianjin-line-02.mp3",
    "tianjin-line-03.mp3",
    "tianjin-line-04.mp3",
    "tianjin-line-05.mp3",
    "tianjin-line-06.mp3",
  ]);
  const DEFAULT_CUE_FILES = Object.freeze({
    laugh: "crowd-laugh.mp3",
    cheer: "crowd-cheer.mp3",
  });

  function clampVolume(value) {
    return Math.max(0, Math.min(1, Number(value)));
  }

  class TianjinLyricsAudio {
    constructor(options = {}) {
      this.root = options.root ?? DEFAULT_ROOT;
      this.lineFiles = [...(options.lineFiles || DEFAULT_LINE_FILES)];
      this.cueFiles = { ...DEFAULT_CUE_FILES, ...(options.cueFiles || {}) };
      this.volume = clampVolume(options.volume ?? 0.9);
      this.muted = false;
      this.currentIndex = null;
      this.lastIndex = null;
      this.state = "idle";
      this.handlers = null;
      this.lineAudios = new Map();
      this.cueAudio = null;
      this.cueName = null;
      this.cueHandlers = null;
      this.destroyed = false;
      this.leaveController = new AbortController();
      this.onLeave = options.onLeave || null;

      window.addEventListener(
        "pagehide",
        () => this.stopFromLifecycle("pagehide"),
        { signal: this.leaveController.signal },
      );
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.visibilityState === "hidden") {
            this.stopFromLifecycle("hidden");
          }
        },
        { signal: this.leaveController.signal },
      );
    }

    sourceFor(index) {
      const file = this.lineFiles[index];
      return file ? `${this.root}${file}` : "";
    }

    cueSourceFor(name) {
      const file = this.cueFiles[name];
      return file ? `${this.root}${file}` : "";
    }

    ensureLineAudio(index) {
      if (this.lineAudios.has(index)) return this.lineAudios.get(index);
      const audio = new Audio();
      audio.preload = "none";
      audio.volume = this.volume;
      audio.muted = this.muted;
      audio.src = this.sourceFor(index);

      audio.onplay = () => {
        if (this.currentIndex !== index) return;
        this.state = "playing";
        this.handlers?.onStart?.({
          index,
          duration: Number.isFinite(audio.duration) ? audio.duration : null,
        });
      };
      audio.onloadedmetadata = () => {
        if (this.currentIndex !== index) return;
        this.handlers?.onDuration?.({
          index,
          duration: Number.isFinite(audio.duration) ? audio.duration : null,
        });
      };
      audio.onended = () => {
        if (this.currentIndex !== index) return;
        this.state = "ended";
        const handlers = this.handlers;
        this.currentIndex = null;
        this.handlers = null;
        audio.currentTime = 0;
        handlers?.onEnded?.({ index });
      };
      audio.onerror = () => {
        if (this.currentIndex !== index) return;
        this.failCurrent(index);
      };

      this.lineAudios.set(index, audio);
      return audio;
    }

    failCurrent(index) {
      if (this.currentIndex !== index) return;
      const handlers = this.handlers;
      this.state = "error";
      this.currentIndex = null;
      this.handlers = null;
      handlers?.onError?.({
        index,
        source: this.sourceFor(index),
        message: "天津话录音未能加载",
      });
    }

    async playLine(index, handlers = {}) {
      if (
        this.destroyed ||
        !Number.isInteger(index) ||
        !this.lineFiles[index]
      ) {
        return false;
      }

      const audio = this.ensureLineAudio(index);
      if (this.currentIndex === index && !audio.paused) return true;
      if (this.currentIndex === index && audio.paused) {
        this.handlers = handlers;
        this.state = "loading";
        try {
          await audio.play();
          return true;
        } catch {
          this.failCurrent(index);
          return false;
        }
      }

      this.stopCue();
      this.stopLine();
      this.currentIndex = index;
      this.lastIndex = index;
      this.handlers = handlers;
      this.state = "loading";
      audio.currentTime = 0;
      audio.volume = this.volume;
      audio.muted = this.muted;

      try {
        await audio.play();
        return true;
      } catch {
        this.failCurrent(index);
        return false;
      }
    }

    pauseLine() {
      if (this.currentIndex === null) return false;
      const audio = this.lineAudios.get(this.currentIndex);
      if (!audio || audio.paused) return false;
      audio.pause();
      this.state = "paused";
      this.handlers?.onPause?.({ index: this.currentIndex });
      return true;
    }

    resumeLine(handlers = this.handlers || {}) {
      if (this.currentIndex === null) {
        if (this.lastIndex === null) return Promise.resolve(false);
        return this.playLine(this.lastIndex, handlers);
      }
      const audio = this.lineAudios.get(this.currentIndex);
      if (!audio?.paused) return Promise.resolve(true);
      this.handlers = handlers;
      this.state = "loading";
      return audio.play().then(
        () => true,
        () => {
          this.failCurrent(this.currentIndex);
          return false;
        },
      );
    }

    replayLine(index, handlers = {}) {
      this.stopLine();
      return this.playLine(index, handlers);
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      this.lineAudios.forEach((audio) => {
        audio.muted = this.muted;
      });
      if (this.cueAudio) this.cueAudio.muted = this.muted;
      return this.muted;
    }

    setVolume(volume) {
      this.volume = clampVolume(volume);
      this.lineAudios.forEach((audio) => {
        audio.volume = this.volume;
      });
      if (this.cueAudio) this.cueAudio.volume = this.volume;
      return this.volume;
    }

    stopLine() {
      if (this.currentIndex === null) return;
      const audio = this.lineAudios.get(this.currentIndex);
      if (!audio) return;
      this.currentIndex = null;
      this.handlers = null;
      this.state = "stopped";
      audio.pause();
      audio.currentTime = 0;
    }

    async playCue(name, handlers = {}) {
      const source = this.cueSourceFor(name);
      if (this.destroyed || !source) return false;
      this.stopLine();
      this.stopCue();
      const audio = new Audio();
      audio.preload = "none";
      audio.volume = this.volume;
      audio.muted = this.muted;
      audio.src = source;
      this.cueAudio = audio;
      this.cueName = name;
      this.cueHandlers = handlers;
      let failed = false;
      audio.onended = () => {
        if (this.cueAudio !== audio) return;
        this.cueAudio = null;
        this.cueName = null;
        this.cueHandlers = null;
        handlers.onEnded?.({ name });
      };
      audio.onerror = () => {
        if (failed || this.cueAudio !== audio) return;
        failed = true;
        this.cueAudio = null;
        this.cueName = null;
        this.cueHandlers = null;
        handlers.onError?.({ name, source });
      };
      try {
        await audio.play();
        return true;
      } catch {
        if (!failed) {
          this.cueAudio = null;
          this.cueName = null;
          this.cueHandlers = null;
          handlers.onError?.({ name, source });
        }
        return false;
      }
    }

    stopCue() {
      if (!this.cueAudio) return;
      const audio = this.cueAudio;
      this.cueAudio = null;
      this.cueName = null;
      this.cueHandlers = null;
      audio.pause();
      audio.currentTime = 0;
    }

    stopAll(reason = "manual") {
      this.stopLine();
      this.stopCue();
      this.state = "idle";
      if (reason !== "manual") this.onLeave?.(reason);
    }

    stopFromLifecycle(reason) {
      this.stopAll(reason);
    }

    getSnapshot() {
      const audio =
        this.currentIndex === null
          ? null
          : this.lineAudios.get(this.currentIndex);
      return {
        state: this.state,
        currentIndex: this.currentIndex,
        currentSource:
          this.currentIndex === null
            ? ""
            : this.sourceFor(this.currentIndex),
        paused: audio?.paused ?? true,
        currentTime: audio?.currentTime ?? 0,
        duration:
          audio && Number.isFinite(audio.duration) ? audio.duration : null,
        muted: this.muted,
        volume: this.volume,
        cueName: this.cueName,
        playingAudioCount: [...this.lineAudios.values()].filter(
          (audio) => !audio.paused,
        ).length + (this.cueAudio && !this.cueAudio.paused ? 1 : 0),
      };
    }

    destroy() {
      if (this.destroyed) return;
      this.stopAll("destroy");
      this.destroyed = true;
      this.leaveController.abort();
      this.lineAudios.forEach((audio) => {
        audio.onplay = null;
        audio.onloadedmetadata = null;
        audio.onended = null;
        audio.onerror = null;
        audio.removeAttribute("src");
        audio.load();
      });
      this.lineAudios.clear();
    }
  }

  window.TianjinLyricsAudio = TianjinLyricsAudio;
  window.TIANJIN_LYRICS_AUDIO_FILES = DEFAULT_LINE_FILES;
  window.TIANJIN_LYRICS_CUE_FILES = DEFAULT_CUE_FILES;
})();
