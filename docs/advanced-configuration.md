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
  }
}
```

To upload videos on Vimeo, publish requires oauth credentials.

To upload videos on Youtube, publish requires googleOAuth credentials.

To upload videos on **Wowza**, you need to install **lfpt** package on your system

- [LFTP Homepage]( http://lftp.yar.ru/)

- [LFTP on Windows](https://nwgat.ninja/lftp-for-windows/)

On **Ubuntu**, you can install lftp package by executing the command:

    sudo apt-get install lftp


# Configure the logger

Open **~/.openveo/publish/loggerConf.json**

```json
{
  "watcher": { // Watcher logger
    "fileName" : "/var/log/openveo-watcher.log", // Path to log file
    "level" : "info", // Log level
    "maxFileSize" : 1048576, // Maximum log file size (in Bytes)
    "maxFiles" : 2 // Maximum number of files archived
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

**Nb :** If **type** is missing for a hot folder, videos won't be automatically uploaded to the platform. Videos can be uploaded to the platform from the catalogue of videos in the back end.
