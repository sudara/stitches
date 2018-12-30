import Log from './log.js'
import NodePool from './node_pool.js'

const pool = new NodePool(2)

export default class Track {
  constructor(src) {
    this.src = src
    Log.trigger('track:create')
    this.node = null
  }

  async preload() {
    // grab node from list
    // make sure this one is last to be unlocked
    Log.trigger('track:preload')
    this.node = pool.makePreloadingNode(this.src)
  }

  async grabNode() {
    Log.trigger('track:grabNodeAndSetSrc')
    this.node = await pool.nextAvailableNode()
  }

  // https://developers.google.com/web/updates/2016/03/play-returns-promise
  async play() {
    Log.trigger('track:play')
    try {
      if (this.preload === true) {
        await this.node.play()
      } else {
        await this.grabNode()
        this.node.src = this.src
        await this.node.play()
      }
      Log.trigger('track:playing')
    } catch (err) {
      Log.trigger('track:notplaying')
      Log.trigger(err)
    }
  }
}
