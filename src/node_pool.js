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
  }

  makePreloadingNode(src, cleanupCallback) {
    const preloader = new AudioNode(src)
    preloader.cleanupCallback = cleanupCallback
    // When we grab nodes we want to grab the preloaded one last
    // so the data that has been preloaded has value for longer
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

    // fires on documunt interaction
    Log.trigger("nodepool:availablenode")
    return audioNode
  }

  // We used to unlock on any body interaction, but there's no point
  // since we only care about being able to play a playlist on click
  //   document.addEventListener("click", () => this.unlockAllAudioNodes(), {
  //     once: true
  //   })
  async unlockAllAudioNodes() {
    Log.trigger("nodepool:unlockall")
    for (const audioNode of this.audioNodes) {
      audioNode.unlock()
    }
  }
}
