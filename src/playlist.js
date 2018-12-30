import Log from './log.js'
import Track from './track.js'

export default class Playlist extends Array {
  constructor(items) {
    document.addEventListener('click', e => this.click(e))
    super(...items)
  }

  static newFromSelector(selector, { preloadIndex = -1 } = {}) {
    this.selector = selector
    Log.trigger('playlist:newfromselector')
    const elements = document.querySelectorAll(selector)
    const tracks = [...elements].map((el, index) => new Track(el.href))
    if (preloadIndex >= 0) tracks[preloadIndex].preload()
    const playlist = new this(tracks)
    playlist.elements = [...elements]
    return playlist
  }

  listen() {
  }

  async click(e) {
    let event = e
    event.preventDefault()
    if(!this.elements.includes(event.target)) return
    console.log(event)
    let track = this.find(track => track.src === event.target.href)
    await track.play()
  }
}
