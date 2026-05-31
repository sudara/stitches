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
    this._advanced = false
    this._generation = 0
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

  // Primary entry point. Call it inside the user gesture: the first play rides
  // the gesture and (via PlaybackController) unlocks the rest of the pool right
  // after, so later gestureless next/auto-advance can play. We intentionally do
  // NOT pre-unlock here — playing a node's blank clip and then swapping its src
  // stalls playback in Firefox.
  setQueue(tracks, { startIndex = 0, autoplay = true } = {}) {
    this._stopCurrent()
    // a controller from the outgoing queue may still emit (error/ended) after
    // replacement; tag emits with the generation so stale ones are ignored
    this._generation += 1
    const generation = this._generation

    this._queue = tracks.slice()
    this._controllers = this._queue.map(
      (track, i) =>
        new PlaybackController({
          url: track.url,
          pool: this.pool,
          emit: (event, detail) =>
            this._onEngineEvent(generation, i, event, detail),
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
    // committing to (re)play the current track re-arms the advance latch
    this._advanced = false
    const controller = this._controllers[this._currentIndex]
    if (!controller) return
    // flag this play as user-initiated so the post-play pool unlock doesn't
    // pause the track we're starting (same role wasClicked plays for Track)
    controller.wasClicked = true
    controller.play()
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
    this._generation += 1
    this._queue = []
    this._controllers = []
    this._currentIndex = -1
  }

  // Eagerly unlock the node pool on the first user interaction. Idempotent.
  unlock() {
    this.pool.unlockAllAudioNodes()
  }

  _stopCurrent() {
    this._controllers[this._currentIndex]?.stop()
    this._isPlaying = false
  }

  _onEngineEvent(generation, index, event, detail) {
    // an event from a queue we've since replaced must not touch current state
    if (generation !== this._generation) return
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
        if (!this._advanced) {
          this._advanced = true
          this._advance()
        }
        break
      case "preloadNextTrack":
        if (this.preloadNext) this._controllers[index + 1]?.load()
        break
      case "notPlaying":
        this._isPlaying = false
        this._dispatch("error", detail)
        if (!this._advanced) {
          this._advanced = true
          this._advance()
        }
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
    const percent = Number.isFinite(core.percentPlayed)
      ? Math.min(1, Math.max(0, core.percentPlayed))
      : 0
    const detail = {
      track,
      index: this._currentIndex,
      duration: core.duration || 0,
      currentTime: core.time || 0,
      currentTimeFormatted: core.currentTime || "0:00",
      percent,
    }
    if (core.error) {
      detail.error = {
        name: core.error.name,
        code: core.error.code,
        message: core.error.message,
        fileName: core.error.fileName,
      }
    }
    if (this.enableConsoleLogging) {
      console.log(`player:${type}`, detail)
    }
    this.eventTarget.dispatchEvent(
      new CustomEvent(`player:${type}`, { bubbles: true, detail }),
    )
  }
}
