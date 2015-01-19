var Grid = require('./src/Grid'),
  DataView = require('./src/DataView'),
  core = require('./src/core'),
  formatters = require('./src/formatters'),
  editors = require('./src/editors'),
  CellRangeDecorator = require('./plugins/CellRangeDecorator'),
  CellRangeSelector = require('./plugins/CellRangeSelector'),
  CellSelectionModel = require('./plugins/CellSelectionModel'),
  RowSelectionModel = require('./plugins/RowSelectionModel'),
  Pager = require('./controls/Pager'),
	ColumnPicker = require('./controls/ColumnPicker'),
	RemoteModel = require('./src/RemoteModel');


window.Spark = core.extend(core, {
  Grid: Grid,
  Data: DataView,
  formatters: formatters,
  editors: editors,
  CellRangeDecorator: CellRangeDecorator,
  CellRangeSelector: CellRangeSelector,
  CellSelectionModel: CellSelectionModel,
  RowSelectionModel: RowSelectionModel,
  Pager: Pager,
	ColumnPicker: ColumnPicker,
	RemoteModel: RemoteModel
});

//if (typeof module !== 'undefined' && module.exports) {
//  module.exports = exportObj;
//} else if (typeof require !== 'undefined' && require.amd) {
//  define(function () {
//    return exportObj;
//  });
//} else {
//
//}