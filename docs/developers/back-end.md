# Introduction

Publish back end pages are loaded by [OpenVeo](https://github.com/veo-labs/openveo-core).

As expected by OpenVeo, Publish defines an AngularJS module **ov.publish**.

# Modules

## Main module (**ov.publish**)

Publish main module defines the following routes:

- **/publish/medias-list** to access the catalogue page
- **/publish/media/:mediaId** to access media edition page
- **/publish/properties-list** to access custom properties page
- **/publish/categories-list** to access categories page
- **/publish/configuration** to access publish configuration page

**Nb:** Available services / filters defined in **ov.publish** module are described in the [API](/api/client-back-end/modules/ov.publish.html).
