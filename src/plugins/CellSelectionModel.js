import { extend } from '../util/misc';
import { Event } from '../util/events';
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
			"selectionCss": {
				"border": "2px solid black"
			}
		});
		this._options = extend({}, defaults, options);;
	}

	init(grid) {
		this._grid = grid;
		this._canvas = _grid.getCanvasNode();
		this._grid.onActiveCellChanged.subscribe(handleActiveCellChange);
		this._grid.onKeyDown.subscribe(handleKeyDown);
		this._grid.registerPlugin(_selector);
		this._selector.onCellRangeSelected.subscribe(handleCellRangeSelected);
		this._selector.onBeforeCellRangeSelected.subscribe(handleBeforeCellRangeSelected);
	}

	destroy() {
		this._grid.onActiveCellChanged.unsubscribe(handleActiveCellChange);
		this._grid.onKeyDown.unsubscribe(handleKeyDown);
		this._selector.onCellRangeSelected.unsubscribe(handleCellRangeSelected);
		this._selector.onBeforeCellRangeSelected.unsubscribe(handleBeforeCellRangeSelected);
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
		this._ranges = removeInvalidRanges(ranges);
		this.onSelectedRangesChanged.notify(ranges);
	}

	getSelectedRanges() {
		return this._ranges;
	}

	handleBeforeCellRangeSelected(info) {
		let e = info.event;
		if (this._grid.getEditorLock().isActive()) {
			e.stopPropagation();
		}
	}

	handleCellRangeSelected(info) {
		let data = info.data;
		this.setSelectedRanges([data.range]);
	}

	handleActiveCellChange(info) {
		let e = info.event;
		if (this._options.selectActiveCell && e.data.row != null && e.data.cell != null) {
			this.setSelectedRanges([new Range(e.data.row, e.data.cell)]);
		}
	}

	handleKeyDown(info) {
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
			(e.which == 37 || e.which == 39 || e.which == 38 || e.which == 40)) {

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
				dirRow = active.row == last.fromRow ? 1 : -1,
				dirCell = active.cell == last.fromCell ? 1 : -1;

			if (e.which == 37) {
				dCell -= dirCell;
			} else if (e.which == 39) {
				dCell += dirCell;
			} else if (e.which == 38) {
				dRow -= dirRow;
			} else if (e.which == 40) {
				dRow += dirRow;
			}

			// define new selection range
			let new_last = new Slick.Range(active.row, active.cell, active.row + dirRow * dRow, active.cell + dirCell * dCell);
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
