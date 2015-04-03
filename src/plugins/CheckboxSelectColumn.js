import { EventHandler, KEYCODES } from '../util/events';
import { extend } from '../util/misc';

class CheckboxSelectColumn {
	constructor(options) {
		let defaults = {
			columnId: '_checkbox_selector',
			cssClass: null,
			toolTip: 'Select/Deselect All',
			width: 30
		};

		this._options = extend({}, defaults, options);
		this._grid = null;
		this._handler = new EventHandler();
		this._selectedRowsLookup = {};
	}

	init(grid) {
		this._grid = grid;
		this._handler
			.subscribe(this._grid.onSelectedRowsChanged, this._handleSelectedRowsChanged.bind(this))
			.subscribe(this._grid.onClick, this._handleClick.bind(this))
			.subscribe(this._grid.onHeaderClick, this._handleHeaderClick.bind(this))
			.subscribe(this._grid.onKeyDown, this._handleKeyDown.bind(this));
	}

	destroy() {
		this._handler.unsubscribeAll();
	}

	_handleSelectedRowsChanged() {
		let selectedRows = this._grid.getSelectedRows(),
			lookup = {};
		for (let i = 0; i < selectedRows.length; i++) {
			let row = selectedRows[i];
			lookup[row] = true;
			this._grid.invalidateRows(row);
		}
		for (let key in this._selectedRowsLookup) {
			this._grid.invalidateRows(key);
		}
		this._selectedRowsLookup = lookup;
		this._grid.render();

		if (selectedRows.length && selectedRows.length === this._grid.getDataLength()) {
			this._grid.updateColumnHeader(this._options.columnId, '<input type="checkbox" checked="checked">', this._options.toolTip);
		} else {
			this._grid.updateColumnHeader(this._options.columnId, '<input type="checkbox">', this._options.toolTip);
		}
	}

	_handleKeyDown(info) {
		let e = info.event,
			data = info.data;

		if (e.which === KEYCODES.SPACE) {
			if (this._grid.getColumns()[data.cell].id === this._options.columnId) {
				// if editing, try to commit
				if (!this._grid.getEditorLock().isActive() || this._grid.getEditorLock().commitCurrentEdit()) {
					this.toggleRowSelection(data.row);
				}
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		}
	}

	_handleClick(info) {
		let e = info.event,
			data = info.data;

		// clicking on a row select checkbox
		if (this._grid.getColumns()[data.cell].id === this._options.columnId && (e.target.type || '').toLowerCase() === 'checkbox' && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
			// if editing, try to commit
			if (this._grid.getEditorLock().isActive() && !this._grid.getEditorLock().commitCurrentEdit()) {
				e.preventDefault();
				e.stopImmediatePropagation();
				return;
			}
			this.toggleRowSelection(data.row);
		}
	}

	toggleRowSelection(row) {
		if (this._selectedRowsLookup[row]) {
			this._grid.setSelectedRows(this._grid.getSelectedRows().filter(function (n) {
				return n !== row;
			}));
		} else {
			this._grid.setSelectedRows(this._grid.getSelectedRows().concat(row));
		}
	}

	_handleHeaderClick(info) {
		let e = info.event,
			data = info.data;

		if (data.column.id === this._options.columnId && (e.target.type || '').toLowerCase() === 'checkbox') {
			// if editing, try to commit
			if (this._grid.getEditorLock().isActive() && !this._grid.getEditorLock().commitCurrentEdit()) {
				e.preventDefault();
				e.stopImmediatePropagation();
				return;
			}

			if ((e.target.type || '').toLowerCase() === 'checked') {
				let rows = [];
				for (let i = 0; i < this._grid.getDataLength(); i++) {
					rows.push(i);
				}
				this._grid.setSelectedRows(rows);
			} else {
				this._grid.setSelectedRows([]);
			}
			e.stopPropagation();
			e.stopImmediatePropagation();
		}
	}

	getColumnDefinition() {
		return {
			id: this._options.columnId,
			name: '<input type="checkbox">',
			toolTip: this._options.toolTip,
			field: 'sel',
			width: this._options.width,
			resizable: false,
			sortable: false,
			cssClass: this._options.cssClass,
			formatter: this.checkboxSelectionFormatter.bind(this)
		};
	}

	checkboxSelectionFormatter(row, cell, value, columnDef, dataContext) {
		if (dataContext) {
			return this._selectedRowsLookup[row] ?
				'<input type="checkbox" checked="checked">'
				: '<input type="checkbox">';
		}
		return null;
	}
}

export default CheckboxSelectColumn;