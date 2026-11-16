# AppleTvSamsung
larp version of apple tv for samsung tvs

A home screen prototype for Samsung Smart TVs running Tizen 6.0. The home screen has six app tiles. Press Down to browse the apps installed on your TV.

To preview the interface, open `index.html` in a browser. On a TV remote, navigate with the arrow keys, OK, and Back. To run the project on a TV, create a Web Application project in Tizen Studio with the `tv-samsung` profile. Copy the HTML, CSS, JavaScript, and `config.xml` from this repository into the project, then run it on a connected TV using a Samsung signing profile.

The background and appearance of the first six tiles come from the [*Sugar* home screen in Apple's Apple TV 4K guide](https://support.apple.com/en-lb/guide/tv/atvb87e1c725/tvos). The image loads from Apple's server. A fallback screen provides the same controls if the image is unavailable. Each tile opens the corresponding installed app when Tizen allows it.

## Navigation audio

A build can play three local cues: `focus` when moving between tiles, `open` on selection, and `back` when returning from the app list. Set these keys to relative audio paths in `sound-files.js` and include your audio files in the package. For example:

```js
window.appleTvSamsungSoundFiles = {
  focus: "audio/focus.wav",
  open: "audio/open.wav",
  back: "audio/back.wav"
};
```

The public source uses an empty sound map. Apple’s original audio is demonstrated in [Designing Sound at WWDC17](https://developer.apple.com/videos/play/wwdc2017/803/?time=1519).
