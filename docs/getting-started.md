# Installation

From [OpenVeo](https://github.com/veo-labs/openveo-core) root :

    npm install @openveo/publish

# Configuration

To finalize the installation you need to configure Publish plugin.
Configuration files are all in **node_modules/@openveo/publish/config** directory

- **node_modules/@openveo/publish/config/publishConf.json**
- **node_modules/@openveo/publish/config/videoPlatformConf.json**
- **node_modules/@openveo/publish/config/loggerConf.json**
- **node_modules/@openveo/publish/config/watcherConf.json**

## Configure the plugin

Open **node_modules/@openveo/publish/config/publishConf.json**

```json
{
  "videoTmpDir" : "/tmp/videos", // Temporary directory to stock uploading videos (video is removed after the upload)
  "maxConcurrentPublish" : 3, // Maximum number of videos to upload simultaneously
  "timecodeFileName" : "synchro.xml", // Name of the file containing images synchronization in tar package
  "metadataFileName" : ".session" // Name of the video metadata file in a tar package
}
```

## Configure video platform credentials

Uploading to Vimeo requires oauth credentials.

Open **node_modules/@openveo/publish/config/videoPlatformConf.json**

```json
{
  "vimeo" : { // Vimeo platform configuration
    "clientId" : "vimeo client id (available on vimeo application page https://developer.vimeo.com/apps)",
    "clientSecret" : "vimeo client secret (available on vimeo application page https://developer.vimeo.com/apps)",
    "accessToken" : "vimeo access token (available on vimeo application page https://developer.vimeo.com/apps)"
  }
}
```

## Configure the logger

Open **node_modules/@openveo/publish/config/loggerConf.json**

```json
{
  "watcher": { // Watcher logger
    "fileName" : "/var/log/openveo-watcher.log", // Path to log file
    "level" : "info", // Log level
    "maxFileSize" : 1048576, // Maximum log file size (in Bytes)
    "maxFiles" : 2 // Maximum number of files archived
  },
  "publish" : { // Publish logger
    "fileName" : "var/log/openveo-publish.log", // Path to log file
    "level" : "info", // Log level
    "maxFileSize" : 1048576, // Maximum log file size (in Bytes)
    "maxFiles" : 2 // Maximum number of files archived
  }
}
```

## Configure the [watcher](/watcher)

Open **node_modules/@openveo/publish/config/watcherConf.json**

```json
{
  "hotFolders" : [ // List of folders to watch
    {
      "type" : "vimeo", // Video platform to upload to for this hot folder (only vimeo is supported)
      "path" : "/user/box/hot1" // Path to the hot folder
    },
    {
      "type" : "vimeo", // Video platform to upload to for this hot folder (only vimeo is supported)
      "path" : "/user/box/hot2" // Path to the hot folder
    },
    {
      "type" : "vimeo", // Video platform to upload to for this hot folder (only vimeo is supported)
      "path" : "/user/box/hot3" // Path to the hot folder
    }
    ...
  ]
}
```

**Nb :** If **type** is missing for a hot folder, videos won't be automatically uploaded to Vimeo. Videos can be uploaded to Vimeo from the catalogue of videos in the back end.

# Start / Restart OpenVeo

OpenVeo Publish is now installed. You can start / restart OpenVeo :

    node server.js

# Log to the back end

You can now log to the back end to access Publish plugin administration pages.