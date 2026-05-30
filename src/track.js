import Log from "./log.js"
import PlaybackController from "./playback_controller.js"

// DOM adapter over PlaybackController: binds a playlist element to the engine,
// wires the play/seek listeners, updates the progress/time/class DOM, and
// re-broadcasts the engine's lifecycle as the legacy bubbling `track:*`
// CustomEvents (with this element's `data-stitches-*` detail merged in).
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
    onError,
  }) {
    this.element = element
    this.playButtonElement = element.querySelector(playButtonSelector)
    this.url = this.playButtonElement.href
    this.loadingProgressElement = element.querySelector(loadingProgressSelector)
    this.playProgressElement = element.querySelector(playProgressSelector)
    this.seekElement = element.querySelector(seekSelector)
    this.timeElement = element.querySelector(timeSelector)
    this.playlistSetCurrentTrack = setCurrentTrack
    this.whileLoadingCallback = whileLoading
    this.whilePlayingCallback = whilePlaying
    this.onErrorCallback = onError
    this.displayingPauseButton = false
    this.customEventDetail = {}
    this.extractCustomEventDetail()

    this.controller = new PlaybackController({
      url: this.url,
      pool,
      emit: this.handle.bind(this),
    })
    this.id = this.controller.id

    this.playButtonElement.addEventListener(
      "click",
      this.togglePlay.bind(this),
      true,
    )
    this.addSeekListener()
    this.log("track:create", this.controller.state())
  }

  get paused() {
    return this.controller.paused
  }

  get audioNode() {
    return this.controller.audioNode
  }

  // Turns each engine event into the DOM updates + the bubbling track:* event
  // the old Track emitted. playStarted is internal (no legacy event).
  handle(event, detail) {
    switch (event) {
      case "playStarted":
        if (detail.isLoaded) {
          this.element.classList.add("stitches-playing")
          this.element.classList.remove("stitches-paused")
        } else {
          this.element.classList.add("stitches-loading")
          this.element.classList.remove("stitches-playing")
          this.element.classList.remove("stitches-paused")
        }
        if (this.timeElement) this.timeElement.innerText = detail.currentTime
        return
      case "whileLoading":
        this.updateLoadingProgressElement(detail.loadingPosition)
        if (typeof this.whileLoadingCallback === "function")
          this.whileLoadingCallback(detail)
        break
      case "playing":
      case "whilePlaying":
        if (this.timeElement) this.timeElement.innerText = detail.currentTime
        this.updatePlayProgressElement(detail.percentPlayed)
        if (!this.displayingPauseButton) {
          this.element.classList.remove("stitches-loading")
          this.element.classList.add("stitches-playing")
          this.displayingPauseButton = true
        }
        break
      case "pause":
        this.displayingPauseButton = false
        break
      case "notPlaying":
        if (this.onErrorCallback) this.onErrorCallback(detail.error)
        break
      default:
        break
    }

    const payload = { ...detail, ...this.customEventDetail }
    this.log("track:" + event, payload)

    if (
      (event === "playing" || event === "whilePlaying") &&
      typeof this.whilePlayingCallback === "function"
    ) {
      this.whilePlayingCallback(payload)
    }
  }

  preload() {
    return this.controller.preload()
  }

  play() {
    return this.controller.play()
  }

  pause() {
    this.controller.pause()
  }

  load() {
    return this.controller.load()
  }

  async updatePosition(event) {
    this.controller.wasClicked = true // This lets us shortcut unlockAll for this particular track

    let newPosition

    // if we weren't playing before, now is the time
    this.playlistSetCurrentTrack(this)
    if (this.controller.paused) await this.play()

    // this is a custom event, we are getting the position
    if (event.detail.position) {
      newPosition = event.detail.position
    } else if (this.seekElement) {
      const offset =
        event.clientX - this.seekElement.getBoundingClientRect().left
      newPosition = offset / this.seekElement.offsetWidth
    }
    this.updatePlayProgressElement(newPosition)
    this.controller.seek(newPosition)
  }

  // This is called by the click handler
  // And the event we are "riding" to unlock everything
  togglePlay(evt) {
    this.controller.wasClicked = true // This lets us shortcut unlockAll for this particular track
    evt.preventDefault() // This will still bubble up to fire unlockAll from body
    if (this.controller.audioNode && !this.controller.paused) {
      this.pause()
      this.element.classList.remove("stitches-loading")
      this.element.classList.remove("stitches-playing")
      this.element.classList.add("stitches-paused")
    } else {
      // all exceptions are handled and caught in play()
      // hence we don't need to await / try / catch
      this.playlistSetCurrentTrack(this)
      this.play()
    }
  }

  addSeekListener() {
    // allow an external source to seek our track via this event
    this.element.addEventListener("track:seek", this.updatePosition.bind(this))

    if (this.seekElement) {
      this.seekElement.addEventListener("click", this.updatePosition.bind(this))
    } else {
      this.log("warning:noSeekElement")
    }
  }

  // just keeps the logging a bit cleaner in the rest of the class
  log(event, options = {}) {
    Log.trigger(
      event,
      Object.assign({}, options, { id: this.id }),
      this.element,
    )
  }

  updateLoadingProgressElement(position) {
    if (this.loadingProgressElement) {
      if (this.loadingProgressElement.nodeName === "PROGRESS")
        this.loadingProgressElement.value = position
      else this.loadingProgressElement.style.width = `${position * 100}%`
    }
  }

  updatePlayProgressElement(position) {
    if (this.playProgressElement && !Number.isNaN(position)) {
      if (this.playProgressElement.nodeName === "PROGRESS")
        this.playProgressElement.value = position
      else this.playProgressElement.style.width = `${position * 100}%`
    }
  }

  extractCustomEventDetail() {
    for (const dataAttribute in this.element.dataset) {
      if (dataAttribute.startsWith("stitches")) {
        // stitchesTrackName becomes trackName
        const newAttributeName =
          dataAttribute[8].toLowerCase() + dataAttribute.substring(9)
        this.customEventDetail[newAttributeName] =
          this.element.dataset[dataAttribute]
      }
    }
  }
}
