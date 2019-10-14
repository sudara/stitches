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
    this.audio.preload = preloadSrc ? "auto" : "none"
    this.audio.autoplay = false
    // https://developer.mozilla.org/en-US/docs/Web/Apps/Fundamentals/Audio_and_video_delivery/Cross-browser_audio_basics
    this.audio.onprogress = this.whileLoading.bind(this)
    this.audio.ontimeupdate = this.whilePlaying.bind(this)
    this.audio.onended = this.onended.bind(this)
    this.audio.oncanplaythrough = this.loaded.bind(this)
    this.src = preloadSrc || blankMP3
    this.paused = true
  }

  get available() {
    return this.unlocked && this.blank
  }

  get blank() {
    return this.src === blankMP3
  }

  get duration() {
    return this.audio.duration
  }

  set src(url) {
    this.audio.src = url
    this.fileName = url.startsWith("data:audio") ? "data" : url.split("/").pop()
  }

  get src() {
    return this.audio.src
  }

  seek(position) {
    this.audio.currentTime = this.audio.duration * position
  }

  // this can only be called on an interaction event like a click/touch
  async unlock() {
    // https://developers.google.com/web/updates/2016/03/play-returns-promise
    try {
      // if we've preloaded another src, switch src to unlock w/ blank
      if (!this.blank && !this.unlocked) {
        Log.trigger("audioNode:unlockingpreloaded")
        await this.audio.play()
        this.audio.pause()
      } else {
        await this.audio.play()
      }
      Log.trigger("audioNode:unlocked")
      this.unlocked = true
    } catch (err) {
      Log.trigger("audioNode:unlockfailed")
    }
  }

  // https://dev.w3.org/html5/spec-author-view/spec.html#mediaerror
  whileLoading() {
    if (this.audio.b)
      Log.trigger(`audioNode:whileLoading: ${this.audio.buffered.end(0)}`)
  }

  whilePlaying() {
    Log.trigger("audioNode:whilePlaying", {
      currentTime: this.audio.currentTime,
      fileName: this.fileName
    })
    if (this.whilePlayingCallback) {
      this.whilePlayingCallback({
        currentTime: this.audio.currentTime,
        fileName: this.fileName
      })
    }
  }

  play(whilePlayingCallback) {
    this.whilePlayingCallback = whilePlayingCallback
    this.audio.play()
    this.paused = false
  }

  pause() {
    this.audio.pause()
    this.paused = true
  }

  ready() {
    return this.audio.readyState >= 3
  }

  loaded() {
    // don't care about notifying on the blank mp3 loading since it's local
    if (!this.blank) {
      Log.trigger("audioNode:loaded")
    }
  }

  onended() {
    if (!this.blank) {
      Log.trigger("audioNode:ended")
    }
    this.src = blankMP3
  }
}
