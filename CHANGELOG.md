# 2.0.3 / 2016-06-21

- enhanced deployment forcing bower using https protocol instead of git

# 2.0.2 / 2016-06-15

- Fix critical issue while publishing and unpublishing video
- Add migration process for default video metadata
- Allow chapters to be selected and removed by group

# 2.0.1 / 2016-06-10

- Add install process for wowza conf
- Add default upload user and default upload group, anonymousId if none.

# 2.0.0 / 2016-05-30

- Upload to Wowza plateform
- Change sources format to play adaptive streaming sources
- Update Webservices for publish entities
- Add Properties type (boolean, list)
- Refactoring taxonomy category by using core taxonomy entities
- Update plugin interface due to API dependencies
- Add Statistics views count 
- Update entities by using new Models from API (Entity and ContentEntity)
- Add Groups and Owner to content entities
- Update Controllers from API Controller interface
- Add migration script
- Avoid collision between core and other plugin
- Update dependencies

# 1.2.0 / 2016-02-19

- Update AngularJS from version 1.4.1 to 1.4.7
- Update html5shiv from version 3.7.2 to 3.7.3
- Add support for Youtube platform
- Add a backup script to save data between upgrades
- Correct availability bug on a video hosted by Vimeo
- Correct cut title translations on chapters editor
- Correct JavaScript when using time bar on chapters editor
- Change the name of the retry permission from "Retry to launch video saving process" to "Retry video processing"
- Immediately update the videos catalog when choosing the action "send to ..."
- Add translation to the player in chapters editor
- Activate auto-play on videos
- Block chapters editor page if an error occured in the player
- Improve display of long titles in chapters editor page

# 1.1.3 / 2015-11-27

Correct bug on video resolution cache for Vimeo platform

# 1.1.2 / 2015-11-25

Update openveo-player dependency to authorize all minor versions from 1.1.0

# 1.1.1 / 2015-11-25

Update dependency versions to authorize all minor versions of @openveo/test, @openveo/core and @openveo/api

# 1.1.0 / 2015-11-24

- Enhanced mobile back-end display
- Update video webservice
- Generate video thumb once video is well uploaded
- Verify that video is available before viewing th video

# 1.0.1 / 2015-10-26

Correct bug on video player view, the player wasn't displayed at all.

# 1.0.0 / 2015-10-26

Firt stable version of [OpenVeo](https://github.com/veo-labs/openveo-core) Publish plugin.

Adds the following features :

- The possibility to upload videos, on [Vimeo](https://vimeo.com), with synchronized images. ([Watcher](/watcher))
- Back end pages :
    - A page to manage the list of videos
    - A page to create and organize video categories
    - A page to create new video properties
    - A page to start / stop the watcher
    - A page to add chapters on a video or cut a video (begin / end)
- A public page to play a video with images synchronization and chapters