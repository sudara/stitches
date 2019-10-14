import Log from "./log.js"
import AudioNode from "./audio_node.js"

// auto play restrictions are per-element
// https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/
//
// Unlock a few elements, inspired by https://github.com/goldfire/howler.js/pull/1008/files
export default class NodePool {
  constructor(size) {
    Log.trigger("nodepool:create")
    this.audioNodes = Array.from({ length: size }, () => new AudioNode())
    this.audioNodes.forEach(audioNode => {
      audioNode.cleanupCallback = () => {}
    })
    this.setupEventListeners()
  }

  makePreloadingNode(src, cleanupCallback) {
    const preloader = new AudioNode(src)
    preloader.cleanupCallback = cleanupCallback
    // we want to grab the preloaded one last
    this.audioNodes.push(preloader)
    return preloader
  }

  // has Last in Last out behaviour e.g. [a, b, c] -> [b, c, a]
  async nextAvailableNode(cleanupCallback) {
    const audioNode = this.audioNodes.shift()
    // run the cleanup callback to cleanup the previous track
    audioNode.cleanupCallback()
    // attach the cleanup callback for the new track
    audioNode.cleanupCallback = cleanupCallback
    this.audioNodes.push(audioNode)
    // if the node is not unlocked (edge case) then unlock it
    // this happens if someone clicks play before interacting with document
    if (!audioNode.unlocked) {
      Log.trigger("nodepool:unlockingnode")
      await audioNode.unlock()
    }
    // fires on documunt interaction
    Log.trigger("nodepool:availablenode")
    return audioNode
  }

  unlockAllAudioNodes() {
    Log.trigger("nodepool:unlockall")
    for (const audioNode of this.audioNodes) {
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
