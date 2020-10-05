// import Log from './log'
import Log from "./log.js"
import Track from "./track.js"
import NodePool from "./node_pool.js"

const pool = new NodePool(2)

export default class Playlist {

  constructor(options) {
    const {
      preloadIndex = -1,
      tracksSelector,
      playButtonSelector = "a",
      loadingProgressSelector = "progress",
      playProgressSelector = "progress",
      seekSelector= "progress",
      timeSelector = "time",
      whilePlaying,
      onError,
      logToConsole = true,
    } = options
    this.currentTrack = null
    const elements = document.querySelectorAll(tracksSelector)
    if(!elements.length) {
      Log.trigger("tracksSelector not specified or contains no elements")
    }
    this.tracks = [...elements].map(
      el =>
        new Track({
          element: el,
          pool,
          setCurrentTrack: this.setCurrentTrack.bind(this),
          playButtonSelector,
          loadingProgressSelector,
          playProgressSelector,
          seekSelector,
          timeSelector,
          whilePlaying,
          onError
        })
    )
    if (preloadIndex >= 0) this.tracks[preloadIndex].preload()
    document.addEventListener("track:ended", this.playNextTrack.bind(this))
    document.addEventListener(
      "track:preloadNextTrack",
      this.preloadNextTrack.bind(this)
    )
    Log.logToConsole(logToConsole);
  }


  reset() {
    if (this.currentTrack) {
      this.currentTrack.pause()
    }
  }

  nextTrack() {
    const currentTrackIndex = this.tracks.findIndex(
      track => this.currentTrack && track.id === this.currentTrack.id
    )
    return this.tracks[currentTrackIndex + 1]
      ? this.tracks[currentTrackIndex + 1]
      : undefined
  }

  async setCurrentTrack(track) {
    if (this.currentTrack) {
      this.currentTrack.pause()
    }
    this.currentTrack = track
    await this.currentTrack.play()
  }

  trackIsPartOfPlaylist(evt) {
    return this.tracks.some(track => track.id === evt.detail.id)
  }

  async playNextTrack(evt) {
    if (!this.trackIsPartOfPlaylist(evt)) return
    const nextTrack = this.nextTrack()
    if (nextTrack) {
      await nextTrack.play()
      this.currentTrack = nextTrack
    }
  }

  preloadNextTrack(evt) {
    if (!this.trackIsPartOfPlaylist(evt)) return
    const nextTrack = this.nextTrack()
    if (nextTrack) {
      nextTrack.load()
    }
  }
}
