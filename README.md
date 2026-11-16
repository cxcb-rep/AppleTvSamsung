# AppleTvSamsung
larp version of apple tv for samsung tvs

A home screen prototype for Samsung Smart TVs running Tizen 6.0. The two rows of app tiles animate as you move between them. Press Up on the first row to expand the background, or Down to reveal the second row. Use **All Apps** on the second row to browse apps installed on the TV.

To preview the interface, open `index.html` in a browser. On a TV remote, navigate with the arrow keys, OK, and Back. To run the project on a TV, create a Web Application project in Tizen Studio with the `tv-samsung` profile. Copy the HTML, CSS, JavaScript, `art` directory, and `config.xml` from this repository into the project, then run it on a connected TV using a Samsung signing profile.

The tiles, clock, shelf, and focus animations are rendered in the app. The bundled background reconstructs the artwork from the [*Sugar* home screen in Apple's Apple TV 4K guide](https://support.apple.com/en-lb/guide/tv/atvb87e1c725/tvos). The full app grid uses a separate wallpaper. The Apple tiles use image regions from the [appearance guide](https://support.apple.com/en-sg/guide/tv/atvb46af4f11/tvos). The public source references Apple's image, and a TV build can use a local copy through `art/tvos-icons.css`. Each shortcut opens the corresponding installed app when Tizen allows it.

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

## Settings

On the Home Screen, move to the rightmost tile and press Down, then OK. You can also open **Settings** from the app list. Settings uses a tvOS-style layout with a fixed Apple TV mark to the left, a focused list to the right, and grouped controls inside sections. The categories follow the [Apple TV 4K guide](https://support.apple.com/en-gb/guide/tv/welcome/26/tvos).

**AppleTvSamsung** settings are saved on the device. They control navigation clicks, transition effects, the Home Screen artwork, menu theme, startup screen, app ordering, focus wrapping, text size, contrast, and reduced motion. The app settings menu includes a confirmation step for restoring defaults. System entries explain where to find the corresponding Samsung controls when available.
