import Log from "./log.js"
import AudioNode from "./audio_node.js"

// auto play restrictions are per-element
// https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/
//
// Unlock a few elements, inspired by https://github.com/goldfire/howler.js/pull/1008/files
export default class NodePool extends Array {
  constructor(size) {
    Log.trigger("nodepool:create")
    const audioNodes = Array.from({ length: size }, () => new AudioNode())
    super(...audioNodes)
    this.setupEventListeners()
  }

  makePreloadingNode(src) {
    const preloader = new AudioNode(src)
    this.push(preloader)
    return preloader
  }

  async nextAvailableNode() {
    const audioNodesAvailable = this.filter(node => node.available)
    // if someone clicks play before interacting with document
    if (!audioNodesAvailable.length) {
      Log.trigger("nodepool:unlockingnode")
      await this[0].unlock()
      return this[0]
    }
    // fires on documunt interaction
    Log.trigger("nodepool:availablenode")
    return audioNodesAvailable[0]
  }

  unlockAllAudioNodes() {
    Log.trigger("nodepool:unlockall")
    for (const audioNode of this) {
      audioNode.unlock()
    }
  }

  setupEventListeners() {
    window.addEventListener("DOMContentLoaded", () => {
      document.addEventListener("click", this.unlockAllAudioNodes.bind(this), {
        once: true,
        capture: true
      })
    })
  }
}
