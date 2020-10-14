import Log from "./log.js"
import AudioNode from "./audio_node.js"

// auto play restrictions are per-element
// https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/
//
// Unlock a few elements, inspired by https://github.com/goldfire/howler.js/pull/1008/files
export default class NodePool {
  constructor(size) {
    this.allUnlocked = false
    Log.trigger("nodepool:create")
    this.audioNodes = Array.from({ length: size }, () => new AudioNode())
  }

  // has Last in Last out behaviour e.g. [a, b, c] -> [b, c, a]
  async nextAvailableNode(cleanupCallback, preload=false) {

    // grab the first track in line
    const audioNode = this.audioNodes.shift()

    // run the cleanup callback on it, breaking any relationship with a Track
    if (typeof audioNode.cleanupCallback === "function")
      audioNode.cleanupCallback()

    // attach a fresh cleanup callback for next time
    audioNode.cleanupCallback = cleanupCallback

    // Move the node to the end of the line so it's least likely to get grabbed
    this.audioNodes.push(audioNode)

    // fires on documunt interaction
    Log.trigger("nodepool:availableNode")
    return audioNode
  }

  // We used to unlock on any body interaction, but there's no point
  // since we only care about being able to play a playlist on click
  //   document.addEventListener("click", () => this.unlockAllAudioNodes(), {
  //     once: true
  //   })
  async unlockAllAudioNodes() {
    if (this.allUnlocked) return

    Log.trigger("nodepool:unlockAll")
    for (const audioNode of this.audioNodes) {
      audioNode.unlock()
    }
    this.allUnlocked = true
  }
}
