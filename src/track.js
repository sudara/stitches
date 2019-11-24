import Log from "./log.js"
import uniqueId from "./unique_id.js"

export default class Track {
  constructor({
    element,
    pool,
    setCurrentTrack,
    playButtonSelector,
    progressSelector,
    whilePlaying
  }) {
    this.id = uniqueId()
    this.pool = pool
    this.element = element
    this.playButtonElement = element.querySelector(playButtonSelector)
    this.url = this.playButtonElement.href
    this.progressElement = element.querySelector(progressSelector)
    this.playlistSetCurrentTrack = setCurrentTrack
    Log.trigger("track:create")
    this.audioNode = null
    this.position = 0
    this.timeFromEnd = NaN
    this.hasEnded = false
    this.preloadNextTrackDispatched = false
    this.paused = true
    this.displayPauseButton = false
    this.whilePlayingCallback = whilePlaying
    this.playButtonElement.addEventListener("click", this.togglePlay.bind(this))
    this.progressElement.addEventListener(
      "click",
      this.updatePosition.bind(this)
    )
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
        // TODO we should set the old position if it was partially played
        await this.grabNode()
        this.audioNode.src = this.url
      }

      await this.audioNode.play(this.whilePlaying.bind(this))

      if (this.audioNode.isLoaded) {
        this.playButtonElement.classList.add("stitches-playing")
        this.playButtonElement.classList.remove("stitches-paused")
      } else {
        this.playButtonElement.classList.add("stitches-loading")
        this.playButtonElement.classList.remove("stitches-playing")
        this.playButtonElement.classList.remove("stitches-paused")
      }

      this.hasEnded = false
      this.paused = false
      Log.trigger("track:playing")
    } catch (err) {
      Log.trigger("track:notplaying")
      Log.trigger(err)
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
      this.playButtonElement.classList.remove("stitches-loading")
      this.playButtonElement.classList.add("stitches-playing")
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

  togglePlay(evt) {
    evt.preventDefault()
    if (this.audioNode && !this.paused) {
      this.pause()
      this.playButtonElement.classList.remove("stitches-loading")
      this.playButtonElement.classList.remove("stitches-playing")
      this.playButtonElement.classList.add("stitches-paused")
    } else {
      this.playlistSetCurrentTrack(this)
    }
  }
}
