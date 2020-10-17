import Log from "./log.js"

// A mini BASE64 encoded silent mp3 allows us to .play() to activate
// nodes without requests or excess file sizes
// https://gist.github.com/wittnl/8a1a0168b94f3b6abfaa
const blankMP3 =
  "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV"

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#Attributes
export default class AudioNode {
  constructor(preloadSrc) {
    Log.trigger("audioNode:create")
    this.unlocked = false
    this.loadNext = null
    this.audio = new Audio()
    this.audio.autoplay = false
    // https://developer.mozilla.org/en-US/docs/Web/Apps/Fundamentals/Audio_and_video_delivery/Cross-browser_audio_basics
    this.audio.onprogress = this.whileLoading.bind(this)
    this.audio.ontimeupdate = this.whilePlaying.bind(this)
    this.audio.oncanplaythrough = this.loaded.bind(this)
    this.audio.onloadeddata = this.onloading.bind(this)
    this.audio.onerror = this.onError.bind(this)
    this.audio.preload = preloadSrc ? "auto" : "none"
    this.src = preloadSrc || blankMP3
    this.unlockedDirectlyViaUserInteraction = false
    this.reset()
    this.isLoading = Boolean(preloadSrc)
    this.seeked = false
  }

  get blank() {
    return this.src === blankMP3
  }

  get duration() {
    return this.audio.duration
  }

  set src(url) {
    this.reset()
    this.audio.src = url
    this.fileName = url.startsWith("data:audio") ? "data" : url.split("/").pop()
    Log.trigger("audioNode:srcchanged", { fileName: this.fileName } )
  }

  get src() {
    return this.audio.src
  }

  reset() {
    this.isLoaded = false
    this.isLoading = false
    this.lastSecondsLoaded = 0
    this.lastSeeked = 0
  }

  // position is a percentage
  async seek(position) {
    while (isNaN(this.audio.duration)) {
      Log.trigger('waiting for audio.duration')

      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    this.seeked = true
    Log.trigger("audioNode:seeked", {
      position,
      fileName: this.fileName
    })
    this.audio.currentTime = this.audio.duration * position
  }

  load() {
    this.audio.load()
  }

  // this can *only* be called via an interaction event like a click/touch
  async unlock() {
     // https://developers.google.com/web/updates/2016/03/play-returns-promise
    try {
      // This will be reached only if preloaded track *wasn't* clicked on
      if (this.unlockedDirectlyViaUserInteraction){
        Log.trigger("audioNode:alreadyUnlockedDirectly")
      } else if (!this.blank && !this.unlocked) {
        await this.unlockPreloaded()
        Log.trigger("audioNode:unlockedPreloaded")
      } else if(!this.unlocked) {
        await this.audio.play()
        Log.trigger("audioNode:unlocked")
      } else {
        Log.trigger("audioNode:alreadyUnlocked")
      }
      this.unlocked = true
    } catch (err) {
      Log.trigger("audioNode:unlockfailed", {
        name: err.name,
        message: err.message
      })
    }
  }

  // We get a burst of sound if we unlock a preloaded node,
  // since intsead of a blank MP3, it's an actual audio file.
  // This is an alternative to swapping the src out with the blank MP3
  // which risks having to load the actual audio file again
  async unlockPreloaded() {
    // safari 13 on macOS can't deal with volume being set before play(), playback stalls
    //this.audio.muted = true
    await this.audio.play()
    this.audio.pause()
    //this.audio.muted = false
  }

  // https://developer.mozilla.org/en-US/docs/Web/Guide/Audio_and_video_delivery/buffering_seeking_time_ranges
  whileLoading() {
    // we can't do much until we have metadata like duration
    if (!this.duration) return

    // When the audio element is not ready in safari
    // we sometimes see the following error
    // IndexSizeError: The index is not in the allowed range.
    let secondsLoaded = 0
    try {
      secondsLoaded = this.audio.buffered.end(0)
    } catch {
      Log.trigger('audioNode:indexSizeError')
    }

    // we don't want to fire on pointless / duplicate events
    if (secondsLoaded <= this.lastSecondsLoaded) return

    const payload = {
      secondsLoaded,
      duration: this.duration,
      fileName: this.fileName
    }
    Log.trigger('audioNode:whileLoading', payload)

    // this is Track's whileLoading
    // We don't want it to fire on blank mp3, etc
    if (this.whileLoadingCallback) this.whileLoadingCallback(payload)

    // some browsers (FF 81) don't fire a last whileLoading
    // lets give them a helping hand
    if (secondsLoaded !== this.duration)
      setTimeout(() => this.whileLoading, 1500)

    this.lastSecondsLoaded = secondsLoaded
  }

  whilePlaying() {
    // Updating src seems to fire ontimeupdate and we ignore it to avoid
    // triggering the event for tracks that actually aren't playing
    if (this.audio.currentTime === 0) return

    const currentTime = this.audio.currentTime

    // Seeking will fire the timeupdate event
    // and sometimes there can be up to 2-3 events before time is moving again.
    // In these cases, we don't want to fire whilePlaying, as we aren't playing.
    // Warning: In some browsers, the event that fires on seek can have a different
    // decimal precision to the next event, despite no time passing.
    if (this.seeked)  {
      if ((this.lastSeeked > 0) && (this.lastSeeked !== currentTime.toFixed(3))) {
      this.seeked = false
        this.lastSeeked = 0.0
        if (this.onSeekCallback) this.onSeekCallback()
      } else {
        this.lastSeeked = currentTime.toFixed(3)
        return
      }
    }

    if (this.whilePlayingCallback) {
      this.whilePlayingCallback({
        currentTime,
        duration: this.duration,
        fileName: this.fileName
      })
    }
  }

  // https://dev.w3.org/html5/spec-author-view/spec.html#mediaerror
  onError(e) {
    if(e.target ) { e = e.target.error } // when e is an event
    const codes = ['MEDIA_ERR_ABORTED', 'MEDIA_ERR_NETWORK',
      'MEDIA_ERR_DECODE', 'MEDIA_ERR_SRC_NOT_SUPPORTED']
    const payload = {
      fileName: this.fileName,
      code: `${e.code}: ${codes[parseInt(e.code, 10) - 1]}`,
      message: e.message
    }

    // useful internally to make sure our error handling works
    Log.trigger("audioNode:onError", payload)

    // bubble this up to the Track in charge
    this.onErrorCallback(payload)
  }

  async play(whilePlayingCallback, onErrorCallback, onSeekCallback, firedFromUserInteraction=false) {
    Log.trigger("audioNode:play")
    this.unlockedDirectlyViaUserInteraction = firedFromUserInteraction

    this.whilePlayingCallback = whilePlayingCallback
    this.onErrorCallback = onErrorCallback
    this.onSeekCallback = onSeekCallback

    // we need to resolrve this promise here
    // as our caller (Track#play) cannot await our promise
    // In the case of an error, the onError handler will handle it
    try {
      await this.audio.play()
    } catch(e) { /* no-op */ }
  }

  pause() {
    this.audio.pause()
  }

  ready() {
    return this.audio.readyState >= 3
  }

  onloading() {
    this.isLoading = true
  }

  // this doesn't mean all data is loaded, just enough
  // that the browser determines it canPlayThrough
  loaded() {
    this.isLoaded = true
    // don't care about notifying on the blank mp3 loading since it's internal
    if (!this.blank) {
      this.whileLoading()
      Log.trigger("audioNode:loaded", {
        fileName: this.fileName
      })
    }
  }
}
