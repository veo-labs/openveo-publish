# 12.0.0 / YYYY-MM-DD

## BREAKING CHANGES

- No longer tested on NodeJS &lt; 16.3.0 and NPM &lt; 7.15.1
- Drop support for OpenVeo Core &lt; 10.0.0
- Remove continuous integration with Travis

## NEW FEATURES

- Improve code documentation by replacing Yuidoc by JSDoc

## BUG FIXES

- Fix video loading for Wowza and local providers which wasn't always loading the second time
- Fix unhandled promise rejection in publication process when an error occurred

## DEPENDENCIES

- **chai** has been upgraded from 4.2.0 to **4.3.4**
- **dashjs** has been upgraded from 3.0.3 to **4.1.0**
- **flightplan** has been removed
- **googleapis** has been upgraded from 48.0.0 to **88.2.0**
- **grunt-gh-pages** has been removed
- **grunt-karma** has been removed
- **grunt-mkdocs** has been removed
- **grunt-mocha-test** has been removed
- **karma** has been upgraded from 4.4.1 to **6.3.4**
- **karma-mocha** has been upgraded from 1.3.0 to **2.0.1**
- **mime** has been upgraded from 2.4.4 to **2.5.2**
- **mocha** has been upgraded from 7.1.1 to **9.1.0**
- **request** has been removed
- **shortid** has been replaced by nanoid
- **tinymce** has been upgraded from 5.2.1 to **5.9.1**
- **video.js** has been upgraded from 7.7.5 to **7.15.4**
- **videojs-contrib-dash** has been upgraded from 2.11.0 to **5.1.0**
- **yuidoc** has been replaced by **JSDoc**

# 11.1.1 / 2021-03-03

## BUG FIXES

- Fix message "This media is not yet available on the streaming platform..." appearing when displaying videos stored in Youtube. Bug introcued in version 11.0.3

# 11.1.0 / 2021-01-21

## NEW FEATURES

- Add support for "category" property of tag indexes in tar archives. Actually the property data.tagname was used as the tag name with a fallback to "Tag N". An intermediate fallback has been added with the property "category" as the first fallback if data.tagname is not set.

# 11.0.3 / 2020-11-30

## BUG FIXES

- Fix crash when trying to access a Youtube video while OpenVeo Publish is configured without Youtube configuration. This is a safe guard as it shouldn't be possible to have Youtube videos without Youtube configuration

# 11.0.2 / 2020-11-05

## BUG FIXES

- Fix 7.0.0 and 11.0.0 migrations which weren't working for videos in a transitional state crashing the server. To avoid problems during migration make sure all videos are in a stable state (either "Ready", "Waiting for upload" or "Published"), videos in "Error" should be treated before updating

# 11.0.1 / 2020-05-05

## BUG FIXES

- Fix 11.0.0 migration which wasn't properly migrating chapters / tags with old format

# 11.0.0 / 2020-05-04

## BREAKING CHANGES

- Drop support for NodeJS &lt; 12.4.0 and NPM &lt; 6.9.0
- OpenVeo Publish now requires OpenVeo Core &gte; 9.0.0
- HTTP error code 23 still refers to a failed point of interest update but no longer to a failed point of interest creation, use code 47 for failed point of interest creation and 48 for failed media update
- HTTP error code 26 still refers to a failed points of interests removal but no longer to a failed media update, use code 49 for failed failed media update
- The following HTTP error codes have been removed:
  - 536: Use 522 instead
  - 537: Use 535 instead
  - 539: Use 523 instead
  - 540: Use 538 instead
  - 22: Use 21 instead
  - 24: Use 23, 47 and 48 instead
  - 27: Use 25 instead
  - 28: Use 25 and 26 instead
  - 261: Use 259 instead
  - 263: Use 262 instead
- Web service endpoint GET /videos now expects values of custom properties of type boolean to be 0 and 1 instead of false and true

## NEW FEATURES

