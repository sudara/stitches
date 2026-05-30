import NodePool from "./node_pool.js"
import PlaybackController from "./playback_controller.js"

// Queue-driven, imperative, app-wide player. The app builds the queue from the
// DOM at click time and drives this facade; stitches owns playback. Built on
// the same PlaybackController engine as the legacy selector-based Playlist, but
// DOM-agnostic: it only emits namespaced `player:*` CustomEvents on eventTarget.
export default class Player {
  constructor({
    autoAdvance = true,
    preloadNext = true,
    eventTarget = document,
    enableConsoleLogging = false,
  } = {}) {
    this.autoAdvance = autoAdvance
    this.preloadNext = preloadNext
    this.eventTarget = eventTarget
    this.enableConsoleLogging = enableConsoleLogging
    this.pool = new NodePool(3)
    this._queue = []
    this._controllers = []
    this._currentIndex = -1
    this._isPlaying = false
  }

  get queue() {
    return this._queue.slice()
  }

  get currentIndex() {
    return this._currentIndex
  }

  get currentTrack() {
    return this._queue[this._currentIndex] || null
  }

  get isPlaying() {
    return this._isPlaying
  }

  // Primary entry point. Rides the user gesture: unlocks the pool synchronously
  // (before any await) so iOS allows later gestureless auto-advance/next.
  setQueue(tracks, { startIndex = 0, autoplay = true } = {}) {
    this.unlock()
    this._stopCurrent()

    this._queue = tracks.slice()
    this._controllers = this._queue.map(
      (track, i) =>
        new PlaybackController({
          url: track.url,
          pool: this.pool,
          emit: (event, detail) => this._onEngineEvent(i, event, detail),
        }),
    )
    this._currentIndex = startIndex

    this.eventTarget.dispatchEvent(
      new CustomEvent("player:queued", {
        bubbles: true,
        detail: { length: this._queue.length, index: startIndex },
      }),
    )
    this._dispatch("trackchanged")

    if (autoplay) this.play()
    else this._controllers[startIndex]?.load()
  }

  play() {
    this.unlock()
    this._controllers[this._currentIndex]?.play()
  }

  pause() {
    this._controllers[this._currentIndex]?.pause()
  }

  toggle() {
    if (this._isPlaying) this.pause()
    else this.play()
  }

  next() {
    this.jumpTo(this._currentIndex + 1)
  }

  previous() {
    this.jumpTo(this._currentIndex - 1)
  }

  jumpTo(index) {
    if (index < 0 || index >= this._queue.length) return
    this._stopCurrent()

    const target = this._controllers[index]
    // restart-from-0 only when revisiting an already-played track; a freshly
    // preloaded next track is already cued at 0 and must not be seek-glitched.
    target.reset()
    if (target.audioNode && target.time > 0) target.seek(0)

    this._currentIndex = index
    this._dispatch("trackchanged")
    this.play()
  }

  // position is a float 0..1
  seek(position) {
    this._controllers[this._currentIndex]?.seek(position)
  }

  clear() {
    this._stopCurrent()
    this._queue = []
    this._controllers = []
    this._currentIndex = -1
  }

  // Eagerly unlock the node pool on the first user interaction. Idempotent.
  unlock() {
    this.pool.unlockAllAudioNodes()
  }

  _stopCurrent() {
    // pause the audio directly (not via controller.pause) so tearing down a
    // queue doesn't emit a spurious player:paused for the outgoing track
    this._controllers[this._currentIndex]?.audioNode?.pause()
    this._isPlaying = false
  }

  _onEngineEvent(index, event, detail) {
    // events from a backgrounded controller (e.g. the next track preloading)
    // are not surfaced as player state
    if (index !== this._currentIndex) return

    switch (event) {
      case "loading":
        this._dispatch("loading", detail)
        break
      case "playing":
        this._isPlaying = true
        this._dispatch("playing", detail)
        break
      case "whilePlaying":
        this._dispatch("timeupdate", detail)
        break
      case "registerListen":
        this._dispatch("registerlisten", detail)
        break
      case "seeked":
        this._dispatch("seeked", detail)
        break
      case "pause":
        this._isPlaying = false
        this._dispatch("paused", detail)
        break
      case "ended":
        this._isPlaying = false
        this._dispatch("ended", detail)
        this._advance()
        break
      case "preloadNextTrack":
        if (this.preloadNext) this._controllers[index + 1]?.load()
        break
      case "notPlaying":
        this._isPlaying = false
        this._dispatch("error", detail)
        this._advance()
        break
      default:
        break
    }
  }

  // After the current track ends or errors: auto-advance to the next, or report
  // the queue is finished when there's nothing left.
  _advance() {
    const hasNext = this._currentIndex + 1 < this._queue.length
    if (hasNext) {
      if (this.autoAdvance) this.jumpTo(this._currentIndex + 1)
    } else {
      this._dispatch("queueended")
    }
  }

  _dispatch(type, core = {}) {
    const track = this._queue[this._currentIndex] || null
    const percent = Number.isNaN(core.percentPlayed)
      ? 0
      : core.percentPlayed || 0
    const detail = {
      track,
      index: this._currentIndex,
      duration: core.duration || 0,
      currentTime: core.time || 0,
      currentTimeFormatted: core.currentTime || "0:00",
      percent,
    }
    if (core.error) {
      detail.error = { name: core.error.name, message: core.error.message }
    }
    if (this.enableConsoleLogging) {
      console.log(`player:${type}`, detail)
    }
    this.eventTarget.dispatchEvent(
      new CustomEvent(`player:${type}`, { bubbles: true, detail }),
    )
  }
}
