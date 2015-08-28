module.exports = {
  
  // Publish plugin unit tests
  publish : {
    options : {
      reporter : "spec"
    },
    src : ["tests/server/*.js"]
  }
  
};