- Web service endpoint GET /videos now accepts searchInPois parameter to extend the smart search to tags titles / descriptions and chapters titles / descriptions
- Web service endpoint GET /videos has been improved when looking for a text inside video descriptions when useSmartSearch is set to 1
- The player page now supports URL parameter t to specify a starting time
- Improve textual search on entities by setting the language of the search engine which can make use of this information to sharpen its results. Publish plugin uses the language defined in OpenVeo Core.

## BUG FIXES

- The message indicating that the player is loading was displayed instead of the message indicating that the video is not yet available on the platform
- Fix chapters and tags URL parameters on video URL which wasn't working since version 10.0.0
- Fix 3.0.0 migration script which did not transformed "sources" property of videos into Array (instead of Object), this could led to JavaScript errors when encountering a video created with OpenVeo Publish &lt; 3.0.0
- Fix potential errors when uploading several videos using FTP with the same name (multi-sources). The publication process for these kind of videos could have stayed blocked when videos were uploaded simultaneously.
- Fix error when using custom properties of type "date & time" it wasn't possible to set the value of the property when editing a media

## DEPENDENCIES

- **async** has been upgraded from 2.1.4 to **3.2.0**
- **express** has been upgraded from 4.14.0 to **4.17.1**
- **fluent-ffmpeg** has been upgraded from 2.1.0 to **2.1.2**
- **ftps** has been upgraded from 1.0.0 to **1.1.1**
- **googleapis** has been upgraded from 16.0.0 to **48.0.0**
- **javascript-state-machine** has been upgraded from 2.4.0 to **3.1.0**
- **mime** has been upgraded from 1.3.4 to **2.4.4**
- **request** has been upgraded from 2.79.0 to **2.88.0**
- **shortid** has been upgraded from 2.2.6 to **2.2.15**
- **video.js** has been upgraded from 7.3.0 to **7.7.5**
- **videojs-contrib-dash** has been upgraded from 2.10.0 to **2.11.0**
- **dashjs** has been upgraded from 2.9.2 to **3.0.3**
- **vimeo** has been upgraded from 1.2.0 to **2.1.1**
- **xml2js** has been upgraded from 0.4.17 to **0.4.23**
- **flightplan** has been upgraded from 0.6.19 to **0.6.20**
- **grunt** has been upgraded from 1.0.3 to **1.1.0**
- **grunt-cli** has been upgraded from 1.3.0 to **1.3.2**
- **grunt-contrib-compass** sub dependencies have been upgraded
- **grunt-contrib-uglify** has been upgraded from 4.0.0 to **4.0.1**
- **grunt-contrib-watch** sub dependencies have been upgraded
- **grunt-contrib-yuidoc** sub dependencies have been upgraded
- **grunt-eslint** has been upgraded from 19.0.0 to **22.0.0**
- **grunt-gh-pages** sub dependencies have been upgraded
- **grunt-karma** has been upgraded from 3.0.0 to **3.0.2**
- **grunt-mkdocs** has been upgraded from 1.0.0 to **1.0.1**
- **karma** has been upgraded from 3.1.1 to **4.1.1**
- **karma-chrome-launcher** has been upgraded from 2.2.0 to **3.1.0**
- **karma-firefox-launcher** has been upgraded from 1.1.0 to **1.3.0**
- **karma-ie-launcher** has been removed has no tests are performed on Internet Explorer
- **mocha** has been upgraded from 5.2.0 to **7.1.1**
- **mock-require** has been upgraded from 3.0.2 to **3.0.3**
- **pre-commit** sub dependencies have been upgraded
- **tinymce** has been upgraded from 4.8.4 to **5.2.1**

# 10.2.3 / 2019-10-10

## BUG FIXES

- Fix migration script 10.0.0 which caused the ugrade to hang
- Fix videos blocked with message "This media is not yet available on the streaming platform. Please retry later."

# 10.2.2 / 2019-09-30

## BUG FIXES

