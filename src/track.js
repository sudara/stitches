import Log from "./log.js"
import uniqueId from "./unique_id.js"

export default class Track {
  constructor({
    element,
    pool,
    setCurrentTrack,
    playButtonSelector,
    progressSelector,
    whilePlaying,
    onError
  }) {
    this.id = uniqueId()
    this.pool = pool
    this.element = element
    this.playButtonElement = element.querySelector(playButtonSelector)
    this.url = this.playButtonElement.href
    this.progressElement = element.querySelector(progressSelector)
    this.playlistSetCurrentTrack = setCurrentTrack
    this.audioNode = null
    this.position = 0
    this.timeFromEnd = NaN
    this.wasClicked = false
    this.hasEnded = false
    this.preloadNextTrackDispatched = false
    this.paused = true
    this.displayPauseButton = false
    this.whilePlayingCallback = whilePlaying
    this.onErrorCallback = onError
    this.playButtonElement.addEventListener("click", this.togglePlay.bind(this), true)
    this.progressElement.addEventListener(
      "click",
      this.updatePosition.bind(this)
    )
    Log.trigger("track:create")
  }

  async preload() {
    // grab node from list
    // make sure this one is last to be unlocked
    Log.trigger("track:preload")
    this.audioNode = this.pool.makePreloadingNode(
      this.url,
      this.cleanupAudioNode.bind(this)
    )
  }

  async grabNode() {
    Log.trigger("track:grabNodeAndSetSrc")
    this.audioNode = await this.pool.nextAvailableNode(
      this.cleanupAudioNode.bind(this)
    )
  }

  cleanupAudioNode() {
    this.audioNode = null
  }

  // https://developers.google.com/web/updates/2016/03/play-returns-promise
  async play() {
    Log.trigger("track:play")
    try {
      if (this.audioNode) {
        // No need to check for unlocked audio nodes, since hasEnded means the audio node have been unlocked before
        if (this.hasEnded) {
          this.seek(0)
        }
      } else {
        // grabbing a new node automatically results in position 0 for it and no seek(0) is needed
        // TODO: set the old position if it was partially played https://github.com/sudara/stitchES/issues/34
        await this.grabNode()
        this.audioNode.src = this.url
      }

      this.audioNode.play(this.whilePlaying.bind(this), this.onErrorCallback, this.wasClicked)
      if (!this.poolAllUnlocked) this.pool.unlockAllAudioNodes()

      // TODO: this needs to happen via callbacks
      if (this.audioNode.isLoaded) {
        this.element.classList.add("stitches-playing")
        this.element.classList.remove("stitches-paused")
      } else {
        this.element.classList.add("stitches-loading")
        this.element.classList.remove("stitches-playing")
        this.element.classList.remove("stitches-paused")
      }

      this.hasEnded = false
      this.paused = false
      Log.trigger("track:playing")
    } catch (err) {
      if (this.onErrorCallback) {
        this.onErrorCallback({
          fileName: this.fileName,
          error: err
        })
      }
      Log.trigger("track:notplaying", {
        name: err.name,
        message: err.message
      })
    }
  }

  whilePlaying(data) {
    this.position = data.currentTime / this.audioNode.duration
    this.timeFromEnd = this.audioNode.duration - data.currentTime
    if (!this.hasEnded && this.timeFromEnd < 0.2) {
      this.hasEnded = true
      this.paused = true
      Log.trigger("track:ended", { fileName: this.url, id: this.id })
    }
    if (!this.preloadNextTrackDispatched && this.timeFromEnd < 10) {
      this.preloadNextTrackDispatched = true
      Log.trigger("track:preloadNextTrack", { id: this.id })
    }

    if (this.progressElement && !Number.isNaN(this.position)) {
      this.progressElement.value = this.position
    }

    if (!this.displayPauseButton) {
      this.element.classList.remove("stitches-loading")
      this.element.classList.add("stitches-playing")
      this.displayPauseButton = true
    }

    if (typeof this.whilePlayingCallback === "function") {
      this.whilePlayingCallback({
        timeFromEnd: this.timeFromEnd,
        fileName: this.url
      })
    }
  }

  async updatePosition(evt) {
    this.wasClicked = true // This lets us shortcut unlockAll for this particular track
    const offset =
      evt.clientX - this.progressElement.getBoundingClientRect().left
    const newPosition = offset / this.progressElement.offsetWidth
    await this.playlistSetCurrentTrack(this)
    this.seek(newPosition)
  }

  seek(position) {
    if (this.hasEnded) {
      this.hasEnded = false
      this.preloadNextTrackDispatched = false
    }
    this.audioNode.seek(position)
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
    this.audioNode.pause()
    this.paused = true
    this.displayPauseButton = false
    Log.trigger("track:pause")
  }

  // This is only called by the click handler
  //
  togglePlay(evt) {
    this.wasClicked = true // This lets us shortcut unlockAll for this particular track
    evt.preventDefault() // This will still bubble up to fire unlockAll from body
    if (this.audioNode && !this.paused) {
      this.pause()
      this.element.classList.remove("stitches-loading")
      this.element.classList.remove("stitches-playing")
      this.element.classList.add("stitches-paused")
    } else {
      this.playlistSetCurrentTrack(this)
    }
  }
}
