// import Log from './log'
import Log from "./log.js"
import Track from "./track.js"
import NodePool from "./node_pool.js"

// 3 tracks is exactly the number we need for
// 1 playing, 1 preloading and the last one played in memory
// Browsers will usually HTTP cache the asset anyway
// so there's no need to hang on to too many <audio> nodes
const pool = new NodePool(3)

export default class Playlist {

  constructor(options) {
    this.listenersAreSetup = false

    // Let us construct a Playlist without setting it up
    if (options) this.setup(options)
  }

  // this is idempotent, can be called and recalled
  // allowing a SPA-like app to change which tracks
  // are loaded up in the playlist
  setup(options) {
    const {
      tracksSelector,
      preloadIndex = 0,
      playButtonSelector = "a",
      loadingProgressSelector = "progress",
      playProgressSelector = "progress",
      seekSelector = "progress",
      timeSelector = "time",
      whilePlaying,
      onError,
      enableConsoleLogging = false,
    } = options
    this.reset()
    const elements = document.querySelectorAll(tracksSelector)
    if (!elements.length) {
      Log.trigger("Stiches tracksSelector' not specified or contains no elements")
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
    if(!this.listenersAreSetup) this.setupListeners()
    Log.enableConsoleLogging(enableConsoleLogging);
  }

  reset() {
    if (this.currentTrack) {
      this.currentTrack.pause()
    }
    this.currentTrack = null
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
    if (this.currentTrack && (this.currentTrack !== track)) {
      this.currentTrack.pause()
    }
    this.currentTrack = track
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

  setupListeners() {
    document.addEventListener("track:ended", this.playNextTrack.bind(this))
    document.addEventListener(
      "track:preloadNextTrack",
      this.preloadNextTrack.bind(this)
    )
    this.listenersAreSetup = true
  }
}
