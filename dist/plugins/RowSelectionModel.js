(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc', '../util/events', '../selection/Range'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'), require('../util/events'), require('../selection/Range'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.events, global.Range);
		global.RowSelectionModel = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _utilEvents, _selectionRange) {
	'use strict';

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Range = _interopRequireDefault(_selectionRange);

	var defaults = {
		selectActiveRow: true
	};

	var RowSelectionModel = (function () {
		function RowSelectionModel(options) {
			_classCallCheck(this, RowSelectionModel);

			this._grid = null;
			this._ranges = [];
			this._handler = new _utilEvents.EventHandler();
			this._inHandler = null;
			this._options = _utilMisc.extend({}, defaults, options);

			this.onSelectedRangesChanged = new _utilEvents.Event();
		}

		RowSelectionModel.prototype._handleActiveCellChange = function _handleActiveCellChange(info) {
			var data = info.data;
			if (this._options.selectActiveRow && data.row != null) {
				this.setSelectedRanges([new _Range['default'](data.row, 0, data.row, this._grid.getColumns().length - 1)]);
			}
		};

		RowSelectionModel.prototype._handleKeyDown = function _handleKeyDown(info) {
			var e = info.event,
			    activeRow = this._grid.getActiveCell();
			if (activeRow && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.which === 38 || e.which === 40)) {
				var selectedRows = this.getSelectedRows();
				selectedRows.sort(function (x, y) {
					return x - y;
				});

				if (!selectedRows.length) {
					selectedRows = [activeRow.row];
				}

				var _top = selectedRows[0],
				    bottom = selectedRows[selectedRows.length - 1],
				    active = undefined;

				if (e.which === 40) {
					active = activeRow.row < bottom || _top === bottom ? ++bottom : ++_top;
				} else {
					active = activeRow.row < bottom ? --bottom : --_top;
				}

				if (active >= 0 && active < this._grid.getDataLength()) {
					this._grid.scrollRowIntoView(active);
					this._ranges = this._rowsToRanges(this._getRowsRange(_top, bottom));
					this.setSelectedRanges(this._ranges);
				}

				e.preventDefault();
				e.stopPropagation();
			}
		};

		RowSelectionModel.prototype._handleClick = function _handleClick(info) {
			var e = info.event,
			    cell = this._grid.getCellFromEvent(e);
			if (!cell || !this._grid.canCellBeActive(cell.row, cell.cell)) {
				return false;
			}

			if (!this._grid.getOptions().multiSelect || !e.ctrlKey && !e.shiftKey && !e.metaKey) {
				return false;
			}

			var selection = this._rangesToRows(this._ranges),
			    idx = selection.indexOf(cell.row);

			if (idx === -1 && (e.ctrlKey || e.metaKey)) {
				selection.push(cell.row);
				this._grid.setActiveCell(cell.row, cell.cell);
			} else if (idx !== -1 && (e.ctrlKey || e.metaKey)) {
				selection = selection.filter(function (o, i) {
					return o !== cell.row;
				});
				this._grid.setActiveCell(cell.row, cell.cell);
			} else if (selection.length && e.shiftKey) {
				var last = selection.pop(),
				    from = Math.min(cell.row, last),
				    to = Math.max(cell.row, last);
				selection = [];
				for (var i = from; i <= to; i++) {
					if (i !== last) {
						selection.push(i);
					}
				}

				selection.push(last);
				this._grid.setActiveCell(cell.row, cell.cell);
			}

			this._ranges = this._rowsToRanges(selection);
			this.setSelectedRanges(this._ranges);
			e.stopPropagation();

			return true;
		};

		RowSelectionModel.prototype._wrapHandler = function _wrapHandler(handler) {
			var me = this;
			return function () {
				if (!this._inHandler) {
					this._inHandler = true;
					handler.apply(me, arguments);
					this._inHandler = false;
				}
			};
		};

		RowSelectionModel.prototype._rangesToRows = function _rangesToRows(ranges) {
			var rows = [];
			for (var i = 0; i < ranges.length; i++) {
				for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
					rows.push(j);
				}
			}

			return rows;
		};

		RowSelectionModel.prototype._rowsToRanges = function _rowsToRanges(rows) {
			var ranges = [],
			    lastCell = this._grid.getColumns().length - 1;
			for (var i = 0; i < rows.length; i++) {
				ranges.push(new _Range['default'](rows[i], 0, rows[i], lastCell));
			}

			return ranges;
		};

		RowSelectionModel.prototype._getRowsRange = function _getRowsRange(from, to) {
			var i = undefined,
			    rows = [];
			for (i = from; i <= to; i++) {
				rows.push(i);
			}

			for (i = to; i < from; i++) {
				rows.push(i);
			}

			return rows;
		};

		RowSelectionModel.prototype.init = function init(grid) {
			this._grid = grid;
			this._handler.subscribe(this._grid.onActiveCellChanged, this._wrapHandler(this._handleActiveCellChange));
			this._handler.subscribe(this._grid.onKeyDown, this._wrapHandler(this._handleKeyDown));
			this._handler.subscribe(this._grid.onClick, this._wrapHandler(this._handleClick));
		};

		RowSelectionModel.prototype.destroy = function destroy() {
			this._handler.unsubscribeAll();
		};

		RowSelectionModel.prototype.getSelectedRows = function getSelectedRows() {
			return this._rangesToRows(this._ranges);
		};

		RowSelectionModel.prototype.setSelectedRows = function setSelectedRows(rows) {
			this.setSelectedRanges(this._rowsToRanges(rows));
		};

		RowSelectionModel.prototype.setSelectedRanges = function setSelectedRanges(ranges) {
			this._ranges = ranges;
			this.onSelectedRangesChanged.notify(ranges);
		};

		RowSelectionModel.prototype.getSelectedRanges = function getSelectedRanges() {
			return this._ranges;
		};

		return RowSelectionModel;
	})();

	module.exports = RowSelectionModel;
});