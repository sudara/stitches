import Log from './log.js'
import AudioNode from './audio_node.js'

// auto play restrictions are per-element
// https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/
//
// Unlock a few elements, inspired by https://github.com/goldfire/howler.js/pull/1008/files
export default class NodePool extends Array {
  constructor(size) {
    Log.trigger('nodepool:create')
    let nodes = Array.from({ length: size }, () => new AudioNode())
    super(...nodes)
    this.setupEventListeners()
  }

  makePreloadingNode(src) {
    const preloader = new AudioNode(src)
    this.push(preloader)
    return preloader
  }

  async nextAvailableNode() {
    const nodesAvailable = this.filter(node => node.available)
    // if someone clicks play before interacting with document
    if (!nodesAvailable.length) {
      Log.trigger('nodepool:unlockingnode')
      await this[0].unlock()
      return this[0].node
    }
    // fires on documunt interaction
    else {
      Log.trigger('nodepool:availablenode')
      return nodesAvailable[0].node
    }
  }

  unlockAllNodes() {
    Log.trigger('nodepool:unlockall')
    for (let node of this) {
      node.unlock()
    }
  }

  nodeReleased() {
    console.log('TODO please release node')
  }

  setupEventListeners() {
    window.addEventListener("DOMContentLoaded", (event) => {
      document.addEventListener('click', this.unlockAllNodes.bind(this), { once: true, capture: true })
    })
    document.addEventListener('audioNode:ended', this.nodeReleased)
  }
}
