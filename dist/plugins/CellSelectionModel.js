(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc', '../util/events', '../selection/Range', './CellRangeSelector'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'), require('../util/events'), require('../selection/Range'), require('./CellRangeSelector'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.events, global.Range, global.CellRangeSelector);
		global.CellSelectionModel = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _utilEvents, _selectionRange, _CellRangeSelector) {
	'use strict';

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Range = _interopRequireDefault(_selectionRange);

	var _CellRangeSelector2 = _interopRequireDefault(_CellRangeSelector);

	var CellSelectionModel = (function () {
		function CellSelectionModel(options) {
			_classCallCheck(this, CellSelectionModel);

			var defaults = {
				selectActiveCell: true
			};

			this._grid = null;
			this._canvas = null;
			this._ranges = [];
			this._selector = new _CellRangeSelector2['default']({
				selectionCss: {
					border: '2px solid black'
				}
			});
			this._options = _utilMisc.extend({}, defaults, options);
		}

		CellSelectionModel.prototype.init = function init(grid) {
			this._grid = grid;
			this._canvas = this._grid.getCanvasNode();

			this._boundHandleActiveCellChange = this._handleActiveCellChange.bind(this);
			this._boundHandleKeyDown = this._handleKeyDown.bind(this);
			this._boundHandleCellRangeSelected = this._handleCellRangeSelected.bind(this);
			this._boundHandleBeforeCellRangeSelected = this._handleBeforeCellRangeSelected.bind(this);

			this._grid.onActiveCellChanged.subscribe(this._boundHandleActiveCellChange);
			this._grid.onKeyDown.subscribe(this._boundHandleKeyDown);
			this._selector.onCellRangeSelected.subscribe(this._boundHandleCellRangeSelected);
			this._selector.onBeforeCellRangeSelected.subscribe(this._boundHandleBeforeCellRangeSelected);

			this._grid.registerPlugin(this._selector);
		};

		CellSelectionModel.prototype.destroy = function destroy() {
			this._grid.onActiveCellChanged.unsubscribe(this._boundHandleActiveCellChange);
			this._grid.onKeyDown.unsubscribe(this._boundHandleKeyDown);
			this._selector.onCellRangeSelected.unsubscribe(this._boundHandleCellRangeSelected);
			this._selector.onBeforeCellRangeSelected.unsubscribe(this._boundHandleBeforeCellRangeSelected);

			this._grid.unregisterPlugin(this._selector);
		};

		CellSelectionModel.prototype.removeInvalidRanges = function removeInvalidRanges(ranges) {
			var result = [];

			for (var i = 0; i < ranges.length; i++) {
				var r = ranges[i];
				if (this._grid.canCellBeSelected(r.fromRow, r.fromCell) && this._grid.canCellBeSelected(r.toRow, r.toCell)) {
					result.push(r);
				}
			}

			return result;
		};

		CellSelectionModel.prototype.setSelectedRanges = function setSelectedRanges(ranges) {
			this._ranges = this.removeInvalidRanges(ranges);
			this.onSelectedRangesChanged.notify(ranges);
		};

		CellSelectionModel.prototype.getSelectedRanges = function getSelectedRanges() {
			return this._ranges;
		};

		CellSelectionModel.prototype._handleBeforeCellRangeSelected = function _handleBeforeCellRangeSelected(info) {
			var e = info.event;
			if (this._grid.getEditorLock().isActive()) {
				e.stopPropagation();
			}
		};

		CellSelectionModel.prototype._handleCellRangeSelected = function _handleCellRangeSelected(info) {
			var data = info.data;
			this.setSelectedRanges([data.range]);
		};

		CellSelectionModel.prototype._handleActiveCellChange = function _handleActiveCellChange(info) {
			var e = info.event;
			if (this._options.selectActiveCell && e.data.row != null && e.data.cell != null) {
				this.setSelectedRanges([new _Range['default'](e.data.row, e.data.cell)]);
			}
		};

		CellSelectionModel.prototype._handleKeyDown = function _handleKeyDown(info) {
			var e = info.event;
			/***
    * Кey codes
    * 37 left
    * 38 up
    * 39 right
    * 40 down
    */
			var active = this._grid.getActiveCell();

			if (active && e.shiftKey && !e.ctrlKey && !e.altKey && (e.which === _utilEvents.KEYCODES.LEFT || e.which === _utilEvents.KEYCODES.UP || e.which === _utilEvents.KEYCODES.RIGHT || e.which === _utilEvents.KEYCODES.DOWN)) {

				var ranges = this.getSelectedRanges();
				if (!ranges.length) ranges.push(new _Range['default'](active.row, active.cell));

				// keyboard can work with last range only
				var last = ranges.pop();

				// can't handle selection out of active cell
				if (!last.contains(active.row, active.cell)) last = new _Range['default'](active.row, active.cell);

				var dRow = last.toRow - last.fromRow,
				    dCell = last.toCell - last.fromCell,
				   

				// walking direction
				dirRow = active.row === last.fromRow ? 1 : -1,
				    dirCell = active.cell === last.fromCell ? 1 : -1;

				if (e.which === _utilEvents.KEYCODES.LEFT) {
					dCell -= dirCell;
				} else if (e.which === _utilEvents.KEYCODES.RIGHT) {
					dCell += dirCell;
				} else if (e.which === _utilEvents.KEYCODES.DOWN) {
					dRow -= dirRow;
				} else if (e.which === _utilEvents.KEYCODES.UP) {
					dRow += dirRow;
				}

				// define new selection range
				var new_last = new _Range['default'](active.row, active.cell, active.row + dirRow * dRow, active.cell + dirCell * dCell);
				if (this.removeInvalidRanges([new_last]).length) {
					ranges.push(new_last);
					var viewRow = dirRow > 0 ? new_last.toRow : new_last.fromRow,
					    viewCell = dirCell > 0 ? new_last.toCell : new_last.fromCell;
					this._grid.scrollRowIntoView(viewRow);
					this._grid.scrollCellIntoView(viewRow, viewCell);
				} else {
					ranges.push(last);
				}

				this.setSelectedRanges(ranges);

				e.preventDefault();
				e.stopPropagation();
			}
		};

		return CellSelectionModel;
	})();

	module.exports = _CellRangeSelector2['default'];
});