- Fix version 10.2.1

# 10.2.1 / 2019-09-30

## BUG FIXES

- Fix Wowza videos playing after changing property streamPath in videoPlatformConf.json file, the old base path was used instead of the new one

# 10.2.0 / 2019-08-23

## NEW FEATURES

- Web service endpoint POST /videos now accepts a info.user parameter to specify the owner of the video that will be used instead of the super administrator

# 10.1.0 / 2019-06-05

## DEPENDENCIES

- **@openveo/player** has been upgraded from 5.0.0 to **5.0.1**

# 10.0.1 / 2019-03-26

## BUG FIXES

- Fix 10.0.0 migration script which was failing if a video didn't have indexes
- Fix message displayed when player is loading, it was saying that the video is not available instead of saying that the video is loading

# 10.0.0 / 2019-03-26

## BREAKING CHANGES

- Web service endpoints GET /videos and /videos/:id now express timecodes small images using a sprite object instead of an URL
- Web service endpoints GET /videos and /videos/:id tag file properties have been renamed: "mimetype" has been renamed into "mimeType", "basePath" has been renamed into "url", "originalname" has been renamed into "originalName" and "filename" has been renamed into "fileName"
- OpenVeo Publish now requires OpenVeo Core >=8.0.0
- Drop support of flash technology for the HTML version of the OpenVeo Player

## NEW FEATURES

- OpenVeo Publish does not use Bower anymore, it now uses NPM for both client and server dependencies
- Translate the HTML version of the OpenVeo Player
- Add browser vendors attributes for fullscreen to the shared iframe code
- Add new parameters to the player public page to have more control on the player:
  - Parameter "remember-position" to force the player to start playing the video at the time the user was last time or not (Default is "remember-position=true")
  - Parameter "fullscreen-icon" to show / hide the fullscreen control (Default is "fullscreen-icon=true")
  - Parameter "volume-icon" to show / hide the volume control (Default is "volume-icon=true")
  - Parameter "template-icon" to show / hide the template selector (Default is "template-icon=true")
  - Parameter "settings-icon" to show / hide the settings control (Default is "settings-icon=true")
  - Parameter "veo-labs-icon" to show / hide the veo-labs logotype (Default is "veo-labs-icon=true")
  - Parameter "time" to show / hide the time and duration (Default is "time=true")
  - Parameter "chapters" to show / hide chapters (Default is "chapters=true")
  - Parameter "tags" to show / hide tags (Default is "tags=true")
  - Parameter "cuts" to enable / disable cuts (Default is "cuts=true")
  - Parameter "template" to set the default template to use from "split_1", "split_2", "split_50_50" and "split_25_75" (Default is "template=split_50_50")

## BUG FIXES

- Fix "grunt remove:doc" which hasn't worked since version 3.0.0
- Fix "auto-play", "type" and "fullscreen" parameter on the player public page which weren't always working
- Fix adding a thumbnail from the catalog of videos when adding a new video which was failing without error. It now sets the package on error if adding the thumbnail failed. This bug appeared in version 6.0.0
- Fix chapters and tags wrong times when adding only one chapter at 0 with several tags or one tag at 0 with several chapters
- Fix server crash when uploading on Youtube failed

## DEPENDENCIES

- **video.js** has been upgraded from 5.19.2 to **7.3.0**
- **dashjs** has been upgraded from 2.6.7 to **2.9.2**
- **videojs-contrib-dash** has been upgraded from 2.9.1 to **2.10.0**
- **videojs-contrib-hls** has been removed. It is replaced by videojs-http-streaming which is a sub dependency of video.js since version 7.0.0
- **angular** has been upgraded from 1.5.5 to **1.5.11**
- **@openveo/player** has been upgraded from 4.0.0 to **5.0.0**

# 9.0.2 / 2019-04-18

## BUG FIXES

- Fix server crash when uploading on Youtube failed

# 9.0.1 / 2018-11-16

