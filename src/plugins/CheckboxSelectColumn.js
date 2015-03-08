import { extend, EventHandler } from '../core';

export default function CheckboxSelectColumn(options) {
	var _grid;
	var _handler = new EventHandler();
	var _selectedRowsLookup = {};
	var _defaults = {
		columnId: "_checkbox_selector",
		cssClass: null,
		toolTip: "Select/Deselect All",
		width: 30
	};

	var _options = extend({}, _defaults, options);

	function init(grid) {
		_grid = grid;
		_handler
			.subscribe(_grid.onSelectedRowsChanged, handleSelectedRowsChanged)
			.subscribe(_grid.onClick, handleClick)
			.subscribe(_grid.onHeaderClick, handleHeaderClick)
			.subscribe(_grid.onKeyDown, handleKeyDown);
	}

	function destroy() {
		_handler.unsubscribeAll();
	}

	function handleSelectedRowsChanged() {
		var selectedRows = _grid.getSelectedRows();
		var lookup = {}, row, i;
		for (i = 0; i < selectedRows.length; i++) {
			row = selectedRows[i];
			lookup[row] = true;
			if (lookup[row] !== _selectedRowsLookup[row]) {
				_grid.invalidateRow(row);
				delete _selectedRowsLookup[row];
			}
		}
		for (i in _selectedRowsLookup) {
			_grid.invalidateRow(i);
		}
		_selectedRowsLookup = lookup;
		_grid.render();

		if (selectedRows.length && selectedRows.length == _grid.getDataLength()) {
			_grid.updateColumnHeader(_options.columnId, "<input type='checkbox' checked='checked'>", _options.toolTip);
		} else {
			_grid.updateColumnHeader(_options.columnId, "<input type='checkbox'>", _options.toolTip);
		}
	}

	function handleKeyDown(info) {
		var e = info.event,
			data = info.data;

		if (e.which == 32) {
			if (_grid.getColumns()[data.cell].id === _options.columnId) {
				// if editing, try to commit
				if (!_grid.getEditorLock().isActive() || _grid.getEditorLock().commitCurrentEdit()) {
					toggleRowSelection(data.row);
				}
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		}
	}

	function handleClick(info) {
		var e = info.event,
			data = info.data

		// clicking on a row select checkbox
		if (_grid.getColumns()[data.cell].id === _options.columnId && (e.target.type || '').toLowerCase() === 'checkbox') {
			// if editing, try to commit
			if (_grid.getEditorLock().isActive() && !_grid.getEditorLock().commitCurrentEdit()) {
				e.preventDefault();
				e.stopImmediatePropagation();
				return;
			}

			toggleRowSelection(data.row);
			e.stopPropagation();
			e.stopImmediatePropagation();
		}
	}

	function toggleRowSelection(row) {
		if (_selectedRowsLookup[row]) {
			_grid.setSelectedRows(_grid.getSelectedRows().filter(function (n) {
				return n != row;
			}));
		} else {
			_grid.setSelectedRows(_grid.getSelectedRows().concat(row));
		}
	}

	function handleHeaderClick(info) {
		var e = info.event,
			data = info.data;

		if (data.column.id == _options.columnId && (e.target.type || '').toLowerCase() === 'checkbox') {
			// if editing, try to commit
			if (_grid.getEditorLock().isActive() && !_grid.getEditorLock().commitCurrentEdit()) {
				e.preventDefault();
				e.stopImmediatePropagation();
				return;
			}

			if ((e.target.type || '').toLowerCase() === 'checked') {
				var rows = [];
				for (var i = 0; i < _grid.getDataLength(); i++) {
					rows.push(i);
				}
				_grid.setSelectedRows(rows);
			} else {
				_grid.setSelectedRows([]);
			}
			e.stopPropagation();
			e.stopImmediatePropagation();
		}
	}

	function getColumnDefinition() {
		return {
			id: _options.columnId,
			name: "<input type='checkbox'>",
			toolTip: _options.toolTip,
			field: "sel",
			width: _options.width,
			resizable: false,
			sortable: false,
			cssClass: _options.cssClass,
			formatter: checkboxSelectionFormatter
		};
	}

	function checkboxSelectionFormatter(row, cell, value, columnDef, dataContext) {
		if (dataContext) {
			return _selectedRowsLookup[row]
				? "<input type='checkbox' checked='checked'>"
				: "<input type='checkbox'>";
		}
		return null;
	}

	extend(this, {
		"init": init,
		"destroy": destroy,

		"getColumnDefinition": getColumnDefinition
	});
}