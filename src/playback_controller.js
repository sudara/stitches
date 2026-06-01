import uniqueId from "./unique_id.js"

// The DOM-free playback engine extracted from Track: it leases an AudioNode
// from a pool, drives play/pause/seek/load, and runs the timing FSM
// (~200ms-early ended, <10s preload-next, >15% register-listen). Every
// lifecycle moment is reported through a single injected `emit(event, detail)`
// so both the DOM-bound Track and the queue-driven Player can build on it
// without duplicating any of this logic.
//
// emit events: preload, grabNodeAndSetSrc, loading, play, playStarted, playing,
// whilePlaying, whileLoading, registerListen, ended, preloadNextTrack, pause,
// seeked, notPlaying.
export default class PlaybackController {
  constructor({ url, pool, emit }) {
    this.id = uniqueId()
    this.url = url
    this.pool = pool
    this.emit = emit || (() => {})
    this.audioNode = null
    this.duration = 0
    this.time = 0
    this.position = 0
    this.timeFromEnd = NaN
    this.wasClicked = false
    this.paused = true
    this.reset()
  }

  reset() {
    this.hasEnded = false
    this.preloadNextDispatched = false
    this.playingDispatched = false
    this.registerListenDispatched = false
  }

  state(fileName) {
    return {
      time: this.time,
      duration: this.duration,
      fileName: fileName ?? this.audioNode?.fileName ?? "",
      timeFromEnd: this.timeFromEnd,
      percentPlayed: this.position,
      currentTime: this.formattedTime(),
    }
  }

  async preload() {
    this.emit("preload", this.state())
    await this.load()
  }

  // grabbing a new node automatically results in position 0 for it and no seek(0) is needed
  // TODO: set the old position if it was partially played https://github.com/sudara/stitchES/issues/34
  async grabNode() {
    if (this.audioNode !== null) {
      // No need to check for unlocked audio nodes,
      // since hasEnded means the audio node have been unlocked before
      if (this.hasEnded) {
        this.seek(0)
      }
    } else {
      this.emit("grabNodeAndSetSrc", this.state())

      this.audioNode = await this.pool.nextAvailableNode(
        this.cleanupAudioNode.bind(this),
      )

      // Both of these events can happen before play is passed
      // So we need to be sure the set these callbacks ASAP
      this.audioNode.whileLoadingCallback = this.whileLoading.bind(this)
      this.audioNode.onErrorCallback = this.onError.bind(this)

      this.audioNode.src = this.url
      this.emit("loading", this.state())
    }
  }

  cleanupAudioNode() {
    this.audioNode = null
  }

  // https://developers.google.com/web/updates/2016/03/play-returns-promise
  async play() {
    this.emit("play", this.state())

    // this helps us fire the playing event the first time whilePlaying is called
    this.playingDispatched = false

    try {
      await this.grabNode()

      // we are binding our methods to audioNode's callbacks
      // Normally we'd want an "await" here, but it broke continuous playback on ios
      // This means that errors from playback won't bubble up here
      // And instead need to be caught inside AudioNode
      this.audioNode.play(
        this.whilePlaying.bind(this),
        this.onSeek.bind(this),
        this.wasClicked,
      )

      await this.pool.unlockAllAudioNodes()

      this.emit("playStarted", {
        ...this.state(),
        isLoaded: this.audioNode.isLoaded,
      })
      this.hasEnded = false
      this.paused = false
    } catch (err) {
      this.onError(err)
    }
  }

  // called from an audioNode
  onError(data) {
    this.emit("notPlaying", { ...this.state(), error: data })
  }

  // called from an audioNode
  onSeek() {
    this.emit("seeked", this.state())
  }

  // called from an audioNode
  whileLoading(data) {
    this.duration = data.duration
    const loadingPosition = data.secondsLoaded / data.duration
    this.emit("whileLoading", {
      ...this.state(data.fileName),
      secondsLoaded: data.secondsLoaded,
      loadingPosition,
    })
  }

  // called from an audioNode
  whilePlaying(data) {
    this.time = data.currentTime
    this.position = data.currentTime / data.duration
    this.timeFromEnd = data.duration - this.time

    const detail = this.state(data.fileName)

    // ensures playing always fires before whilePlaying
    if (!this.playingDispatched) {
      // manually fire one last whileLoading as browsers are a bit inconsistent
      // about this and we'd like to always see the full loading progress
      this.audioNode.whileLoading(true)
      this.emit("playing", detail)
      this.playingDispatched = true
    } else {
      this.emit("whilePlaying", detail)
    }

    if (!this.registerListenDispatched && this.position > 0.15) {
      this.emit("registerListen", detail)
      this.registerListenDispatched = true
    }

    if (!this.hasEnded && this.timeFromEnd < 0.2) {
      this.hasEnded = true
      this.paused = true
      this.emit("ended", detail)
    }

    if (!this.preloadNextDispatched && this.timeFromEnd < 10) {
      this.preloadNextDispatched = true
      this.emit("preloadNextTrack", detail)
    }
  }

  seek(position) {
    if (!this.audioNode) return
    if (this.hasEnded) {
      this.reset()
    }
    this.audioNode.seek(position)
  }

  // pause the audio without emitting — used when tearing down or switching
  // tracks so we don't surface a spurious pause for the outgoing track
  stop() {
    this.audioNode?.pause()
    this.paused = true
  }

  async load() {
    if (!this.audioNode) {
      await this.grabNode()
      this.audioNode.src = this.url
      await this.audioNode.load()
    } else if (this.audioNode && !this.audioNode.isLoading) {
      await this.audioNode.load()
    }
  }

  pause() {
    if (!this.audioNode) return
    this.audioNode.pause()
    this.paused = true
    this.emit("pause", this.state())
  }

  formattedTime() {
    const time = Math.floor(this.time)
    const min = Math.floor(time / 60)
    const sec = time % 60
    return min + ":" + (sec >= 10 ? sec : "0" + sec)
  }
}
