// Module dependencies
var path = require("path");

// Set module root directory
process.rootPublish = path.join(__dirname, "../../");
process.requirePublish = function(filePath){
  return require(path.normalize(process.rootPublish + "/" + filePath));
};