## BUG FIXES

- Fix server crash when uploading an invalid video

# 9.0.0 / 2018-10-26

## BREAKING CHANGES

- OpenVeo Publish now requires OpenVeo Core >=7.0.0

## NEW FEATURES

- Web service endpoints GET /properties and GET /videos now accept a "useSmartSearch" parameter which modifies the way search is made. If "useSmartSearch" is activated (this is the default), search will be made using the search mechanism of the storage. If "useSmartSearch" is deactivated it will search using a simple regular expression
- Add a "Owner" search field to the catalog search engine to be able to filter videos by their owner
- Add configuration to specify the number of seconds between two catalog refresh

## BUG FIXES

- Fix texts in configuration page for the "MEDIAS" block (which has been renamed into "WATCHER") as this block does not concern all medias but only medias coming from the watcher

## DEPENDENCIES

- **chai** has been upgraded from 4.0.2 to **4.2.0**
- **chai-spies** has been upgraded from 0.7.1 to **1.0.0**
- **flightplan** has been upgraded from 0.6.17 to **0.6.19**
- **grunt** has been upgraded from 1.0.1 to **1.0.3**
- **grunt-cli** has been upgraded from 1.2.0 to **1.3.0**
- **grunt-contrib-uglify** has been upgraded from 2.0.0 to **4.0.0**
- **grunt-contrib-watch** has been upgraded from 1.0.0 to **1.1.0**
- **grunt-eslint** has been upgraded from 19.0.0 to **21.0.0**
- **grunt-gh-pages** has been upgraded from 2.0.0 to **3.1.0**
- **grunt-karma** has been upgraded from 2.0.0 to **3.0.0**
- **grunt-mkdocs** has been upgraded from 0.2.0 to **1.0.0**
- **grunt-mocha-test** has been upgraded from 0.13.2 to **0.13.3**
- **karma** has been upgraded from 1.3.0 to **3.1.1**
- **karma-chrome-launcher** has been upgraded from 2.0.0 to **2.2.0**
- **karma-firefox-launcher** has been upgraded from 1.0.0 to **1.1.0**
- **mocha** has been upgraded from 3.2.0 to **5.2.0**
- **mock-require** has been upgraded from 3.0.1 to **3.0.2**

# 8.0.0 / 2018-10-16

## BREAKING CHANGES

- OpenVeo Publish now requires OpenVeo Core >=6.0.0

## NEW FEATURES

- Web service endpoint POST /videos has been added to be able to add a new video. Note that if you are using a web server as a frontal of OpenVeo application server, you may have to increase the upload size limit
- Web service endpont POST /videos/:id/publish has been added to be able to publish a video in ready state
- Web service endpont POST /videos/:id/unpublish has been added to be able to unpublish a video in publish state
- Web service endpont POST /videos/platforms has been added to get the list of configured video platforms
- Uploading several videos with the same name is now possible
- The names of videos uploaded through FTP, in tar format, now respect the name of the "name" property of the .session file

## BUG FIXES

- Fix the owner and group of new medias added from the catalogue. Owner was set to the user specified in configuration instead of the user who added the media. Group was set to the group specified in configuration instead of the group specified when adding the media.
- Fix server crash when removing an unstable video through DELETE /videos/:id. It is no longer possible to remove a video in a unstable state (different from "ready", "published", "Waiting for upload" and "Error")
- Fix spelling mistake in french translation of the web service permission "Get video platforms"

# 7.0.1 / 2018-06-21

## BUG FIXES

- Fix medias blocked in *pending* state when uploading more than 3 medias at a time

# 7.0.0 / 2018-06-15

## BREAKING CHANGES

- Web service endpoint GET /videos now validates the *properties* parameter, note that custom properties of type "Date time" accept either a timestamp or a literal date
- Web service endpoint GET /videos now returns records having a date precisely equal to the value of the *dateEnd* parameter instead of strictly anterior records
- OpenVeo Publish now requires OpenVeo Core 5.1.0

