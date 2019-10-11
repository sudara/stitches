import Log from './log.js'
import Track from './track.js'

export default class Playlist extends Array {
  constructor(items) {
    super(...items)
    document.addEventListener('click', e => this.click(e))
    document.addEventListener('audioNode:ended', this.playNextTrack)
    this.currentTrack = null;
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

  nextTrack() {
    let currentTrackIndex = this.findIndex(track =>
      this.currentTrack &&
      track.id === this.currentTrack.id
    )
    return this[currentTrackIndex + 1] ? this[currentTrackIndex + 1] : undefined
  }

  playNextTrack = () => {
    let track = this.find(track => track.src === event.target.href)
    let nextTrack = this.nextTrack()
    if (nextTrack) {
      nextTrack.play()
      this.currentTrack = nextTrack;
    }
  }

  async click(event) {
    event.preventDefault()
    if(!this.elements.includes(event.target)) return
    console.log(event)
    let track = this.find(track => track.src === event.target.href)
    this.currentTrack = track;
    await track.play()
  }
}
