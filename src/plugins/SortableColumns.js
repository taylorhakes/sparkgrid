/**
 * This file needs Sortable `npm install html5-sortable`
 */

import Sortable from 'sortable';
import { Event } from '../core';

export default function SortableColumns(options) {
	var header, sortable,
		onColumnsReordered = new Event();


	function init(grid) {
		grid.onHeadersRendered.subscribe(sortableInit);
		sortableInit();
	}

	function sortableInit() {
		header = grid.getHeader();

		if (sortable) {
			sortable.destroy();
		}

		sortable = new Sortable(header, {
			onUpdate: handleDragEnd,
			animation: 300
		});
	}

	function handleDragEnd(evt) {
		var parent = evt.item.parentNode,
			ids = [],
			reorderedColumns = [],
			uid = grid.getUid(),
			columns = grid.getColumns(),
			i, len;

		len = parent.children.length
		for (i = 0; i < len; i++) {
			ids.push(parent.children[i].id);
		}
		for (i = 0; i < ids.length; i++) {
			reorderedColumns.push(columns[grid.getColumnIndex(ids[i].replace(uid, ""))]);
		}
		grid.setColumns(reorderedColumns);
		onColumnsReordered.notify();
	}


	function destroy() {
		grid.onHeadersRendered.unsubscribe(sortableInit);
		sortable.destroy();
	}


	return {
		'init': init,
		'destroy': destroy,
		'onColumnsReordered': onColumnsReordered
	}
}