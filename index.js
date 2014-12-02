var Grid = require('./src/Grid');
var DataView = require('./src/DataView');
var core = require('./src/core');
var formatters = require('./src/formatters');

var exportObj = {
  Grid: Grid,
  View: DataView,
  core: core,
  formatters: formatters
};

window.Spark = exportObj;

//if (typeof module !== 'undefined' && module.exports) {
//  module.exports = exportObj;
//} else if (typeof require !== 'undefined' && require.amd) {
//  define(function () {
//    return exportObj;
//  });
//} else {
//
//}