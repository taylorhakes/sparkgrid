(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["exports", "module", "../core"], factory);
	} else if (typeof exports !== "undefined" && typeof module !== "undefined") {
		factory(exports, module, require("../core"));
	}
})(function (exports, module, _core) {
	"use strict";

	module.exports = RowSelectionModel;
	var extend = _core.extend;
	var EventHandler = _core.EventHandler;
	var Range = _core.Range;
	var Event = _core.Event;
	function RowSelectionModel(options) {
		var _grid;
		var _ranges = [];
		var _self;
		var _handler = new EventHandler();
		var _inHandler;
		var _options;
		var _defaults = {
			selectActiveRow: true
		};

		function init(grid) {
			_options = extend({}, _defaults, options);
			_grid = grid;
			_handler.subscribe(_grid.onActiveCellChanged, wrapHandler(handleActiveCellChange));
			_handler.subscribe(_grid.onKeyDown, wrapHandler(handleKeyDown));
			_handler.subscribe(_grid.onClick, wrapHandler(handleClick));
		}

		function destroy() {
			_handler.unsubscribeAll();
		}

		function wrapHandler(handler) {
			return function () {
				if (!_inHandler) {
					_inHandler = true;
					handler.apply(this, arguments);
					_inHandler = false;
				}
			};
		}

		function rangesToRows(ranges) {
			var rows = [];
			for (var i = 0; i < ranges.length; i++) {
				for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
					rows.push(j);
				}
			}
			return rows;
		}

		function rowsToRanges(rows) {
			var ranges = [];
			var lastCell = _grid.getColumns().length - 1;
			for (var i = 0; i < rows.length; i++) {
				ranges.push(new Range(rows[i], 0, rows[i], lastCell));
			}
			return ranges;
		}

		function getRowsRange(from, to) {
			var i,
			    rows = [];
			for (i = from; i <= to; i++) {
				rows.push(i);
			}
			for (i = to; i < from; i++) {
				rows.push(i);
			}
			return rows;
		}

		function getSelectedRows() {
			return rangesToRows(_ranges);
		}

		function setSelectedRows(rows) {
			setSelectedRanges(rowsToRanges(rows));
		}

		function setSelectedRanges(ranges) {
			_ranges = ranges;
			_self.onSelectedRangesChanged.notify(_ranges);
		}

		function getSelectedRanges() {
			return _ranges;
		}

		function handleActiveCellChange(e, data) {
			if (_options.selectActiveRow && data.row != null) {
				setSelectedRanges([new Range(data.row, 0, data.row, _grid.getColumns().length - 1)]);
			}
		}

		function handleKeyDown(e) {
			var activeRow = _grid.getActiveCell();
			if (activeRow && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.which == 38 || e.which == 40)) {
				var selectedRows = getSelectedRows();
				selectedRows.sort(function (x, y) {
					return x - y;
				});

				if (!selectedRows.length) {
					selectedRows = [activeRow.row];
				}

				var top = selectedRows[0];
				var bottom = selectedRows[selectedRows.length - 1];
				var active;

				if (e.which == 40) {
					active = activeRow.row < bottom || top == bottom ? ++bottom : ++top;
				} else {
					active = activeRow.row < bottom ? --bottom : --top;
				}

				if (active >= 0 && active < _grid.getDataLength()) {
					_grid.scrollRowIntoView(active);
					_ranges = rowsToRanges(getRowsRange(top, bottom));
					setSelectedRanges(_ranges);
				}

				e.preventDefault();
				e.stopPropagation();
			}
		}

		function handleClick(e) {
			var cell = _grid.getCellFromEvent(e);
			if (!cell || !_grid.canCellBeActive(cell.row, cell.cell)) {
				return false;
			}

			if (!_grid.getOptions().multiSelect || !e.ctrlKey && !e.shiftKey && !e.metaKey) {
				return false;
			}

			var selection = rangesToRows(_ranges);
			var idx = cell.row.indexOf(selection);

			if (idx === -1 && (e.ctrlKey || e.metaKey)) {
				selection.push(cell.row);
				_grid.setActiveCell(cell.row, cell.cell);
			} else if (idx !== -1 && (e.ctrlKey || e.metaKey)) {
				selection = selection.filter(function (o, i) {
					return o !== cell.row;
				});
				_grid.setActiveCell(cell.row, cell.cell);
			} else if (selection.length && e.shiftKey) {
				var last = selection.pop();
				var from = Math.min(cell.row, last);
				var to = Math.max(cell.row, last);
				selection = [];
				for (var i = from; i <= to; i++) {
					if (i !== last) {
						selection.push(i);
					}
				}
				selection.push(last);
				_grid.setActiveCell(cell.row, cell.cell);
			}

			_ranges = rowsToRanges(selection);
			setSelectedRanges(_ranges);
			e.stopImmediatePropagation();

			return true;
		}

		_self = {
			getSelectedRows: getSelectedRows,
			setSelectedRows: setSelectedRows,

			getSelectedRanges: getSelectedRanges,
			setSelectedRanges: setSelectedRanges,

			init: init,
			destroy: destroy,

			onSelectedRangesChanged: new Event()
		};

		return _self;
	}
});