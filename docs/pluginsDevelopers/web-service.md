# Introduction

OpenVeo Publish defines its own Web Service endpoints. Web Service authentication is documented in [OpenVeo](https://github.com/veo-labs/openveo-core) project.

# Endpoints

## Videos

Get videos.

    GET WEB_SERVICE_URL/publish/videos

Name | Type | Required | Default | Details
---- | ---- | ---- | ---- | ----
query | String | No | - | To search on both videos title and description
states | String/Array | No | - | To filter videos by state
dateStart | String/Number | No | - | To get videos after or equal to a date (in any format supported by JavaScript Date object)
dateEnd | String/Number | No | - | To get videos before a date (in any format supported by JavaScript Date object)
categories | String/Array | No | - | To filter videos by category
groups | String/Array | No | - | To filter videos by group
sortBy | String | No | date | To sort videos by either **title**, **description**, **date**, **state**, **views** or **category**
sortOrder | String | No | desc | Sort order (either **asc** or **desc**)
page | Number | No | 0 | The expected page
limit | Number | No | - | To limit the number of videos per page. If not specified get all videos
properties | Object | No | - | A list of custom properties with the property id as the key and the expected property value as the value. (e.g. **properties[property1Id]=property1Value**)


HTTP Status Code | Details
---- | ----
200 | Got the list of videos (even if the list is empty)
500 | An error occured on the server side
400 | Wrong list of parameters
401 | Authentication to the web service failed
403 | Authorization forbidden for this end point

```json
{
  "entities" : [
    {
      "id" : 1444396683105, // Id of the video
      "state" : 12, // Video state
      "date" : 1425916390000, // Date in timestamp
      "type" : "vimeo", // Video associated platform
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
      "link" : "http://openveo.local/publish/video/1444396683105", // Path to play the video
      "mediaId" : "141902178", // Video id on video platform
      "available" : true, // Indicates if video is available or is being encoded
      "thumbnail" : "http://openveo-cdn.local/1444396683105/thumbnail.jpg",
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
      "tags" : [ // Tags
        {
          "name" : "Tag 1", // Tag name
          "description" : "Tag 1 description", // Tag description
          "value" : 0.04 // Tag timecode in percent (percentage of the video)
        },
        {
          "name" : "Tag 2", // Tag name
          "description" : "Tag 2 description", // Tag description
          "value" : 0.3, // Tag timecode in percent (percentage of the video)
          "file" : { // Tag associated file
            "mimetype" : "video/mp4",
            "basePath" : "http://openveo-cdn.local/path/to/ressource/video.mp4",
            "originalname" : "original-name.mp4"
          }
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
            "large" : "http://openveo-cdn.local/1440175380631/slide_00000.jpeg", // Large image
            "small" : "http://openveo-cdn.local/1440175380631/slide_00000.jpeg?thumb=small" // Small image
          },
          "timecode" : 0 // Timecode when to display the image (in ms)
        },
        {
          "image" : {
            "large" : "http://openveo-cdn.local/1440175380631/slide_00001.jpeg", // Large image
            "small" : "http://openveo-cdn.local/1440175380631/slide_00001.jpeg?thumb=small" // Small image
          },
          "timecode" : 1400 // Timecode when to display the image (in ms)
        }
        ...
      ]
    }
  ],
  "pagination": {
    "limit": 1,
    "page": 0,
    "pages": 2,
    "size": 2
  }
}
```

Videos can be in different states:

- **0** : The video is on error
- **1** : The video is waiting to be treated
- **2** : The video is copying
- **3** : The video package is extracting
- **4** : The video package is validating
- **5** : The video package is preparing
- **6** : The video is waiting for manual upload
- **7** : The video is uploading to the video platform
- **8** : The video is being configured on the video platform
- **9** : The video timecodes are being saved
- **10** : The video synchronized images are being saved
- **11** : The video is uploaded and ready but unpublished
- **12** : The video is uploaded, ready and published
- **13** : The video thumbnail is generated
- **14** : The video metadatas are being retrieved

---

Get information about a video.

    GET WEB_SERVICE_URL/publish/videos/{video_id}

Name | Type | Required | Default | Details
---- | ---- | ---- | ---- | ----
video_id | String | Yes | - | The id of the video to fetch

HTTP Status Code | Details
---- | ----
200 | Got the video
500 | An error occured on the server side
400 | The id of the video is missing
401 | Authentication to the web service failed
403 | Authorization forbidden for this end point

```json
{
  "entity" : {
    "id" : 1444396683105, // Id of the video
    "state" : 12, // Video state
    "date" : 1425916390000, // Date in timestamp
    "type" : "vimeo", // Video associated platform
    "errorCode" : -1, // Video error code or -1 if no error
    "category" : "", // Video category
    "properties" : { // Video custom properties
      "1444809111034" : "Property value" // Custom property value by id
      ...
    },
    "packageType" : "tar", // Initialize package type (either tar or mp4)
    "link" : "http://openveo.local/publish/video/1444396683105", // Path to play the video
    "mediaId" : "141902178", // Video id on video platform
    "available" : true, // Indicates if video is available or is being encoded
    "thumbnail" : "http://openveo-cdn.local//1444396683105/thumbnail.jpg",
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
    "tags" : [ // Tags
      {
        "name" : "Tag 1", // Tag name
        "description" : "Tag 1 description", // Tag description
        "value" : 0.04 // Tag timecode in percent (percentage of the video)
      },
      {
        "name" : "Tag 2", // Tag name
        "description" : "Tag 2 description", // Tag description
        "value" : 0.3, // Tag timecode in percent (percentage of the video)
        "file" : { // Tag associated file
          "mimetype" : "video/mp4",
          "basePath" : "http://openveo-cdn.local/path/to/ressource/video.mp4",
          "originalname" : "original-name.mp4"
        }
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
          "large" : "http://openveo-cdn.local/1440175380631/slide_00000.jpeg", // Large image
          "small" : "http://openveo-cdn.local/1440175380631/slide_00000.jpeg?thumb=small" // Small image
        },
        "timecode" : 0 // Timecode when to display the image (in ms)
      },
      {
        "image" : {
          "large" : "http://openveo-cdn.local/1440175380631/slide_00001.jpeg", // Large image
          "small" : "http://openveo-cdn.local/1440175380631/slide_00001.jpeg?thumb=small" // Small image
        },
        "timecode" : 1400 // Timecode when to display the image (in ms)
      }
      ...
    ]
  }
}
```

---

Add video information.

    PUT WEB_SERVICE_URL/publish/videos

HTTP Status Code | Details
---- | ----
200 | The video has been added
500 | An error occured on the server side
400 | Wrong PUT parameters
401 | Authentication to the web service failed
403 | Authorization forbidden for this end point

```json
{
  "entity" : {
    "id" : 1444396683105, // Id of the video
    "state" : 12, // Video state
    ...
  }
}
```

---

Update a video.

    POST WEB_SERVICE_URL/publish/videos/{video_id}

HTTP Status Code | Details
---- | ----
200 | The video has been updated
500 | An error occured on the server side
400 | Missing the video id
401 | Authentication to the web service failed
403 | Authorization forbidden for this end point

```json
{
  "error": null,
  "status": "ok"
}
```

---

Delete a video.

    DELETE WEB_SERVICE_URL/publish/videos/{video_id}

HTTP Status Code | Details
---- | ----
200 | The video has been deleted
500 | An error occured on the server side
400 | Missing the video id
401 | Authentication to the web service failed
403 | Authorization forbidden for this end point

```json
{
  "error": null,
  "status": "ok"
}
```

## Properties

Get custom properties.

    GET WEB_SERVICE_URL/publish/properties

Name | Type | Required | Default | Details
---- | ---- | ---- | ---- | ----
query | String | No | - | To search on both properties name and description
types | String/Array | No | - | To filter properties by type
sortBy | String | No | name | To sort properties by either **name** or **description**
sortOrder | String | No | desc | Sort order (either **asc** or **desc**)
page | Number | No | 0 | The expected page
limit | Number | No | - | To limit the number of properties per page. If not specified get all properties

HTTP Status Code | Details
---- | ----
200 | Got the list of properties (even if the list is empty)
500 | An error occured on the server side
400 | Wrong list of parameters
401 | Authentication to the web service failed
403 | Authorization forbidden for this end point

```json
{
  "entities": [
    {
      "id": "4JMy6htjpe",
      "name": "Property name",
      "description": "Property description",
      "type": "text"
    },
    {
      "id": "4JMy6htjpe",
      "name": "Property name",
      "description": "Property description",
      "type": "list",
      "values": ["value1", "value2"]
    }
  ],
  "pagination": {
    "limit": 1,
    "page": 0,
    "pages": 2,
    "size": 2
  }
}
```

---

Get information about a property.

    GET WEB_SERVICE_URL/publish/properties/{property_id}

Name | Type | Required | Default | Details
---- | ---- | ---- | ---- | ----
property_id | String | Yes | - | The id of the property to fetch

HTTP Status Code | Details
---- | ----
200 | Got the property
500 | An error occured on the server side
400 | The id of the property is missing
401 | Authentication to the web service failed
403 | Authorization forbidden for this end point

```json
{
  "entity": {
    "id": "NyiBTYjTe",
    "name": "Property name",
    "description": "Property description",
    "type": "text"
  }
}
```

---

Get the list of properties types.

    GET WEB_SERVICE_URL/publish/propertiesTypes

HTTP Status Code | Details
---- | ----
200 | Got the list of properties types

```json
{
  "types": [
    "text",
    "list"
  ]
}
```

---

Add a property.

    PUT WEB_SERVICE_URL/publish/properties

HTTP Status Code | Details
---- | ----
200 | The property has been added
500 | An error occured on the server side
400 | Wrong PUT parameters
401 | Authentication to the web service failed
403 | Authorization forbidden for this end point

```json
{
  "entity": {
    "id": "NyiBTYjTe",
    "name": "Property name",
    "description": "Property description",
    "type": "text"
  }
}
```

---

Update a property.

    POST WEB_SERVICE_URL/publish/properties/{property_id}

HTTP Status Code | Details
---- | ----
200 | The property has been updated
500 | An error occured on the server side
400 | Missing the property id
401 | Authentication to the web service failed
403 | Authorization forbidden for this end point

```json
{
  "error": null,
  "status": "ok"
}
```

---

Delete a property.

    DELETE WEB_SERVICE_URL/publish/properties/{property_id}

HTTP Status Code | Details
---- | ----
200 | The property has been deleted
500 | An error occured on the server side
400 | Missing the property id
401 | Authentication to the web service failed
403 | Authorization forbidden for this end point

```json
{
  "error": null,
  "status": "ok"
}
```
