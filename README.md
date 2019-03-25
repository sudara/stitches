![](https://travis-ci.com/sudara/stitches6.svg?branch=master)
![stitches6](logo.svg)

Stitching Together MP3 Playback in HTML5 Audio with ES6

## What's the goal?

To provide the best user experience of playling playlists of mp3s on a website.

## Features

Stitches6 is...

* Written in ES6/ES2017
* Lets you decide if you want to babel things or just include in a `<script type=module>`
* Is defensive, but doesn't test for browsers or feature detect
* Completely ignores the Web Audio API (which doesn't allow buffering, therefore useless for music playback)
* Only handles the MP3 format (pragmatically, the only format that matters)
* Assumes you might want to preload one of the tracks
* Assumes you want to have continuous playback of a playlist (preloads next track)
* Assumes you care as much about mobile as you do desktop
* Deals with "unlocking" audio elements from their auto-play restrictions

## Installation

`yarn install stitches6`

## Usage

Via webpacker, you can:

`
import Playlist from 'stitches6'
`

With raw html, you can:

```
<script type='module'>
  import Playlist from './src/playlist.js'
  const playlist = Playlist.newFromSelector('a')
</script>
```

## How does it work?

We stitch together `<audio>` elements to provide a rudimentary (and hopefully excellent) playback experience.

Ideally browsers would be able to play a list of audio tracks. Instead we are stuck with creating individual `<audio>` elements, which in many browsers block from playing until after an user interaction event, such as a click.

From an experience point of view, we want to provide gapless playback of an album or playlist. We definitely don't want to force the user to keep clicking. Ideally, they can open up new browser tabs and do their thing and an album will happily stream in the background.

To mitigate the fact that browsers sabotage this ability, we create a `NodePool` that holds `AudioNodes` (a wrapper around an individual `<audio>` element). On user interaction, we unlock (ie. call `.play()`) on each element in the `NodePool`, using a tiny silent mp3 (it's sketchy on some browsers to call `.play()` with an empty `src`)

For continuous/gapless playback we really only need two `<audio>` elements: One to handle a currently playing track and another to preload the next audio track in. When a file is done playing, the node is released back to the pool.

## Visualizing the object relationships

```
                   ┌-----------┐
                   | Node Pool |
                   └-----------|
                    /    |    \
                   /     |     \
            ┌------┐  ┌------┐  ┌------┐
            | Node |  | Node |  | Node |
            └------┘  └------┘  └------┘
```

## Why?

10 years ago, I launched alonetone.com. Since then, I've written several wrappers around audio libraries such as SoundManager2 and Howler.js, both which are fantastic projects and very much enabled me to launch and maintain the site.

However, as time wore on, I found myself constantly having to keep up with the changes to audio behavior in browsers anyway, and more recently, have found the implementations lacking. In particular, the other libraries.

* Have bloated support of other methods of delivery like Flash and Web Audio
* Don't have first class support for sequential playback of a playlist
* Are written in Ye Olde JS™ vs. ES6/2017
* Are full of browser/feature detection code


## Acknowledgements

* Thanks to [@smoofles](https://twitter.com/smoofles) for the name and logo!
* Thanks to [@scottschiller](https://github.com/scottshiller) for creating [soundmanager](http://www.schillmania.com/projects/soundmanager2/), which had alonetone's back for many many years
* Thanks to [@blackslate](https://github.com/blackslate) for [an example of, and detailed instructions to render](https://gist.github.com/wittnl/8a1a0168b94f3b6abfaa) a small base64 encoded mp3.
* Thanks to [@scottanderson42](https://github.com/scottanderson42) for [the idea of creating a pool of unlocked nodes.](https://github.com/goldfire/howler.js/pull/1008)
