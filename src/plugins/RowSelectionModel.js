import { extend, EventHandler, Range, Event } from '../util/misc';

const defaults = {
	selectActiveRow: true
};

class RowSelectionModel {
	constructor(options) {
		this._grid = null;
		this._ranges = [];
		this._handler = new EventHandler();
		this._inHandler = null;
		this._options = extend({}, defaults, options);

		this.onSelectedRangesChanged = new Event();
	}
	_handleActiveCellChange(info) {
		let data = info.data;
		if (this._options.selectActiveRow && data.row != null) {
			this.setSelectedRanges([new Range(data.row, 0, data.row, this._grid.getColumns().length - 1)]);
		}
	}

	_handleKeyDown(info) {
		let e = info.event,
			activeRow = this._grid.getActiveCell();
		if (activeRow && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.which === 38 || e.which === 40)) {
			let selectedRows = this.getSelectedRows();
			selectedRows.sort((x, y) => {
				return x - y;
			});

			if (!selectedRows.length) {
				selectedRows = [activeRow.row];
			}

			let top = selectedRows[0],
				bottom = selectedRows[selectedRows.length - 1],
				active;

			if (e.which === 40) {
				active = activeRow.row < bottom || top === bottom ? ++bottom : ++top;
			} else {
				active = activeRow.row < bottom ? --bottom : --top;
			}

			if (active >= 0 && active < this._grid.getDataLength()) {
				this._grid.scrollRowIntoView(active);
				this._ranges = this._rowsToRanges(this._getRowsRange(top, bottom));
				this.setSelectedRanges(this._ranges);
			}

			e.preventDefault();
			e.stopPropagation();
		}
	}

	_handleClick(info) {
		let e = info.event,
			cell = this._grid.getCellFromEvent(e);
		if (!cell || !this._grid.canCellBeActive(cell.row, cell.cell)) {
			return false;
		}

		if (!this._grid.getOptions().multiSelect || (
			!e.ctrlKey && !e.shiftKey && !e.metaKey)) {
			return false;
		}

		let selection = this._rangesToRows(this._ranges),
			idx = selection.indexOf(cell.row);

		if (idx === -1 && (e.ctrlKey || e.metaKey)) {
			selection.push(cell.row);
			this._grid.setActiveCell(cell.row, cell.cell);
		} else if (idx !== -1 && (e.ctrlKey || e.metaKey)) {
			selection = selection.filter(function (o, i) {
				return (o !== cell.row);
			});
			this._grid.setActiveCell(cell.row, cell.cell);
		} else if (selection.length && e.shiftKey) {
			let last = selection.pop(),
				from = Math.min(cell.row, last),
				to = Math.max(cell.row, last);
			selection = [];
			for (let i = from; i <= to; i++) {
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
	}
	_wrapHandler(handler) {
		let me = this;
		return function() {
			if (!this._inHandler) {
				this._inHandler = true;
				handler.apply(me, arguments);
				this._inHandler = false;
			}
		};
	}

	_rangesToRows(ranges) {
		let rows = [];
		for (let i = 0; i < ranges.length; i++) {
			for (let j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
				rows.push(j);
			}
		}
		return rows;
	}

	_rowsToRanges(rows) {
		let ranges = [],
			lastCell = this._grid.getColumns().length - 1;
		for (let i = 0; i < rows.length; i++) {
			ranges.push(new Range(rows[i], 0, rows[i], lastCell));
		}
		return ranges;
	}
	_getRowsRange(from, to) {
		let i, rows = [];
		for (i = from; i <= to; i++) {
			rows.push(i);
		}
		for (i = to; i < from; i++) {
			rows.push(i);
		}
		return rows;
	}

	init(grid) {
		this._grid = grid;
		this._handler.subscribe(this._grid.onActiveCellChanged,
			this._wrapHandler(this._handleActiveCellChange));
		this._handler.subscribe(this._grid.onKeyDown,
			this._wrapHandler(this._handleKeyDown));
		this._handler.subscribe(this._grid.onClick,
			this._wrapHandler(this._handleClick));
	}

	destroy() {
		this._handler.unsubscribeAll();
	}

	getSelectedRows() {
		return this._rangesToRows(this._ranges);
	}

	setSelectedRows(rows) {
		this.setSelectedRanges(this._rowsToRanges(rows));
	}

	setSelectedRanges(ranges) {
		this._ranges = ranges;
		this.onSelectedRangesChanged.notify(ranges);
	}

	getSelectedRanges() {
		return this._ranges;
	}
}

export default RowSelectionModel;