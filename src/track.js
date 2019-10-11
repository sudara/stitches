import Log from './log.js'
import NodePool from './node_pool.js'
import uniqueId from './unique_id.js'

const pool = new NodePool(2)

export default class Track {
  constructor(src) {
    this.id = uniqueId();
    this.src = src
    Log.trigger('track:create')
    this.audioNode = null
  }

  async preload() {
    // grab node from list
    // make sure this one is last to be unlocked
    Log.trigger('track:preload')
    this.audioNode = pool.makePreloadingNode(this.src)
  }

  async grabNode() {
    Log.trigger('track:grabNodeAndSetSrc')
    this.audioNode = await pool.nextAvailableNode()
  }

  // https://developers.google.com/web/updates/2016/03/play-returns-promise
  async play() {
    Log.trigger('track:play')
    try {
      if (this.preload === true) {
        await this.audioNode.play()
      } else {
        await this.grabNode()
        this.audioNode.src = this.src
        await this.audioNode.play()
      }
      Log.trigger('track:playing')
    } catch (err) {
      Log.trigger('track:notplaying')
      Log.trigger(err)
    }
  }
}
