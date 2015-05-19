import { deepExtend, hide } from '../util/misc';
import { Event, EventHandler } from '../util/events';
import Range from '../selection/Range';
import CellRangeDecorator from './CellRangeDecorator';

class CellRangeSelector {
	constructor(options) {
		let defaults = {
			selectionCss: {
				border: '2px dashed blue'
			}
		};

		this._grid = null;
		this._canvas = null;
		this._dragging = null;
		this._decorator = null;
		this._handler = new EventHandler();
		this._options = deepExtend({}, defaults, options);
		this.onBeforeCellRangeSelected = new Event();
		this.onCellRangeSelected = new Event();
	}

	init(grid) {
		this._decorator = new CellRangeDecorator(this._options);
		this._decorator.init(grid);
		this._grid = grid;
		this._canvas = this._grid.getCanvasNode();
		this._handler
			.subscribe(this._grid.onDragInit, this._handleDragInit.bind(this))
			.subscribe(this._grid.onDragStart, this._handleDragStart.bind(this))
			.subscribe(this._grid.onDrag, this._handleDrag.bind(this))
			.subscribe(this._grid.onDragEnd, this._handleDragEnd.bind(this));
	}

	destroy() {
		this._handler.unsubscribeAll();
	}

	_handleDragInit(e, dd) {
		// prevent the grid from cancelling drag'n'drop by default
		e.stopImmediatePropagation();
	}

	_handleDragStart(e, dd) {
		let cell = this._grid.getCellFromEvent(e);
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

		let start = this._grid.getCellFromPoint(
			dd.startX - this._canvas.offsetLeft,
			dd.startY - this._canvas.offsetTop
		);

		dd.range = {start: start, end: {}};

		return this._decorator.show(new Range(start.row, start.cell));
	}

	_handleDrag(e, dd) {
		if (!this._dragging) {
			return;
		}

		e.stopImmediatePropagation();

		let end = this._grid.getCellFromPoint(
			e.pageX - this._canvas.offsetleft,
			e.pageY - this._canvas.offsetTop
		);

		if (!this._grid.canCellBeSelected(end.row, end.cell)) {
			return;
		}

		dd.range.end = end;
		this._decorator.show(new Range(dd.range.start.row, dd.range.start.cell, end.row, end.cell));
	}

	_handleDragEnd(e, dd) {
		if (!this._dragging) {
			return;
		}

		this._dragging = false;
		e.stopImmediatePropagation();

		hide(this._decorator);
		this.onCellRangeSelected.notify({
			range: new Range(
				dd.range.start.row,
				dd.range.start.cell,
				dd.range.end.row,
				dd.range.end.cell
			)
		});
	}
}

export default CellRangeDecorator;
