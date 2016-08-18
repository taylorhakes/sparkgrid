/**
 * This file needs Sortable `npm install html5-sortable`
 */

import Sortable from 'sortablejs';
import { Event } from '../util/events';

class ReorderColumns {
	constructor(options) {
		this._grid = null;
		this._header = null;
		this._sortable = null;
		this.onColumnsReordered = new Event();
		this._boundMovableInit = this.movableInit.bind(this);
		this._boundHandleDragEnd = this.handleDragEnd.bind(this);
	}

	init(grid) {
		this._grid = grid;
		grid.onHeadersRendered.subscribe(this._boundMovableInit);
		this.movableInit();
	}

	movableInit() {
		this._header = this._grid.getHeader();

		if (this._sortable) {
			this._sortable.destroy();
		}

		this._sortable = new Sortable(this._header, {
			onUpdate: this._boundHandleDragEnd,
			animation: 300
		});
	}

	handleDragEnd(evt) {
		let parent = evt.item.parentNode,
			ids = [],
			reorderedColumns = [],
			uid = this._grid.getUid(),
			columns = this._grid.getColumns();

		let len = parent.children.length;
		for (let i = 0; i < len; i++) {
			ids.push(parent.children[i].id);
		}

		for (let i = 0; i < ids.length; i++) {
			reorderedColumns.push(columns[this._grid.getColumnIndex(ids[i].replace(uid, ''))]);
		}

		this._grid.setColumns(reorderedColumns);
		this.onColumnsReordered.notify();
	}

	destroy() {
		this._grid.onHeadersRendered.unsubscribe(this._boundMovableInit);
		this._sortable.destroy();
	}
}

export default ReorderColumns;
