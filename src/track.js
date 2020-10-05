import Log from "./log.js"
import uniqueId from "./unique_id.js"

export default class Track {
  constructor({
    element,
    pool,
    setCurrentTrack,
    playButtonSelector,
    loadingProgressSelector,
    playProgressSelector,
    seekSelector,
    timeSelector,
    whileLoading,
    whilePlaying,
    onError
  }) {
    this.id = uniqueId()
    this.pool = pool
    this.element = element
    this.playButtonElement = element.querySelector(playButtonSelector)
    this.url = this.playButtonElement.href
    this.loadingProgressElement = element.querySelector(loadingProgressSelector)
    this.playProgressElement = element.querySelector(playProgressSelector)
    this.seekElement = element.querySelector(seekSelector)
    this.timeElement = element.querySelector(timeSelector)
    this.playlistSetCurrentTrack = setCurrentTrack
    this.audioNode = null
    this.time = 0
    this.position = 0
    this.timeFromEnd = NaN
    this.wasClicked = false
    this.paused = true
    this.displayingPauseButton = false
    this.whileLoadingCallback = whileLoading
    this.whilePlayingCallback = whilePlaying
    this.onErrorCallback = onError
    this.playButtonElement.addEventListener("click", this.togglePlay.bind(this), true)
    this.addSeekListener()
    this.reset()
    this.log("track:create")
  }

  reset() {
    this.hasEnded = false
    this.preloadNextTrackDispatched = false
    this.playingEventDispatched = false
  }

  async preload() {
    // grab node from list
    this.log("track:preload")
    await this.load()
  }

  async grabNode() {
    this.log("track:grabNodeAndSetSrc")
    this.audioNode = await this.pool.nextAvailableNode(
      this.cleanupAudioNode.bind(this)
    )
  }

  cleanupAudioNode() {
    this.audioNode = null
  }

  // https://developers.google.com/web/updates/2016/03/play-returns-promise
  async play() {
    this.log("track:play")
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

      // we are binding Track's methods to audioNode's callbacks
      this.audioNode.play(this.whileLoading.bind(this),
        this.whilePlaying.bind(this),
        this.onErrorCallback,
        this.wasClicked)

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

      if (this.timeElement) {
        this.timeElement.innerText = this.formattedTime()
      }

      this.hasEnded = false
      this.paused = false
      this.log("track:loading")
    } catch (err) {
      if (this.onErrorCallback) {
        this.onErrorCallback({
          fileName: this.fileName,
          error: err
        })
      }
      this.log("track:notPlaying", {
        name: err.name,
        message: err.message
      })
    }
  }

  whileLoading(data) {
    const position = data.secondsLoaded / data.duration
    this.updateLoadingProgressElement(position)
    if (typeof this.whileLoadingCallback === "function") {
      this.whileLoadingCallback(data)
    }
  }

  whilePlaying(data) {
    if (!this.playingEventDispatched) {
      this.log("track:playing")
      this.playingEventDispatched = true
    }

    this.time = data.currentTime
    if (this.timeElement) {
      this.timeElement.innerText = this.formattedTime()
    }

    this.position = data.currentTime / this.audioNode.duration
    this.timeFromEnd = this.audioNode.duration - this.time

    if (!this.hasEnded && this.timeFromEnd < 0.2) {
      this.hasEnded = true
      this.paused = true
      this.log("track:ended")
    }

    if (!this.preloadNextTrackDispatched && this.timeFromEnd < 10) {
      this.preloadNextTrackDispatched = true
      this.log("track:preloadNextTrack")
    }

    if (this.playProgressElement && !Number.isNaN(this.position)) {
      if (this.playProgressElement.nodeName === "PROGRESS")
        this.playProgressElement.value = this.position
      else
        this.playProgressElement.style.width = `${this.position * 100}%`
    }

    if (!this.displayingPauseButton) {
      this.element.classList.remove("stitches-loading")
      this.element.classList.add("stitches-playing")
      this.displayingPauseButton = true
    }

    if (typeof this.whilePlayingCallback === "function") {
      this.whilePlayingCallback({
        time: this.time,
        timeFromEnd: this.timeFromEnd,
        percentPlayed: this.position,
        fileName: this.url
      })
    }
  }

  async updatePosition(evt) {
    this.wasClicked = true // This lets us shortcut unlockAll for this particular track
    const offset =
      evt.clientX - this.seekElement.getBoundingClientRect().left
    const newPosition = offset / this.seekElement.offsetWidth
    await this.playlistSetCurrentTrack(this)
    this.seek(newPosition)
  }

  seek(position) {
    if (this.hasEnded) {
      this.reset()
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
    this.displayingPauseButton = false
    this.log("track:pause")
  }

  // This is only called by the click handler
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

  addSeekListener() {
    if (this.seekElement) {
      this.seekElement.addEventListener(
        "click",
        this.updatePosition.bind(this)
      )
    } else {
      this.log("warning:noSeekElement")
    }
  }

  // just keeps the logging a bit cleaner in the rest of the class
  log(event, options={}) {
    Log.trigger(event, Object.assign(options, { fileName: this.url, id: this.id }), this.element)
  }

  updateLoadingProgressElement(position) {
    if (this.loadingProgressElement) {
      if (this.loadingProgressElement.nodeName === "PROGRESS")
        this.loadingProgressElement.value = position
      else
        this.loadingProgressElement.style.width = `${position * 100}%`
    }
  }

  formattedTime() {
    const time = Math.floor(this.time)
    const min = Math.floor(time / 60)
    const sec = time % 60
    return min + ':' + (sec >= 10 ? sec : '0' + sec)
  }
}
