# Introduction

OpenVeo Publish define its own Web Service endpoints. Web Service authentication is documented in [OpenVeo](https://github.com/veo-labs/openveo-core) project.

Videos can be in different states :

- **0** : The video is on error
- **1** : The video is waiting to be treated
- **2** : The video is copying
- **3** : The video package is extracting
- **4** : The video package is validating
- **5** : The video package is preparing
- **6** : The video is waiting for manual upload
- **7** : The video is uploading to Vimeo
- **8** : The video is being configured on Vimeo
- **9** : The video timecodes are being saved
- **10** : The video synchronized images are being saved
- **11** : The video is uploaded and ready but unpublished
- **12** : The video is uploaded and ready and published
- **13** : The video thumbnail is generated

# Endpoints

## Videos

Get videos.

    GET WEB_SERVICE_URL/publish/videos

Name | Type | Required | Default | Details
---- | ---- | ---- | ---- | ----
sortBy | String | No | date | Sort videos by either **title**, **description**, **date** or **published**
sortOrder | String | No | desc | Sort order (either **asc** or **desc**)
limit | Number | No | 10 | Limit number of videos per page
page | Number | No | 1 | The expected page
properties | Array | No | - | A list of properties with the property name as the key and the expected property value as the value. (e.g. **properties[property1Name]=property1Value**)

HTTP Status Code | Details
---- | ----
500 | An error occured on the server side
200 | Got the list of videos (even if the list is empty)

```json
{
  "videos" : [
    {
      "id" : 1444396683105, // Id of the video
      "state" : 12, // Video state
      "date" : 1425916390000, // Date in timestamp
      "metadata" : {
        // All metadata from package .session file
      },
      "type" : vimeo, // Video associated platform (only vimeo is supported)
      "errorCode" : -1, // Video error code or -1 if no error
      "category" : "", // Video category
      "properties" : { // Video custom properties
        "1444809111034": { // Custom property id
          "id" : 1444809111034, // Custom property id
          "name" : "Property name", // Custom property name
          "description" : "Property description", // Custom property description
          "type" : "text", // Custom property type
          "value" : "Property value" // Custom property value
        }
        ...
      },
      "packageType" : "tar", // Initialize package type (either tar or mp4)
      "link" : "/publish/video/1444396683105", // Path to play the video
      "mediaId" : "141902178", // Video id on Vimeo
      "available" : 1, // Video id on Vimeo
      "thumbnail" : "/1444396683105/thumbnail.jpg",
      "files" : [ // Video files in different format
        {
          "quality" : 100, // Video file quality
          "width" : 480, // Video width
          "height" : 270, // Video height
          "link" : "https://player.vimeo.com/external/141902178.mobile.mp4?s=e5e51fa4d4d5437f6b0fe33d5c789624&profile_id=116&oauth2_token_id=54813546", // Video link
        }
        ...
      ],
      "title" : "Video title",
      "description" : "Video title",
      "chapters" : [ // Chapters
        {
          "name" : "Chapter 1", // Chapter name
          "description" : "Chapter 1", // Chapter description
          "value" : 0.04 // Chapter timecode in percent (percentage of the video)
        },
        {
          "name" : "Chapter 2", // Chapter name
          "description" : "Chapter 2", // Chapter description
          "value" : 0.3 // Chapter timecode in percent (percentage of the video)
        }
      ],
      "cut" : [ // Cut information (begin and end)
        {
          "type" : "begin", // Cut type
          "value" : 0 // Begin timecode (percentage of the media)
        },
        {
          "type" : "end", // Cut type
          "value" : 0.9 // End timecode (percentage of the media)
        }
      ]
    }
  ]
}
```

---

Get information about a video.

    GET WEB_SERVICE_URL/publish/video/{video_id}

Name | Type | Required | Default | Details
---- | ---- | ---- | ---- | ----
video_id | String | Yes | - | The id of the video to fetch

HTTP Status Code | Details
---- | ----
500 | An error occured on the server side
400 | The id of the video is missing
200 | Got the video

```json
{
  "video" : {
    "id" : 1444396683105, // Id of the video
    "state" : 12, // Video state
    "date" : 1425916390000, // Date in timestamp
    "metadata" : {
      // All metadata from package .session file
    },
    "type" : vimeo, // Video associated platform (only vimeo is supported)
    "errorCode" : -1, // Video error code or -1 if no error
    "category" : "", // Video category
    "properties" : { // Video custom properties
      "1444809111034" : "Property value" // Custom property value by id
      ...
    },
    "packageType" : "tar", // Initialize package type (either tar or mp4)
    "link" : "/publish/video/1444396683105", // Path to play the video
    "mediaId" : "141902178", // Video id on Vimeo
    "available" : 1, // Video id on Vimeo
    "thumbnail" : "/1444396683105/thumbnail.jpg",
    "files" : [ // Video files in different format
      {
        "quality" : 100, // Video file quality
        "width" : 480, // Video width
        "height" : 270, // Video height
        "link" : "https://player.vimeo.com/external/141902178.mobile.mp4?s=e5e51fa4d4d5437f6b0fe33d5c789624&profile_id=116&oauth2_token_id=54813546", // Video link
      }
      ...
    ],
    "title" : "Video title",
    "description" : "Video title",
    "chapters" : [ // Chapters
      {
        "name" : "Chapter 1", // Chapter name
        "description" : "Chapter 1", // Chapter description
        "value" : 0.04 // Chapter timecode in percent (percentage of the video)
      },
      {
        "name" : "Chapter 2", // Chapter name
        "description" : "Chapter 2", // Chapter description
        "value" : 0.3 // Chapter timecode in percent (percentage of the video)
      }
    ],
    "cut" : [ // Cut information (begin and end)
      {
        "type" : "begin", // Cut type
        "value" : 0 // Begin timecode (percentage of the media)
      },
      {
        "type" : "end", // Cut type
        "value" : 0.9 // End timecode (percentage of the media)
      }
    ],
    "timecodes" : [ // Video synchronized images
      {
        "image" : {
          "large" : "/1440175380631/slide_00000.jpeg", // Large image
          "small" : "/1440175380631/slide_00000.jpeg?thumb=small" // Small image
        },
        "timecode" : 0 // Timecode when to display the image (in ms)
      },
      {
        "image" : {
          "large" : "/1440175380631/slide_00001.jpeg", // Large image
          "small" : "/1440175380631/slide_00001.jpeg?thumb=small" // Small image
        },
        "timecode" : 1400 // Timecode when to display the image (in ms)
      }
      ...
    ]
  }
}
```