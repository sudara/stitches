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
    this.registerListenEventDispatched = false
  }

  async preload() {
    // grab node from list
    this.log("track:preload")
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
      // grabbing a new node automatically results in position 0 for it and no seek(0) is needed
      // TODO: set the old position if it was partially played https://github.com/sudara/stitchES/issues/34
      this.log("track:grabNodeAndSetSrc")

      this.audioNode = await this.pool.nextAvailableNode(
        this.cleanupAudioNode.bind(this)
      )

      // Both of these events can happen before play is passed
      // So we need to be sure the set these callbacks ASAP
      this.audioNode.whileLoadingCallback = this.whileLoading.bind(this)
      this.audioNode.onErrorCallback = this.onError.bind(this)

      this.audioNode.src = this.url
      this.log("track:loading")
    }
  }

  cleanupAudioNode() {
    this.audioNode = null
  }

  // https://developers.google.com/web/updates/2016/03/play-returns-promise
  async play() {
    this.log("track:play")

    // this helps us fire the track:playing event
    // the first time that whileLoading is called
    this.playingEventDispatched = false

    try {
      await this.grabNode()

      // we are binding Track's methods to audioNode's callbacks
      // Normally we'd want a "await" here, but it broke continuous playback on ios
      // This means that errors from playback won't bubble up here
      // And instead need to be caught inside AudioNode
      this.audioNode.play(this.whilePlaying.bind(this), this.onSeek.bind(this),
        this.wasClicked)

      await this.pool.unlockAllAudioNodes()

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
    } catch (err) {
      this.onError(err)
    }
  }

  // called from an audioNode
  onError(data) {
    // call the user supplied callback
    if (this.onErrorCallback) {
      this.onErrorCallback(data)
    }
    this.log("track:notPlaying", data)
  }

  // called from an audioNode
  onSeek() {
    this.log("track:seeked")
  }

  // called from an audioNode
  whileLoading(data) {
    const position = data.secondsLoaded / data.duration
    this.updateLoadingProgressElement(position)
    if (typeof this.whileLoadingCallback === "function") {
      this.whileLoadingCallback(data)
    }
    this.log("track:whileLoading", data)
  }

  // called from an audioNode
  whilePlaying(data) {
    this.time = data.currentTime
    this.position = data.currentTime / data.duration
    this.timeFromEnd = data.duration - this.time

    // Achtung, the order of these are important for tests!
    const payload = {
      time: this.time,
      fileName: data.fileName,
      duration: data.duration,
      timeFromEnd: this.timeFromEnd,
      percentPlayed: this.position,
      currentTime: this.formattedTime(),
    }

    // ensures track:playing always fires before whilePlaying
    if (!this.playingEventDispatched) {
      // manually fire one last whileLoading
      // as browsers are a bit inconsistent about this
      // and we'd like to always see the full loading progress
      this.audioNode.whileLoading()
      this.log("track:playing", payload)
      this.playingEventDispatched = true
    } else {
      this.log("track:whilePlaying", payload)
    }

    if (!this.registerListenEventDispatched && (this.position > 0.15)) {
      this.log("track:registerListen")
      this.registerListenEventDispatched = true
    }

    if (this.timeElement) {
      this.timeElement.innerText = payload.currentTime
    }

    if (!this.hasEnded && this.timeFromEnd < 0.2) {
      this.hasEnded = true
      this.paused = true
      this.log("track:ended")
    }

    if (!this.preloadNextTrackDispatched && this.timeFromEnd < 10) {
      this.preloadNextTrackDispatched = true
      this.log("track:preloadNextTrack")
    }

    this.updatePlayProgressElement()

    if (!this.displayingPauseButton) {
      this.element.classList.remove("stitches-loading")
      this.element.classList.add("stitches-playing")
      this.displayingPauseButton = true
    }

    if (typeof this.whilePlayingCallback === "function") {
      this.whilePlayingCallback(payload)
    }
  }

  async updatePosition(event) {

    this.wasClicked = true // This lets us shortcut unlockAll for this particular track

    let newPosition

    // if we weren't playing before, now is the time
    this.playlistSetCurrentTrack(this)
    if(this.paused) await this.play()

    // this is a custom event, we are getting the position
    if (event.detail.position) {
      newPosition = event.detail.position
    } else if(this.seekElement) {
      const offset = event.clientX - this.seekElement.getBoundingClientRect().left
      newPosition = offset / this.seekElement.offsetWidth
    }
    this.updatePlayProgressElement(newPosition)
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

  // This is called by the click handler
  // And the event we are "riding" to unlock everything
  togglePlay(evt) {
    this.wasClicked = true // This lets us shortcut unlockAll for this particular track
    evt.preventDefault() // This will still bubble up to fire unlockAll from body
    if (this.audioNode && !this.paused) {
      this.pause()
      this.element.classList.remove("stitches-loading")
      this.element.classList.remove("stitches-playing")
      this.element.classList.add("stitches-paused")
    } else {
      // all exceptions are handled and caught in this.play()
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
    Log.trigger(event, Object.assign(options, { id: this.id }), this.element)
  }

  updateLoadingProgressElement(position) {
    if (this.loadingProgressElement) {
      if (this.loadingProgressElement.nodeName === "PROGRESS")
        this.loadingProgressElement.value = position
      else
        this.loadingProgressElement.style.width = `${position * 100}%`
    }
  }

  updatePlayProgressElement(position=this.position) {
    if (this.playProgressElement && !Number.isNaN(position)) {
      if (this.playProgressElement.nodeName === "PROGRESS")
        this.playProgressElement.value = position
      else
        this.playProgressElement.style.width = `${position * 100}%`
    }
  }

  formattedTime() {
    const time = Math.floor(this.time)
    const min = Math.floor(time / 60)
    const sec = time % 60
    return min + ':' + (sec >= 10 ? sec : '0' + sec)
  }
}
