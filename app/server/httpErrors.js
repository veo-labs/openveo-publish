"use strict"

// HTTP Error codes
module.exports = {
  
  // General errors
  UNKNOWN_ERROR: { code: 0x001, httpCode: 500, module: "publish" },
  
  // Missing parameters errors
  GET_VIDEO_MISSING_PARAMETERS: { code: 0x200, httpCode: 400, module: "publish" },
  PUBLISH_VIDEO_MISSING_PARAMETERS: { code: 0x201, httpCode: 400, module: "publish" },
  UNPUBLISH_VIDEO_MISSING_PARAMETERS: { code: 0x202, httpCode: 400, module: "publish" },
  
  // Other errors
  GET_VIDEO_ERROR: { code: 0x300, httpCode: 500, module: "publish" },
  PUBLISH_VIDEO_ERROR: { code: 0x301, httpCode: 500, module: "publish" },
  UNPUBLISH_VIDEO_ERROR: { code: 0x302, httpCode: 500, module: "publish" }
  
};