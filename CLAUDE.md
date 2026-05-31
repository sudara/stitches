# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Stitches is a zero-dependency ES6 library for sequential, gapless MP3 playback using HTML5 `<audio>` elements (it deliberately ignores the Web Audio API, which can't buffer). The published package is `@alonetone/stitches`; the entry is `src/index.js` (re-exports `Player` and `Playlist`, with `Playlist` as the default export for back-compat) and only `src/` is shipped. Source is plain ES modules meant to run directly in a browser via `<script type=module>` or through a bundler — there is no build step.

`Player` is the queue-driven, DOM-agnostic API (the current primary surface); `Playlist` is the original selector-based API, kept for back-compat. Both ride the same `PlaybackController` engine.

## Commands

```sh
npm test                       # Playwright across all configured projects (auto-starts http-server on :8080)
npm run test:headed            # same, headed
npm run test:ui                # Playwright UI mode
npm run test:webkit            # just the WebKit project (MP3 only decodes on macOS)
npx playwright test tests/04_player.spec.js   # run a single suite
npm run browserstack           # cross-browser run (needs BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY)
npm run lint                   # eslint (flat config in eslint.config.js; no semicolons — prettier semi:false)
```

Tests are Playwright specs in `tests/*.spec.js`, configured in `playwright.config.js`: chromium uses the real Chrome channel (bundled Chromium lacks MP3), firefox runs on Linux CI behind a userspace PulseAudio null sink (no audio device otherwise), and webkit runs on a macOS runner. Fixtures live in `tests/fixtures/`, shared assertions/helpers in `tests/helpers.js`. The dev/demo page is `index.html`, which wires up two legacy `Playlist` instances against the MP3s in `mp3/`.

## Architecture

Object graph: **`Player`/`Playlist` → many `PlaybackController`s (one per track) → one shared `NodePool` → exactly 3 `AudioNode`s → one `<audio>` each.**

- **`Player`** (`src/player.js`) — queue-driven, imperative, DOM-agnostic facade. The app builds a queue and drives `setQueue`/`play`/`pause`/`next`/`previous`/`jumpTo`/`seek`; the Player owns sequencing and emits namespaced `player:*` CustomEvents on its `eventTarget`. It holds one `PlaybackController` per queued track and routes their engine events through `_onEngineEvent`, tagging each emit with a generation token so a controller from a replaced queue can't mutate current state.
- **`PlaybackController`** (`src/playback_controller.js`) — the DOM-free playback engine extracted from `Track`: leases an `AudioNode`, drives play/pause/seek/load, and runs the timing FSM (~200ms-early ended, <10s preload-next, >15% register-listen), reporting every lifecycle moment through a single injected `emit(event, detail)`. Both `Track` and `Player` build on it.
- **`Playlist`** (`src/playlist.js`) — reads `tracksSelector` from the DOM, builds a `Track` per element, and owns playlist-level sequencing. It listens for `track:ended` (to auto-advance) and `track:preloadNextTrack` (to preload). `setup()` is idempotent so SPAs / Turbolinks apps can re-point a playlist without rebuilding listeners. The `NodePool` is a **module-level singleton shared across all playlists on the page** — not per-instance.
- **`Track`** (`src/track.js`) — bridges a DOM element to an `AudioNode`. Holds playback state (time, position, paused, hasEnded), updates progress/time DOM elements, dispatches the public `track:*` events via `Log`, and reads `data-stitches-*` attributes into `customEventDetail` that rides along on every event. Tracks grab a node from the pool lazily on play/preload and release it via a cleanup callback.
- **`NodePool`** (`src/node_pool.js`) — holds 3 reusable `AudioNode`s (1 playing, 1 preloading, 1 just-played in cache) and hands them out round-robin (shift from front, push to back so the least-recently-used is taken). `unlockAllAudioNodes()` is the key trick: on a user interaction it calls `.play()` on every node to defeat per-element autoplay restrictions.
- **`AudioNode`** (`src/audio_node.js`) — thin wrapper over a single `<audio>`. Unlocked nodes start life playing a tiny base64 silent MP3 (`blankMP3`) so `.play()` succeeds without a network request. Contains most of the cross-browser defensive code: normalizing `onprogress`/`ontimeupdate`/`oncanplaythrough` into clean `whileLoading`/`whilePlaying` callbacks, swallowing Safari seek glitches, working around browsers that skip the final loading event, etc.

### Event & logging system (important for tests)

`Log.trigger(scope, detail, dispatcher)` (`src/log.js`) does triple duty: it dispatches a bubbling `CustomEvent` (the public API consumers listen to), optionally `console.log`s when console logging is enabled, **and appends the message + detail to the `#debug` element if one exists in the DOM** (a legacy hook still present in code). The Playwright tests are the observability layer now: `tests/helpers.js` wraps `EventTarget.prototype.dispatchEvent` to record every `CustomEvent` into `window.__stitchesEvents`, and specs assert against that array (see `events`/`expectEvent`/`expectPlayerPlaying`). So changing the emitted events or their `detail` shape will move tests — update them together.

The public `track:*` and `player:*` event lifecycles and their `event.detail` shapes are documented in `README.md` — keep that in sync when changing emitted events.

## Conventions

- ES modules with explicit `.js` import extensions (required for native browser module loading). No transpilation assumed.
- No semicolons (prettier `semi: false`).
- Cross-browser audio quirks are load-bearing: the seemingly-redundant or contorted code in `AudioNode` is usually a deliberate workaround for a specific browser bug. Existing comments document these — treat them as hazard markers, not noise.
