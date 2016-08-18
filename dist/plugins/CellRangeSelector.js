(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc', '../util/events', '../selection/Range', './CellRangeDecorator'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'), require('../util/events'), require('../selection/Range'), require('./CellRangeDecorator'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.events, global.Range, global.CellRangeDecorator);
		global.CellRangeSelector = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _utilEvents, _selectionRange, _CellRangeDecorator) {
	'use strict';

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Range = _interopRequireDefault(_selectionRange);

	var _CellRangeDecorator2 = _interopRequireDefault(_CellRangeDecorator);

	var CellRangeSelector = (function () {
		function CellRangeSelector(options) {
			_classCallCheck(this, CellRangeSelector);

			var defaults = {
				selectionCss: {
					border: '2px dashed blue'
				}
			};

			this._grid = null;
			this._canvas = null;
			this._dragging = null;
			this._decorator = null;
			this._handler = new _utilEvents.EventHandler();
			this._options = _utilMisc.deepExtend({}, defaults, options);
			this.onBeforeCellRangeSelected = new _utilEvents.Event();
			this.onCellRangeSelected = new _utilEvents.Event();
		}

		CellRangeSelector.prototype.init = function init(grid) {
			this._decorator = new _CellRangeDecorator2['default'](this._options);
			this._decorator.init(grid);
			this._grid = grid;
			this._canvas = this._grid.getCanvasNode();
			this._handler.subscribe(this._grid.onDragInit, this._handleDragInit.bind(this)).subscribe(this._grid.onDragStart, this._handleDragStart.bind(this)).subscribe(this._grid.onDrag, this._handleDrag.bind(this)).subscribe(this._grid.onDragEnd, this._handleDragEnd.bind(this));
		};

		CellRangeSelector.prototype.destroy = function destroy() {
			this._handler.unsubscribeAll();
		};

		CellRangeSelector.prototype._handleDragInit = function _handleDragInit(e, dd) {
			// prevent the grid from cancelling drag'n'drop by default
			e.stopImmediatePropagation();
		};

		CellRangeSelector.prototype._handleDragStart = function _handleDragStart(e, dd) {
			var cell = this._grid.getCellFromEvent(e);
			if (this.onBeforeCellRangeSelected.notify(cell) !== false) {
				if (this._grid.canCellBeSelected(cell.row, cell.cell)) {
					this._dragging = true;
					e.stopImmediatePropagation();
				}
			}

			if (!this._dragging) {
				return;
			}

			this._grid.focus();

			var start = this._grid.getCellFromPoint(dd.startX - this._canvas.offsetLeft, dd.startY - this._canvas.offsetTop);

			dd.range = { start: start, end: {} };

			return this._decorator.show(new _Range['default'](start.row, start.cell));
		};

		CellRangeSelector.prototype._handleDrag = function _handleDrag(e, dd) {
			if (!this._dragging) {
				return;
			}

			e.stopImmediatePropagation();

			var end = this._grid.getCellFromPoint(e.pageX - this._canvas.offsetleft, e.pageY - this._canvas.offsetTop);

			if (!this._grid.canCellBeSelected(end.row, end.cell)) {
				return;
			}

			dd.range.end = end;
			this._decorator.show(new _Range['default'](dd.range.start.row, dd.range.start.cell, end.row, end.cell));
		};

		CellRangeSelector.prototype._handleDragEnd = function _handleDragEnd(e, dd) {
			if (!this._dragging) {
				return;
			}

			this._dragging = false;
			e.stopImmediatePropagation();

			_utilMisc.hide(this._decorator);
			this.onCellRangeSelected.notify({
				range: new _Range['default'](dd.range.start.row, dd.range.start.cell, dd.range.end.row, dd.range.end.cell)
			});
		};

		return CellRangeSelector;
	})();

	module.exports = _CellRangeDecorator2['default'];
});