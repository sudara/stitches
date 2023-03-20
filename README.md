[![CircleCI](https://circleci.com/gh/sudara/stitches/tree/main.svg?style=svg)](https://circleci.com/gh/sudara/stitches/tree/main)

![stitches](logo.svg)

Stitching Together MP3 Playback in HTML5 Audio with ES6

## The goal

To distill and codify 13+ years experience of building dozens of web music players into a tight, usable library with 0 dependencies.

## Features

* Is written in ES6+
* Deals with "unlocking" audio elements from their auto-play restrictions to enable playlist playback
* Completely ignores the Web Audio API (which doesn't allow buffering, therefore useless for music playback)
* Only handles the MP3 format (pragmatically, the only format that matters)
* Lets you decide if you want to babel things or just include in a `<script type=module>`
* Is defensive, but doesn't test for browsers or feature detect
* Aims to perform well by doing the minimum amount of work necessary

## Assumptions

This is what stitches assumes your default case is:


* You have at least one playlist (you can have more than one on a page)
* You might want to preload one of the tracks
* You'd love to have continuous playback within a playlist (preload upcoming tracks)
* You care as much about mobile as you do desktop
* You might have a SPA or a Rails turbolinks app and don't want to create and destroy `<audio>` tags willy nilly but instead reuse them.


## Things stitches doesn't do (yet?)

* Provide support for a global player
* Deal with volume
* Spport any other format than mp3 (might work, might not, who knows)

## We worked hard so you don't have to

Unfortunately the state of HTML5 Audio support on browsers has not evolved much in the last decade, leaving the API incomplete and unreliable across platforms. Stitches has your back by:

* Unlocking multiple audio nodes on an interaction so you can play through multiple tracks

* Abstracts out and normalizes HTML5 audio events so that they actually work cross-browser (For example, [onended in iOS was broken for years](https://bugs.webkit.org/show_bug.cgi?id=173332)).

* Comes with defaults that enable gapless playback, with an ability to tune.

## Installation

`yarn add  @alonetone/stitches`

## Usage

With a bundler like Webpack you can:

`
import Playlist from 'stitches'
`

With raw html, you can:

```
<script type='module'>
  import Playlist from './src/playlist.js'
  const playlist = Playlist.newFromSelector('a')
</script>
```

## How does it work?

We stitch together `<audio>` elements to provide a seamless (and hopefully excellent) playback experience.

Ideally browsers would be able to play a list of audio tracks. Instead we are stuck with creating individual `<audio>` elements, which in many browsers are each blocked from playing until after an user interaction event, such as a click.

From an experience point of view, we want to provide gapless playback of an album or playlist. We definitely don't want to force the user to keep interacting to get the next song. Ideally, they can open up new browser tabs and do their thing and an album will happily stream in the background.

To mitigate the fact that browsers sabotage this ability, we create a `NodePool` that holds `AudioNodes` (a wrapper around an individual `<audio>` element). On user interaction, we unlock (ie. call `.play()`) on each element in the `NodePool`, using a tiny silent mp3 (it's sketchy on some browsers to call `.play()` with an empty `src`)

For continuous/gapless playback we really only need two `<audio>` elements: One to handle a currently playing track and another to preload the next audio track in. When a file is done playing, the node is released back to the pool.

## Options

The following options can be passed to `new Playlist`

### `tracksSelector`

The only required option. No default, so you need to pass in some selector such as `.track`.

This selector determines which elements are considered to be tracks in this playlist.

The element type doesn't matter. What matters is other selectors such as `playButtonSelector` need to be children of this selector.

### `preloadIndex = -1`

Optional. Defaults to `-1` which doesn't load a track in the playlist.

If set to an integer, it'll preload that index, so `0` will preload the first track in the playlist.

### `playButtonSelector = "a"`

Optional. Defaults to the first `<a>` child of `tracksSelector`.

Which child element of `tracksSelector` should be considered the playButton?

### `progressSelector = "progress"`

Optional. Defaults to the first `progress` child of `tracksSelector` and fails silently if not present.

if the element is a progress element, this will update the attribute called `value` during the `whilePlaying` callback.

For other elements, it will set the element's `style.width` to be the appropriate percentage.

### `seekSelector = "progress"`

Optional. Defaults to the first `progress` child of `tracksSelector` and fails silently if not present.

This will register a click handler on the element so it can be used to seek the track.


### `timeSelector = "time"`

Optional. Defaults to the first `<time>` child of `tracksSelector` and fails silently if not present.

### `whilePlaying`

Optional. No default. Expects a function.

The provided function is called *repeatedly* during a track's playback.

### `onError`

Optional. No default. Expects a function.

The provided function is called if there's a problem with loading or playback.

Good for registering error notification such as Bugsnag, etc.

Returns an attribute named `error` which contains a `name` and a `message` as [described in the standard](https://dev.w3.org/html5/spec-author-view/spec.html#mediaerror).

### `enableConsoleLogging = false`

Optional. Defaults to false, keeping the console nice and clear.

This is also exposed a static setter `Log.logToConsole` in case there's a need for a lil runtime funtime.

## Events Fired 

Stitches emits a number of events to deliver what an app typically expects from a player. Underneath the hook, many of these are built upon [the dumpster fire that is HTML5 audio events](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events), but with additional sanity checks and detail.

### Event detail

The follow event detail are included in all `track` events.

`time`: A Number in seconds specifying how far in the track the audio element has played
`fileName`: A String containing all characters after the last `/` in the mp3 url (or `data` for inline data)
`duration`: A Number in seconds specifying how long the mp3 is
`timeFromEnd`: The number in seconds before the end of the mp3
`percentPlayed`: A float number between 0 and 1.0 specifying the current playback position
`currentTime`: A formatted String representing the elapsed time, such as "0:00" or "1:23"
```

Please be aware that for the earlier events like `track:create` or `track:loading`, most of these values will be 0 or `NaN`, as their values are not yet known.


### Custom event detail

Custom event detail can also be emitted on each of these events when it's specifyed in the html via data attributes. Simply prefix the data attribute with "stitches" and make sure the attribute is on each element of `.tracksSelector`. 

For example, if your tracks are each an `<li>` and have a database track ID you'd like to send with all events, you could specify `<li data-stitches-track-id="5">` and `event.detail` in js will contain a property `trackId` with the value `"5"`.

### List of Events

`track:create`
Fires from the javascript's constructor when a track is found in the DOM.

`track:grabNodeAndSetSrc`
Fired right before the track becomes associated with an audio node, either on preload or right before play.

`track:preload`  
Fires on *attempt* to preload a track in a playlist on page load, if and only if `preloadIndex` is set.

`track:play`  
Fires as soon as `play()` has been called on a track.
Note: This does not mean the track is actively playing yet, only that play has been called.

`track:pause`
Fires when `pause()` is called.

`track:loading`  
An `AudioNode` was assigned for the track and it has been told to play the appropriate url via the src attribute being set.

`track:notPlaying`  
Fired if the attempt to grab an `AudioNode` fails.

`track:playing`  
This is fired as soon as we know for sure the track is actually producing audio and happily playing.
It fires on every transition from a stopped or paused state to a playing one.
Note: it does not fire after seeking if seeking occurred while track was already playing.

`track:whilePlaying`  
This is *repeatedly* called, a few times a second, while a track is actively producing audio.

`track:ended`  
This is called when a track is finished. It does not rely on the somewhat sketchy nature of `<audio>` tag events fired from the browser, it will fire approximately 200ms near the end of the track.

`track:seeked`  
This is called after a track has successfully seeked and is playing again. Note that `track:playing` will not fire.

`track:registerListen`  
After 15% of the track has been played, this fires. This is a good place to hook into for play stats.

## Events Listened To

There are only a few listeners that stiches sets up by default.

`click` is listened to on `playButtonSelector`  
This allows play buttons to be clicked.

`click` is listened to on `seekElement`  
Seeks the track, deriving the track position from the mouse click position within `seekElement`.

`track:seek`  
Seeks the track to the `position` property in the event `detail`.

```
new CustomEvent('track:seek', { 'detail': { 'position': 23.0 }, 'bubbles': true })
```


## Why do we need this library?

10 years ago, I launched alonetone.com. Since then, I've written several wrappers around audio libraries such as SoundManager2 and Howler.js, both which are fantastic projects and enabled me to launch and maintain the site.

However, as time wore on, I found myself constantly having to keep up with the changes to audio behavior in browsers anyway, and more recently, have found the implementations lacking. In particular, other libraries tend to:

* Contain legacy/unrelated support of other methods of delivery like Flash and Web Audio
* Don't have first class support for sequential playback of a playlist
* Are written in Ye Olde JS™ vs. ES6/ES+
* Are full of browser/feature detection code
* Don't have cross browser tests

## Visualizing the object relationships

Each `Playlist` has `Tracks` that communicate to a `NodePool` containing `AudioNode`s.

```
                   ┌-----------┐
                   | Playlist  |
                   └-----------┘
                    /    |    \
                   /     |     \
          ┌-------┐  ┌-------┐  ┌-------┐
          | Track |  | Track |  | Track |
          └-------┘  └-------┘  └-------┘
                         ↓
          hi, can i have an unlocked node plz?
                         ↓
                   ┌----------┐
                   | NodePool |
                   └----------┘
                  /      |     \
                 /       |      \
          ┌------┐    ┌------┐   ┌------┐
         AudioNode   AudioNode  AudioNode
          └------┘    └------┘   └------┘
              |           |          |
           <audio>      <audio>   <audio>
```

These `AudioNode`s map 1-1 with HTML5 audio elements which are "unlocked" on any user interaction. The `NodePool` manages these unlocked `AudioNode`s, supplying them as needed.

Each `NodePool` (there's one per playlist) has exactly 3 `AudioNode`s, which allows for seamless preloading and playback with minimum amount of 🤹🏻‍♂️. For example they might all be in use in this situation:

1. The last track that just played
2. The current track that's playing now
3. The next track that's preloading

## Running tests

Given the somewhat sketchy state of audio playback in browsers (especially Safari), it's absolutely critical to run tests against as many current browsers as possible.

Selenium tests are currently written in [Nightwatch](http://nightwatchjs.org)

The full testing stack is by its nature VERY.... brittle.

There are lots of places things can go wrong: The tests themselves, the testing framework, the webdriver for each browser, selenium, all sorts of infrastructure related things on browserstack's end... the most difficult part of this project is definitely maintaining this testing harness.

### Locally Against Chrome

You can run tests locally with:

`yarn test`

This will run tests against headless chrome as configured in `nightwatch-local.conf.json`.

### Run a single test

```sh
yarn start
yarn test:single --test tests/suites/03_playlist.js
```


### Browserstack

![Sessions Overview - BrowserStack Automate 2020-02-27 00-57-41](https://user-images.githubusercontent.com/472/75399491-9ef3c480-58fc-11ea-802a-301012d23aff.jpg)

We are using Browserstack to run tests against multiple browsers. This is configured in `nightwatch-browserstack.conf.js` and uses a runner defined in `browserstack.runner.js`. Travis is setup to run Browserstack.

Test failures are manually reported via `afterEach` callbacks via Browserstack's API which manually send a request per test case to Browserstack, renaming the name of the test as well as reporting it as `passed` or `failed`.

### Locally against Browserstack

You can also run Browserstack locally (assuming you have the `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY` credentials set as ENV variables)

`yarn browserstack`

This is useful for figuring out why something might be failing on one particular browser. For this use case, I recommend reducing the number of browsers that are being run in package.json, isolating the one browser that is causing problems.

PROTIP: You won't see any "live" output from nightwatch when more than one browser is being run, as in this case tests are being run in parallel and the log output wouldn't be very coherent. If you want to see nightwatch output as it happens, just use one browser.


## Releasing

Bump package number and publish:

```
npm version x.y.z
npm publish
```


## Acknowledgements

* Thanks to [@smoofles](https://twitter.com/smoofles) for the name and logo!
* Thanks to [@scottschiller](https://github.com/scottshiller) for creating [soundmanager](http://www.schillmania.com/projects/soundmanager2/), which had alonetone's back for many many years
* Thanks to [@blackslate](https://github.com/blackslate) for [an example of, and detailed instructions to render](https://gist.github.com/wittnl/8a1a0168b94f3b6abfaa) a small base64 encoded mp3.
* Thanks to [@scottanderson42](https://github.com/scottanderson42) for [the idea of creating a pool of unlocked nodes.](https://github.com/goldfire/howler.js/pull/1008)