## NEW FEATURES

- The date field of a video has been transformed into a date / time field to be able to also specify the time of the video
- Add a new custom property type *dateTime* to store a date time
- Add support for TLS as a media platform like Vimeo, Wowza and Youtube. Custom properties that should be sent to TLS can be configured in configuraton page
- Configuration page no longer save settings on each modification, a button has been added to do it manually
- User without the permission to edit the configuration page won't see configuration page formulars anymore but simple non editable information
- Youtube and Vimeo videos, associated to OpenVeo medias, have now their titles updated when title is updated on OpenVeo
- Youtube videos are now automatically associated to the *Education* category
- Medias search engine has been improved, it is now possible to search between two dates

## BUG FIXES

- Improve texts in configuration page to make it easy to understand
- Fix bug when replacing a file associated to a tag, the old file was kept on the server

## DEPENDENCIES

- **angular-ui-tinymce** has been upgraded from 0.0.18 to **0.0.19**

# 6.0.1 / 2018-05-31

## BUG FIXES

- Fix server crash when uploading files through FTP or administration interface without having previously set Publish configuration in configuration page

# 6.0.0 / 2018-05-04

## BREAKING CHANGES

- OpenVeo Publish now requires OpenVeo Core 5.0.0
- Controller / Model / Provider / Database system has been revised into a Controller / Provider / Storage system with the following important consequences:
  - Web service endpoint GET /videos/:id now return an HTTP code 404 if video is not found
  - Web service endpoint GET /videos/:id now includes information from the video platform
  - Web service endpoint POST /videos/:id has been removed
  - Web service endpoint DELETE /videos/:id now returns property **total** with the number of deleted videos
  - Web service endpoint PUT /properties now returns a property **entities** with the list of added properties and **total** the number of inserted properties
  - Web service endpoint GET /properties/:id now return an HTTP code 404 if property is not found
  - Web service endpoint POST /properties/:id now returns property **total** with value **1** if everything went fine
  - Web service endpoint DELETE /properties/:id now returns property **total** with the number of deleted properties
  - HTTP error codes have changed. See **app/server/controllers/httpErrors.js** for the complete list of error codes
- Drop support for NodeJS &lt; 8.9.4 and NPM &lt; 5.6.0
- Directory assets/player/videos will no longer be saved when executing *npm install*. assets/player/videos should be a symbolic link to a directory outside the project to prevent videos from being deleted when executing *npm install*

## NEW FEATURES

- The preview thumbnail of the video can be specified
- Add lead paragraph field to the video entity
- The date of the video can be defined in add video form &amp; in the edit video form
- Hook **properties.deleted** is now executed when properties have been deleted
- Web service endpoint GET /properties now accepts **include** and **exclude** parameters to filter returned applications fields
- Web service endpoint GET /properties/:id now accepts **include** and **exclude** parameters to filter returned property fields
- Web service endpoint GET /videos now accepts **include** and **exclude** parameters to filter returned videos fields
- Web service endpoint GET /videos/:id now accepts **include** and **exclude** parameters to filter returned video fields
- Add a new permission "Manage all videos" to authorize manipulation of all videos no matter the owner or groups
- Add NPM npm-shrinkwrap.json file

## BUG FIXES

- The video description is now optional
- Fix the time input format (depending on the browser localization) of the editor by replacing the field by three inputs (hours, minutes, seconds)
- Fix OpenVeo Publish upgrade when upgrading from a version prior to version 2.0.0 with more than one media
- Fix 3.0.0 migration by adding ids to chapters so that they can be updated instead of recreated
- Removing a user won't remove the default owner for medias uploaded through the watcher when the owner is not the removed user
- Fix permissions on categories, a user with "add" and "update" privileges on taxonomies could not add / update categories, consequently only the super administrator could create new categories
- Player now displays only the video by default if video stream contains both video and presentation
- The format of dates now respects the language of the administration interface
- The date field in the add form of the catalog is now properly reset when form is submitted
- Fix "Manage Publish configuration" permission which did not authorize the user to manage publish configuration
- Fix "Edit videos" and "Remove videos" permissions, a user without these permissions could access the "edit" and "remove" buttons for a video (even if the actions were blocked)

