# Player URL parameters

When embedding a video to your website using the **share** action from the catalog of videos you get the iframe code, something like this:

```html
<iframe
  width="768"
  height="500"
  src="https://[my-name.openveo.com]/publish/video/KJaNpqGMd?fullscreen&lang=en"
  frameborder="0"
  allowfullscreen
  webkitallowfullscreen
  mozallowfullscreen
></iframe>
```

Looking at the URL in the `src` attribute we can see two parameters: `fullscreen` and `lang`

Other parameters can be added to the URL, you can find the exhaustive list below.

## template

Indicates the template to use when the video has slides. Could be either `split_50_50`, `split_1`, `split_2` or `split_25_75` (Default to `split_50_50` if video has slides, `split_1` otherwise)

- `split_50_50` the video is displayed next to slides
- `split_25_75` slides are bigger than the video
- `split_1` only the video is displayed
- `split_2` only the slides are displayed

```html
  ?template=split_2
```

## fullscreen

Tells the OpenVeo Player to occupy the whole size of its parent element (Default to `false`).

```html
  ?fullscreen
```

## lang

Player texts language (Default to `en`)

```html
  ?lang=en
```

## auto-play

Indicates if player must automatically start when video is ready. (Default to `false`)

```html
  ?auto-play
```

## remember-position

Indicates if player must automatically start at the time when the video has previously been stopped. (Default to `true`)

```html
  ?remember-position=false
```

## fullscreen-icon

Indicates if fullscreen icon must be displayed or not (Default to `true`).
Note that even if this option is set to true, this icon can be hidden on devices/browsers without support for Javascript Fullscreen API.

```html
  fullscreen-icon=false
```

## volume-icon

Indicates if volume icon must be displayed or not (Default to `true`).

```html
  ?volume-icon=false
```

## template-icon

Indicates if template selector icon must be displayed or not (Default to `true`).

```html
  ?template-icon=false
```

## settings-icon

Indicates if settings icon must be displayed or not (Default to `true`).

```html
  ?settings-icon=false
```

## veo-labs-icon

Indicates if Veo-Labs icon must be displayed or not (Default to `true`).

```html
  ?veo-labs-icon=false
```

## time

Indicates if video time / duration must be displayed or not (Default to `true`).

```html
  ?time=false
```

## chapters

Indicates if chapters must be displayed or not (Default to `true`).

```html
  ?chapters=false
```

## tags

Indicates if tags must be displayed or not (Default to `true`).

```html
  ?tags=false
```

## cuts

Indicates if cuts must be enabled or not (Default to `true`).

```html
  ?cuts=false
```

## t

Indicates the time the player will start at in milliseconds (Default to `0`).

```html
  ?t=2000
```

