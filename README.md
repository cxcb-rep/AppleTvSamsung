# AppleTvSamsung
larp version of apple tv for samsung tvs

A home screen prototype for Samsung Smart TVs running Tizen 6.0. The home screen has six app tiles. Press Down to browse the apps installed on your TV.

To preview the interface, open `index.html` in a browser. On a TV remote, navigate with the arrow keys, OK, and Back. To run the project on a TV, create a Web Application project in Tizen Studio with the `tv-samsung` profile. Copy the HTML, CSS, JavaScript, and `config.xml` from this repository into the project, then run it on a connected TV using a Samsung signing profile.

The background and appearance of the first six tiles come from the [*Sugar* home screen in Apple's Apple TV 4K guide](https://support.apple.com/en-lb/guide/tv/atvb87e1c725/tvos). The image loads from Apple's server. A fallback screen provides the same controls if the image is unavailable. Each tile opens the corresponding installed app when Tizen allows it.
