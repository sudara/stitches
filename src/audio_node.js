import Log from './log'

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#Attributes
export default class AudioNode {
  constructor(preloadSrc=null) {
    Log.trigger('node:create')
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

    // A mini BASE64 encoded silent mp3 allows us to .play() to activate
    // nodes without https requests or excess file sizes
    // https://gist.github.com/wittnl/8a1a0168b94f3b6abfaa
    this.blankMP3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV'
    this.node.src = preloadSrc || this.blankMP3
  }

  get available() {
    return this.unlocked && this.blank
  }

  get blank() {
    return this.node.src === this.blankMP3
  }

  // this can only be called on an interaction event like a click/touch
  async unlock() {
    // https://developers.google.com/web/updates/2016/03/play-returns-promise
    try {
      // if we've preloaded another src, switch src to unlock w/ blank
      if(!this.blank && !this.unlocked) {
        Log.trigger('node:unlockingpreloaded')
        await this.node.play()
        this.node.pause()
      } else {
        await this.node.play()
      }
      Log.trigger('node:unlocked')
      this.unlocked = true
    } catch (err) {
      Log.trigger('node:unlockfailed')
    }
  }

  // https://dev.w3.org/html5/spec-author-view/spec.html#mediaerror
  whileLoading() {
    if (this.node.b)
      Log.trigger(`loading: ${this.node.buffered.end(0)}`)
  }

  whilePlaying() {
    Log.trigger(`playing: ${this.node.currentTime}`)
  }

  ready() {
    return this.node.readyState >= 3
  }

  loaded() {
    // don't care about notifying on the blank mp3 loading since it's local
    if(this.node.src !== this.blankMP3) {
      Log.trigger('node:loaded')
    }
  }

  onended() {
    this.unload() // "release" the node back to the pool
  }

  unload() {
    this.node.src = this.blankMP3
  }
}
