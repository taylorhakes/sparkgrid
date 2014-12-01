var Grid = require('./src/Grid');
var DataView = require('./src/DataView');

var exportObj = {
  Grid: Grid,
  View: DataView
};

window.SparkGrid = exportObj;

//if (typeof module !== 'undefined' && module.exports) {
//  module.exports = exportObj;
//} else if (typeof require !== 'undefined' && require.amd) {
//  define(function () {
//    return exportObj;
//  });
//} else {
//
//}