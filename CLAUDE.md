# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Stitches is a zero-dependency ES6 library for sequential, gapless MP3 playback using HTML5 `<audio>` elements (it deliberately ignores the Web Audio API, which can't buffer). The published package is `@alonetone/stitches`; `main` is `src/playlist.js` and only `src/` is shipped. Source is plain ES modules meant to run directly in a browser via `<script type=module>` or through a bundler — there is no build step.

## Commands

```sh
yarn start                                          # background http-server on :8080 (serves repo root + index.html demo)
yarn stop                                           # pkill the http-server
yarn test                                           # start server, run all suites against headless Chrome, then stop
yarn test:single --test tests/suites/03_playlist.js # start server + run one suite (does NOT auto-stop; run `yarn stop` after)
yarn browserstack                                   # cross-browser run (needs BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY)
npx eslint src                                       # lint (airbnb-base + prettier; no semicolons — see .eslintrc / prettier config)
```

Local tests are driven by Nightwatch + chromedriver, configured in `nightwatch-local.conf.json` (suites in `tests/suites/`, custom assertions in `tests/custom_assertions/`, custom commands in `tests/custom_commands/`). The dev/test page is `index.html`, which wires up two `Playlist` instances against the MP3s in `mp3/`.

## Architecture

Object graph: **`Playlist` → many `Track`s → one shared `NodePool` → exactly 3 `AudioNode`s → one `<audio>` each.**

- **`Playlist`** (`src/playlist.js`) — reads `tracksSelector` from the DOM, builds a `Track` per element, and owns playlist-level sequencing. It listens for `track:ended` (to auto-advance) and `track:preloadNextTrack` (to preload). `setup()` is idempotent so SPAs / Turbolinks apps can re-point a playlist without rebuilding listeners. The `NodePool` is a **module-level singleton shared across all playlists on the page** — not per-instance.
- **`Track`** (`src/track.js`) — bridges a DOM element to an `AudioNode`. Holds playback state (time, position, paused, hasEnded), updates progress/time DOM elements, dispatches the public `track:*` events via `Log`, and reads `data-stitches-*` attributes into `customEventDetail` that rides along on every event. Tracks grab a node from the pool lazily on play/preload and release it via a cleanup callback.
- **`NodePool`** (`src/node_pool.js`) — holds 3 reusable `AudioNode`s (1 playing, 1 preloading, 1 just-played in cache) and hands them out round-robin (shift from front, push to back so the least-recently-used is taken). `unlockAllAudioNodes()` is the key trick: on a user interaction it calls `.play()` on every node to defeat per-element autoplay restrictions.
- **`AudioNode`** (`src/audio_node.js`) — thin wrapper over a single `<audio>`. Unlocked nodes start life playing a tiny base64 silent MP3 (`blankMP3`) so `.play()` succeeds without a network request. Contains most of the cross-browser defensive code: normalizing `onprogress`/`ontimeupdate`/`oncanplaythrough` into clean `whileLoading`/`whilePlaying` callbacks, swallowing Safari seek glitches, working around browsers that skip the final loading event, etc.

### Event & logging system (important for tests)

`Log.trigger(scope, detail, dispatcher)` (`src/log.js`) does triple duty: it dispatches a bubbling `CustomEvent` (the public API consumers listen to), optionally `console.log`s when console logging is enabled, **and appends the message + detail to the `#debug` element if one exists in the DOM.** The Nightwatch tests assert against the text content of `#debug` — that element is the test observability layer. This is why ordering and formatting inside `payload()` / log calls matter, and why several comments say things like "Achtung, the browser tests rely on this.time being logged first." Don't reorder or reformat logged detail without checking the custom assertions (`tests/custom_assertions/playing.js` parses it with regexes).

The public `track:*` event lifecycle and their `event.detail` shape are documented in `README.md` — keep that in sync when changing emitted events.

## Conventions

- ES modules with explicit `.js` import extensions (required for native browser module loading). No transpilation assumed.
- No semicolons (prettier `semi: false`).
- Cross-browser audio quirks are load-bearing: the seemingly-redundant or contorted code in `AudioNode` is usually a deliberate workaround for a specific browser bug. Existing comments document these — treat them as hazard markers, not noise.
