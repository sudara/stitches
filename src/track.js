import Log from "./log.js"
import NodePool from "./node_pool.js"
import uniqueId from "./unique_id.js"

const pool = new NodePool(2)

export default class Track {
  constructor(element, setCurrentTrack) {
    this.id = uniqueId()
    this.url = element.href
    this.element = element
    this.playlistSetCurrentTrack = setCurrentTrack
    Log.trigger("track:create")
    this.audioNode = null
    this.togglePlay = this.togglePlay.bind(this)
    element.addEventListener("click", evt => {
      evt.preventDefault()
      this.togglePlay()
    })
  }

  async preload() {
    // grab node from list
    // make sure this one is last to be unlocked
    Log.trigger("track:preload")
    this.audioNode = pool.makePreloadingNode(this.url)
  }

  async grabNode() {
    Log.trigger("track:grabNodeAndSetSrc")
    this.audioNode = await pool.nextAvailableNode()
  }

  // https://developers.google.com/web/updates/2016/03/play-returns-promise
  async play() {
    Log.trigger("track:play")
    try {
      if (this.preload === true) {
        await this.audioNode.play()
      } else {
        await this.grabNode()
        this.audioNode.src = this.url
        await this.audioNode.play()
      }
      Log.trigger("track:playing")
    } catch (err) {
      Log.trigger("track:notplaying")
      Log.trigger(err)
    }
  }

  pause() {
    this.audioNode.pause()
    Log.trigger("track:pause")
  }

  togglePlay() {
    if (this.audioNode && !this.audioNode.paused) {
      this.pause()
    } else {
      this.playlistSetCurrentTrack(this)
    }
  }
}
