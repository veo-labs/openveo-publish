# Introduction

The Watcher is capable of listening to some directories specified in [plugin's configuration](advanced-configuration.md).

Two types of files can be copied in these directories:

- [tar files](#tar-files)
- [mp4 files](#mp4-files)

Soon after the file has been copied, it will appear in back end catalogue page where all medias are referenced.

![Back end catalogue video](images/screenshots/back-end-catalogue-video.jpg)

# tar files

tar files are used for videos with synchronized images. A valid tar file must contain a **video file**, a **.session** file and a **list of images**.

## .session file

**.session** file is used to store information about the package. It is written in JSON format and must contain at least:

```json
{
  "filename": "video.mp4", // Name of the video file in the package
  "indexes": [ // The list of indexes in the video
    {
      "type": "image", // Index type (could be "image" or "tag")
      "timecode": 0, // Index time (in ms) from the beginning of the video
      "data": { // Index data (only for "image" type)
        "filename": "slide_00000.jpeg" // The name of the image file in the tar
      }
    },
    {
      "type": "tag", // Index type (could be "image" or "tag")
      "timecode": 3208 // Index time (in ms) from the beginning of the video
    },
    ...
  ]
}
```

It can contain some optional properties:

```json
{
  "date": 1425916390, // The date the video was recorded (in Unix epoch time)
  "rich-media": true, // true to indicates that video has associated images ("indexes" property must be present)
  "indexes": [  // An array specifying a list of timecodes, their own type and data associated.
    {
      "timecode": 0, // timecode in ms
      "type": "image", // timecode type (must be "image" or "tag")
      "data": {  // related information to image timecode
        "filename": "slide_00000.jpeg" // filename of image timecode
      }
    },
    {
      "timecode": 9500, // timecode in ms
      "type": "tag", // timecode type (must be "image" or "tag")
      "data": { // Optional - related information for tag timecode
        "tagname": "Very important moment" // tagname to display, if not defined, will be replaced by 'Tag N' where N is the number of the tag
      }
    },
    ...
  ]
}
```
"indexes" property is used to map each video timecode to an image or a tag and must be present if **rich-media** property is set to "true". In this example:

- at time **0ms**, image **slide_00000.jpeg** will be displayed (**slide_00000.jpeg** file must be present in the package)
- a chapter named "**Very important moment**" will be created and will redirect video at time **9500ms**.

**Nb:** All extra properties are kept but won't be used directly by Publish.

## synchro.xml file **(DEPRECATED)**

** The use of this file is deprecated.
This file is used only if indexes information are not in .session file.**

**synchro.xml** file is used to map each images to a video timecode. If **rich-media** property is set to "true" in **.session** file, **synchro.xml** file must be present.

It is written in XML format and must respect the following structure:

```xml
<?xml version="1.0"?>
<player>

  <!-- At time 0ms, image slide_00000.jpeg must be displayed (slide_00000.jpeg must be present in the package) -->
  <synchro id="slide_00000.jpeg" timecode="0"/>

  <!-- At time 1400ms, image slide_00001.jpeg must be displayed (slide_00001.jpeg must be present in the package) -->
  <synchro id="slide_00001.jpeg" timecode="1400"/>

  <!-- At time 9500ms, image slide_00002.jpeg must be displayed (slide_00002.jpeg must be present in the package) -->
  <synchro id="slide_00002.jpeg" timecode="9500"/>

</player>
```

## List of images

A list of images to synchronize with the video as defined in **.session** file.

## Video file

An mp4 file corresponding to the one specified by property **filename** in **.session** file.


# mp4 files

If your video doesn't have associated images, a simple mp4 file will be enough.
