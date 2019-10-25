import Log from "./log.js"
import NodePool from "./node_pool.js"
import uniqueId from "./unique_id.js"

const pool = new NodePool(2)

export default class Track {
  constructor(element, setCurrentTrack) {
    this.id = uniqueId()
    this.element = element
    this.triggerElement = element.querySelector("a")
    this.url = this.triggerElement.href
    this.progressElement = element.querySelector(".stitches-progress")
    this.playlistSetCurrentTrack = setCurrentTrack
    Log.trigger("track:create")
    this.audioNode = null
    this.triggerElement.addEventListener("click", this.togglePlay.bind(this))
  }

  async preload() {
    // grab node from list
    // make sure this one is last to be unlocked
    Log.trigger("track:preload")
    this.audioNode = pool.makePreloadingNode(
      this.url,
      this.cleanupAudioNode.bind(this)
    )
  }

  async grabNode() {
    Log.trigger("track:grabNodeAndSetSrc")
    this.audioNode = await pool.nextAvailableNode(
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
        await this.audioNode.play(this.whilePlaying.bind(this))
      } else {
        await this.grabNode()
        this.audioNode.src = this.url
        await this.audioNode.play(this.whilePlaying.bind(this))
      }
      Log.trigger("track:playing")
    } catch (err) {
      Log.trigger("track:notplaying")
      Log.trigger(err)
    }
  }

  whilePlaying(data) {
    const position = data.currentTime / this.audioNode.duration
    if (this.progressElement && !Number.isNaN(position)) {
      this.progressElement.value = position
    }
  }

  seek(position) {
    this.audioNode.seek(position)
  }

  pause() {
    this.audioNode.pause()
    Log.trigger("track:pause")
  }

  togglePlay(evt) {
    evt.preventDefault()
    if (this.audioNode && !this.audioNode.paused) {
      this.pause()
    } else {
      this.playlistSetCurrentTrack(this)
    }
  }
}
