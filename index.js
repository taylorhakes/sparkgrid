var Grid = require('./src/Grid'),
  DataView = require('./src/DataView'),
  core = require('./src/core'),
  formatters = require('./src/formatters'),
  editors = require('./src/editors'),
  CellRangeDecorator = require('./src/plugins/CellRangeDecorator'),
  CellRangeSelector = require('./src/plugins/CellRangeSelector'),
  CellSelectionModel = require('./src/plugins/CellSelectionModel'),
  RowSelectionModel = require('./src/plugins/RowSelectionModel'),
  Pager = require('./src/plugins/Pager'),
	ColumnPicker = require('./src/plugins/ColumnPicker'),
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