## DEPENDENCIES

- **dashjs** has been updated from 2.5.0 to **2.6.7**
- **videojs-contrib-dash** has been updated from 2.4.0 to **2.9.0**
- **videojs-contrib-hls** has been updated from 5.5.3 to **5.14.1**

# 5.1.0 / 2018-02-23

## NEW FEATURES

- Defragmentation of fragmented MP4 when importing a new video

# 5.0.1 / 2017-11-15

## BUG FIXES

- A package could be on error when the upload had some difficulty (slow connection, stopping then resuming). This could lead to a package in the error state with code "3" in the catalogue of videos. For this to work you may have to execute "npm install" again on OpenVeo Core.

# 5.0.0 / 2017-10-19

## BREAKING CHANGES

- put /videos has been removed from web service end points

## BUG FIXES

- Fix error when trying to add a video from the catalogue (code 18) while there is no category defined in categories page

# 4.0.1 / 2017-09-15

## BUG FIXES

- Fix CPU issue when uploading a package through FTP which was causing the CPU usage of NodeJS process to explode

# 4.0.0 / 2017-09-12

## BREAKING CHANGES

- Deactivate video auto-play by default. Video auto-play can be activated using the URL parameter "auto-play" when sharing the video

## NEW FEATURES

- Execute functional tests on Travis
- Execute unit tests on Travis
- Some of the permissions in group "Other permissions" have been moved to other groups. "Access properties page" permission has been moved to "Publish: Properties" group. "Access Publish configuration page" permission and "Manage Publish configuration" permission have been moved to a new group "Publish: Configuration". "Access categories page" permission has been moved to a new group "Publish: Categories". "Access videos page" permission has been moved to "Publish: Videos" group. Also note that "Properties" group has been renamed into "Publish: Properties" and "Videos" group has been renamed into "Publish: Videos".
- Rename "Groups" property of a video into "Groups of contents" to avoid possible ambiguity with "Groups of users"
- Add the possibility to upload a video directly from the catalog. **CAUTION**: to use this feature you may have to increase the HTTP limit size of your front end server

## BUG FIXES

- Fix a bug which appeared when opening a line twice in the catalog of videos. The second time custom properties values were reset

## DEPENDENCIES

- **video.js** has been updated from 5.9.2 to **5.19.2**
- **dashjs** has been updated from 2.1.1 to **2.5.0**
- **videojs-contrib-dash** has been updated from 2.4.0 to **2.9.0**
- **videojs-contrib-hls** has been updated from 1.3.11 to **5.5.3**
- **openveo-player** has been updated from 2.&ast; to **3.&ast;**
- **karma-phantomjs-launcher** has been removed
- **chai** has been upgraded from 3.5.0 to **4.0.2**
- **chai-as-promised** has been upgraded from 6.0.0 to **7.1.1**
- **ng-file-upload** has been removed, it is now a dependency of OpenVeo Core
- **multer** has been removed, it is now a dependency of OpenVeo Core

# 3.0.1 / 2017-05-10

## BUG FIXES

- Fix regression introduced in version 3.0.0. Already uploaded videos in old package format (with synchro.xml file) did not display synchronized images anymore

# 3.0.0 / 2017-05-04

## BREAKING CHANGES

- The watcher which used to be a sub process is now integrated inside the OpenVeo process
- Back end page to start / stop the watcher has been removed
- Chapters are no more initiated relatively to slides. User have to define them himself
- Drop support for Node.js &lt;7.4.0
- Drop support for NPM &lt;4.0.5
- Usage of Web Service end points */videos* and */properties* has changed. *page* parameter now starts at 0 instead of 1
- Usage of Web Service end point */publish/videos/{video_id}* has changed. OpenVeo publish now uses OpenVeo CDN url for local videos urls and videos thumbnails instead of relative urls

