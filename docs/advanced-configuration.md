# Introduction

Configuration files are all in user's directory under **~/.openveo/publish**

- **~/.openveo/publish/publishConf.json**
- **~/.openveo/publish/videoPlatformConf.json**
- **~/.openveo/publish/loggerConf.json**
- **~/.openveo/publish/watcherConf.json**

**Nb :** You must restart OpenVeo servers after modifications.

# Configure the plugin

Open **~/.openveo/publish/publishConf.json**

```json
{
  "videoTmpDir" : "/tmp/videos", // Temporary directory to stock uploading videos (video is removed after the upload)
  "maxConcurrentPublish" : 3, // Maximum number of videos to upload simultaneously
  "metadataFileName" : ".session" // Name of the video metadata file in a tar package
}
```

# Configure video platform credentials

Open **~/.openveo/publish/videoPlatformConf.json**

```json
{
  "vimeo" : { // Vimeo platform configuration
    "clientId" : "vimeo client id (available on vimeo application page https://developer.vimeo.com/apps)",
    "clientSecret" : "vimeo client secret (available on vimeo application page https://developer.vimeo.com/apps)",
    "accessToken" : "vimeo access token (available on vimeo application page https://developer.vimeo.com/apps)"
  },
  "youtube": {
    "uploadMethod": "uploadResumable", // (uploadResumable or uploadClassic; default: uploadResumable)
    "googleOAuth": {
       "clientId": "Youtube API client Id (available in your Google Developper Console )",
       "clientSecret":  "Youtube API client secret (available in your Google Developper Console )",
       "redirectUrl": "http://SERVER_HOST_NAME:SERVER_PORT/be/publish/configuration/googleOAuthAssosiation"
     },
     "privacy": "public" // (public, private or unlisted; default: public)
  },
  "wowza":{
    "protocol": "sftp", // (ftp, sftp, ftps)
    "host": "HOST", //server host where the video will be uploaded
    "port": "PORT", //server host port
    "user": "USERNAME", // server username
    "pwd": "PASSWORD", // server password
    "vodFilePath": "/files/", // path where the video will be uploaded
    "streamPath": "https://HOST/APP_NAME" // stream path exposed by wowza to access video, HOST and APP_NAME are defined in wowza
  },
  "local": {
    "vodFilePath": "/path/to/host/folder/",// path where the video will be uploaded on the local machine
    "streamPath": "stream/path/" //stream path exposed by local server relative to Openveo CDN to access the video
  }
}
```

To upload videos on **Vimeo**, publish requires oauth credentials.<br/>
To upload videos on **Youtube**, publish requires googleOAuth credentials.<br/>
To upload videos on **Wowza**, you need to install **lfpt** on your system.<br/>
To upload videos on **Local Openveo Server**, you need to set this configuration:
```json
{
  "local": {
    "vodFilePath": "/path/to/publish/assets/player/videos/local",// path where the video will be uploaded on the local machine
    "streamPath": "publish/player/videos/local" //stream path exposed by local server to access video, if 
  }
}
```
<br/>

# Configure the logger

Open **~/.openveo/publish/loggerConf.json**

```json
{
  "watcher": { // Watcher logger
    "fileName" : "/var/log/openveo-watcher.log", // Path to log file
    "level" : "info", // Log level
    "maxFileSize" : 1048576, // Maximum log file size (in Bytes)
    "maxFiles" : 2, // Maximum number of files archived
    "console" : false // false to deactivate logs in standard output
  }
}
```

# Configure the [watcher](watcher.md)

Open **~/.openveo/publish/watcherConf.json**

```json
{
  "hotFolders" : [ // List of folders to watch
    {
      "type" : "vimeo", // Video platform to upload to for this hot folder (only local, vimeo, wowza or youtube is supported)
      "path" : "/user/box/hot2" // Path to the hot folder
    },
    {
      "type" : "youtube", // Video platform to upload to for this hot folder (only local, vimeo, wowza or youtube is supported)
      "path" : "/user/box/hot3" // Path to the hot folder
    },
    {
      "type" : "wowza", // Video platform to upload to for this hot folder (only local, vimeo, wowza or youtube is supported)
      "path" : "/user/box/hot4" // Path to the hot folder
    },
    {
      "type" : "local", // Video platform to upload to for this hot folder (only local, vimeo, wowza or youtube is supported)
      "path" : "/user/box/hot5" // Path to the hot folder
    },
    {
      // No video platform specified : let user choose on which platform the video will be uplaoded
      "path" : "/user/box/hot1" // Path to the hot folder
    },
    ...
  ]
}
```

**Nb :** If **type** is missing for a hot folder, videos won't be automatically uploaded to a platform. Videos can be uploaded to a platform from the catalogue of videos in the back end.
