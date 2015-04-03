import { extend } from '../util/misc';
import { Event, KEYCODES } from '../util/events';
import Range from '../selection/Range';
import CellRangeSelector from './CellRangeSelector';

class CellSelectionModel {
	constructor(options) {
		let defaults = {
			selectActiveCell: true
		};

		this._grid = null;
		this._canvas = null;
		this._ranges = [];
		this._selector = new CellRangeSelector({
			selectionCss: {
				border: '2px solid black'
			}
		});
		this._options = extend({}, defaults, options);
	}

	init(grid) {
		this._grid = grid;
		this._canvas = this._grid.getCanvasEl();

		this._boundHandleActiveCellChange = this._handleActiveCellChange.bind(this);
		this._boundHandleKeyDown = this._handleKeyDown.bind(this);
		this._boundHandleCellRangeSelected = this._handleCellRangeSelected.bind(this);
		this._boundHandleBeforeCellRangeSelected = this._handleBeforeCellRangeSelected.bind(this);

		this._grid.onActiveCellChanged.subscribe(this._boundHandleActiveCellChange);
		this._grid.onKeyDown.subscribe(this._boundHandleKeyDown);
		this._selector.onCellRangeSelected.subscribe(this._boundHandleCellRangeSelected);
		this._selector.onBeforeCellRangeSelected.subscribe(this._boundHandleBeforeCellRangeSelected);

		this._grid.registerPlugin(this._selector);
	}

	destroy() {
		this._grid.onActiveCellChanged.unsubscribe(this._boundHandleActiveCellChange);
		this._grid.onKeyDown.unsubscribe(this._boundHandleKeyDown);
		this._selector.onCellRangeSelected.unsubscribe(this._boundHandleCellRangeSelected);
		this._selector.onBeforeCellRangeSelected.unsubscribe(this._boundHandleBeforeCellRangeSelected);

		this._grid.unregisterPlugin(this._selector);
	}

	removeInvalidRanges(ranges) {
		let result = [];

		for (let i = 0; i < ranges.length; i++) {
			let r = ranges[i];
			if (this._grid.canCellBeSelected(r.fromRow, r.fromCell) && this._grid.canCellBeSelected(r.toRow, r.toCell)) {
				result.push(r);
			}
		}

		return result;
	}

	setSelectedRanges(ranges) {
		this._ranges = this.removeInvalidRanges(ranges);
		this.onSelectedRangesChanged.notify(ranges);
	}

	getSelectedRanges() {
		return this._ranges;
	}

	_handleBeforeCellRangeSelected(info) {
		let e = info.event;
		if (this._grid.getEditorLock().isActive()) {
			e.stopPropagation();
		}
	}

	_handleCellRangeSelected(info) {
		let data = info.data;
		this.setSelectedRanges([data.range]);
	}

	_handleActiveCellChange(info) {
		let e = info.event;
		if (this._options.selectActiveCell && e.data.row != null && e.data.cell != null) {
			this.setSelectedRanges([new Range(e.data.row, e.data.cell)]);
		}
	}

	_handleKeyDown(info) {
		let e = info.event;
		/***
		 * Кey codes
		 * 37 left
		 * 38 up
		 * 39 right
		 * 40 down
		 */
		let active = this._grid.getActiveCell();

		if (active && e.shiftKey && !e.ctrlKey && !e.altKey &&
			(e.which === KEYCODES.LEFT || e.which === KEYCODES.UP || e.which === KEYCODES.RIGHT || e.which === KEYCODES.DOWN)) {

			let ranges = this.getSelectedRanges();
			if (!ranges.length)
				ranges.push(new Range(active.row, active.cell));

			// keyboard can work with last range only
			let last = ranges.pop();

			// can't handle selection out of active cell
			if (!last.contains(active.row, active.cell))
				last = new Range(active.row, active.cell);

			let dRow = last.toRow - last.fromRow,
				dCell = last.toCell - last.fromCell,
			// walking direction
				dirRow = active.row === last.fromRow ? 1 : -1,
				dirCell = active.cell === last.fromCell ? 1 : -1;

			if (e.which === KEYCODES.LEFT) {
				dCell -= dirCell;
			} else if (e.which === KEYCODES.RIGHT) {
				dCell += dirCell;
			} else if (e.which === KEYCODES.DOWN) {
				dRow -= dirRow;
			} else if (e.which === KEYCODES.UP) {
				dRow += dirRow;
			}

			// define new selection range
			let new_last = new Range(active.row, active.cell, active.row + dirRow * dRow, active.cell + dirCell * dCell);
			if (this.removeInvalidRanges([new_last]).length) {
				ranges.push(new_last);
				let viewRow = dirRow > 0 ? new_last.toRow : new_last.fromRow,
					viewCell = dirCell > 0 ? new_last.toCell : new_last.fromCell;
				this._grid.scrollRowIntoView(viewRow);
				this._grid.scrollCellIntoView(viewRow, viewCell);
			}
			else {
				ranges.push(last);
			}


			this.setSelectedRanges(ranges);

			e.preventDefault();
			e.stopPropagation();
		}
	}
}

export default CellRangeSelector;