## NEW FEATURES

- **Search engines** for medias and custom properties have been improved. Multiple search fields have been replaced by a unique field. Search is now case insensitive and search is made on the whole string, not just strings starting with the query. The query string is taken as the whole when searching meaning that special characters aren't interpreted and thus will be searched as is.
- **Rich media tags**. Tags and chapters now embed a WYSIWYG editor. Tags can also be associated with a file that user can upload up to 20MB. These associated information can be previewed before saving modification and are rendered in player views associated with tags and chapters.
- **Rich text description** is now available on the description of videos.
- **Double click** is now possible on the list of chapters to directly open the edit form
- **An error message** is now displayed if removing a chapter or tag failed

## BUG FIXES

- Fix the freeze of packages during a publication process. Sometimes packages could stay stuck in a state (copy, retrieve metadata etc.).
- Fix deprecation warning on compass (_mq.scss file) when installing
- Fix category update. When adding a new category the list of categories in the list of videos wasn't updated if the whole page wasn't refreshed
- Freeze errors in media editor instead of auto hide
- Fix watcher detection issues. Sometimes the watcher didn't detect new files added to the hot folders
- Fix fullscreen for embedded videos. Fullscreen button didn't have any effect

## DEPENDENCIES

### SERVER

- **multer 1.3.0** has been added
- **javascript-state-machine** has been updated from 2.3.5 to **2.4.0**
- **googleapis** has been updated from 5.2.1 to **16.0.0**
- **xml2js** has been updated from 0.4.16 to **0.4.17**
- **request** has been updated from 2.72.0 to **2.79.0**
- **ftps** has been updated from 0.4.7 to **1.0.0**
- **grunt** has been updated from 0.4.5 to **1.0.1**
- **grunt-contrib-uglify** has been updated from 1.0.1 to **2.0.0**
- **grunt-eslint** has been updated from 18.1.0 to **19.0.0**
- **grunt-gh-pages** has been updated from 1.1.0 to **2.0.0**
- **grunt-karma** has been updated from 1.0.0 to **2.0.0**
- **grunt-mkdocs** has been updated from 0.1.3 to **0.2.0**
- **grunt-mocha-test** has been updated from 0.12.7 to **0.13.2**
- **karma** has been updated from 0.13.22 to **1.3.0**
- **karma-chrome-launcher** has been updated from 1.0.1 to **2.0.0**
- **karma-mocha** has been updated from 1.0.1 to **1.3.0**
- **karma-phantomjs-launcher** has been updated from 1.0.0 to **1.0.2**
- **mocha** has been updated from 2.4.5 to **3.2.0**
- **pre-commit** has been updated from 1.1.2 to **1.2.2**
- **chokidar** has been removed
- **glob** has been removed
- **grunt-remove** has been removed
- **grunt-rename** has been removed
- **grunt-extend-config** has been removed
- **grunt-init** has been removed

### CLIENT

- **angular-ui-tinymce 0.0.18** has been added

# 2.1.2 / 2017-01-11

- Patch old richmedia format compatibility
- Add migration script to save existing content in the new format

# 2.1.1 / 2017-01-09

- Patch old mediaId format issue

# 2.1.0 / 2017-01-03

- Add multi-sources video feature
- Add local video upload
- Add delete video from provider when user delete it in Openveo
- Correct and improve watcher behavior

# 2.0.6 / 2016-09-09

- Set media name according to package name on upload

# 2.0.5 / 2016-07-19

- Debug dash video by updating videojs dependencies
- Use package name to create video entity on upload

# 2.0.4 / 2016-07-07

- Avoid conflict for transition view effects
- Debug rights token for chapter edition
- Add Wowza settings in install process

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
