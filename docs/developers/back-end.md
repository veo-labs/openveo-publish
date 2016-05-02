# Introduction

Publish back end pages are loaded by [OpenVeo](https://github.com/veo-labs/openveo-core).

As expected by OpenVeo, Publish defines a module **ov.publish**.

# Modules

## Main module (**ov.publish**)

Publish main module defines the following routes :

- **/publish/videos-list** to access the catalogue page
- **/publish/video/:videoId** to access video edition page
- **/publish/watcher** to access watcher page
- **/publish/properties-list** to access custom properties page
- **/publish/categories-list** to access categories page
- **/publish/configuration** to access publish configuration page

**Nb:** Available services / filters defined in **ov.publish** module are described in the [API](/api/back-end/modules/ov.publish.html).