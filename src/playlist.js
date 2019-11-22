// import Log from './log'
import Track from "./track.js"

export default class Playlist {
  constructor(options) {
    const { preloadIndex = -1, selector } = options
    this.currentTrack = null
    const elements = document.querySelectorAll(selector)
    this.tracks = [...elements].map(
      el => new Track(el, this.setCurrentTrack.bind(this))
    )
    if (preloadIndex >= 0) this.tracks[preloadIndex].preload()
    document.addEventListener("track:ending", this.playNextTrack.bind(this))
    document.addEventListener(
      "track:preloadNextTrack",
      this.preloadNextTrack.bind(this)
    )
  }

  nextTrack() {
    const currentTrackIndex = this.tracks.findIndex(
      track => this.currentTrack && track.id === this.currentTrack.id
    )
    return this.tracks[currentTrackIndex + 1]
      ? this.tracks[currentTrackIndex + 1]
      : undefined
  }

  setCurrentTrack(track) {
    if (this.currentTrack) {
      this.currentTrack.pause()
    }
    this.currentTrack = track
    this.currentTrack.play()
  }

  async playNextTrack() {
    const nextTrack = this.nextTrack()
    if (nextTrack) {
      await nextTrack.play()
      this.currentTrack = nextTrack
    }
  }

  preloadNextTrack() {
    const nextTrack = this.nextTrack()
    if (nextTrack) {
      nextTrack.load()
    }
  }
}
