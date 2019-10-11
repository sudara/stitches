import Log from './log.js'

// A mini BASE64 encoded silent mp3 allows us to .play() to activate
// nodes without requests or excess file sizes
// https://gist.github.com/wittnl/8a1a0168b94f3b6abfaa
const blankMP3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV'

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#Attributes
export default class AudioNode {
  constructor(preloadSrc=null) {
    Log.trigger('audioNode:create')
    this.unlocked = false
    this.loadNext = null
    this.node = new Audio()
    this.node.preload = preloadSrc ? 'auto': 'none'
    this.node.autoplay = false
    // https://developer.mozilla.org/en-US/docs/Web/Apps/Fundamentals/Audio_and_video_delivery/Cross-browser_audio_basics
    this.node.onprogress = this.whileLoading.bind(this)
    this.node.ontimeupdate = this.whilePlaying.bind(this)
    this.node.onended = this.onended.bind(this)
    this.node.oncanplaythrough = this.loaded.bind(this)
    this.node.src = preloadSrc || blankMP3
  }

  get available() {
    return this.unlocked && this.blank
  }

  get blank() {
    return this.node.src === blankMP3
  }

  // this can only be called on an interaction event like a click/touch
  async unlock() {
    // https://developers.google.com/web/updates/2016/03/play-returns-promise
    try {
      // if we've preloaded another src, switch src to unlock w/ blank
      if(!this.blank && !this.unlocked) {
        Log.trigger('audioNode:unlockingpreloaded')
        await this.node.play()
        this.node.pause()
      } else {
        await this.node.play()
      }
      Log.trigger('audioNode:unlocked')
      this.unlocked = true
    } catch (err) {
      Log.trigger('audioNode:unlockfailed')
    }
  }

  // https://dev.w3.org/html5/spec-author-view/spec.html#mediaerror
  whileLoading() {
    if (this.node.b)
      Log.trigger(`audioNode:whileLoading: ${this.node.buffered.end(0)}`)
  }

  whilePlaying() {
    Log.trigger(`audioNode:whilePlaying: ${this.node.currentTime}`)
  }

  ready() {
    return this.node.readyState >= 3
  }

  loaded() {
    // don't care about notifying on the blank mp3 loading since it's local
    if(this.node.src !== blankMP3) {
      Log.trigger('audioNode:loaded')
    }
  }

  onended() {
    if (this.node.src !== blankMP3) {
      Log.trigger('audioNode:ended')
    }
    this.node.src = blankMP3
  }
}
