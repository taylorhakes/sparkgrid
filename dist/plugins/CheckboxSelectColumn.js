(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/events', '../util/misc'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/events'), require('../util/misc'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.events, global.misc);
		global.CheckboxSelectColumn = mod.exports;
	}
})(this, function (exports, module, _utilEvents, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var CheckboxSelectColumn = (function () {
		function CheckboxSelectColumn(options) {
			_classCallCheck(this, CheckboxSelectColumn);

			var defaults = {
				columnId: '_checkbox_selector',
				cssClass: null,
				toolTip: 'Select/Deselect All',
				width: 30
			};

			this._options = _utilMisc.extend({}, defaults, options);
			this._grid = null;
			this._handler = new _utilEvents.EventHandler();
			this._selectedRowsLookup = {};
		}

		CheckboxSelectColumn.prototype.init = function init(grid) {
			this._grid = grid;
			this._handler.subscribe(this._grid.onSelectedRowsChanged, this._handleSelectedRowsChanged.bind(this)).subscribe(this._grid.onClick, this._handleClick.bind(this)).subscribe(this._grid.onHeaderClick, this._handleHeaderClick.bind(this)).subscribe(this._grid.onKeyDown, this._handleKeyDown.bind(this));
		};

		CheckboxSelectColumn.prototype.destroy = function destroy() {
			this._handler.unsubscribeAll();
		};

		CheckboxSelectColumn.prototype._handleSelectedRowsChanged = function _handleSelectedRowsChanged() {
			var selectedRows = this._grid.getSelectedRows(),
			    lookup = {};
			for (var i = 0; i < selectedRows.length; i++) {
				var row = selectedRows[i];
				lookup[row] = true;
				this._grid.invalidateRows(row);
			}

			for (var key in this._selectedRowsLookup) {
				this._grid.invalidateRows(key);
			}

			this._selectedRowsLookup = lookup;
			this._grid.render();

			if (selectedRows.length && selectedRows.length === this._grid.getDataLength()) {
				this._grid.updateColumnHeader(this._options.columnId, '<input type="checkbox" checked="checked">', this._options.toolTip);
			} else {
				this._grid.updateColumnHeader(this._options.columnId, '<input type="checkbox">', this._options.toolTip);
			}
		};

		CheckboxSelectColumn.prototype._handleKeyDown = function _handleKeyDown(info) {
			var e = info.event,
			    data = info.data;

			if (e.which === _utilEvents.KEYCODES.SPACE) {
				if (this._grid.getColumns()[data.cell].id === this._options.columnId) {
					// if editing, try to commit
					if (!this._grid.getEditorLock().isActive() || this._grid.getEditorLock().commitCurrentEdit()) {
						this.toggleRowSelection(data.row);
					}

					e.preventDefault();
					e.stopImmediatePropagation();
				}
			}
		};

		CheckboxSelectColumn.prototype._handleClick = function _handleClick(info) {
			var e = info.event,
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
		};

		CheckboxSelectColumn.prototype.toggleRowSelection = function toggleRowSelection(row) {
			if (this._selectedRowsLookup[row]) {
				this._grid.setSelectedRows(this._grid.getSelectedRows().filter(function (n) {
					return n !== row;
				}));
			} else {
				this._grid.setSelectedRows(this._grid.getSelectedRows().concat(row));
			}
		};

		CheckboxSelectColumn.prototype._handleHeaderClick = function _handleHeaderClick(info) {
			var e = info.event,
			    data = info.data;

			if (data.column.id === this._options.columnId && (e.target.type || '').toLowerCase() === 'checkbox') {
				// if editing, try to commit
				if (this._grid.getEditorLock().isActive() && !this._grid.getEditorLock().commitCurrentEdit()) {
					e.preventDefault();
					e.stopImmediatePropagation();
					return;
				}

				if ((e.target.type || '').toLowerCase() === 'checked') {
					var rows = [];
					for (var i = 0; i < this._grid.getDataLength(); i++) {
						rows.push(i);
					}

					this._grid.setSelectedRows(rows);
				} else {
					this._grid.setSelectedRows([]);
				}

				e.stopPropagation();
				e.stopImmediatePropagation();
			}
		};

		CheckboxSelectColumn.prototype.getColumnDefinition = function getColumnDefinition() {
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
		};

		CheckboxSelectColumn.prototype.checkboxSelectionFormatter = function checkboxSelectionFormatter(row, cell, value, columnDef, dataContext) {
			if (dataContext) {
				return this._selectedRowsLookup[row] ? '<input type="checkbox" checked="checked">' : '<input type="checkbox">';
			}

			return null;
		};

		return CheckboxSelectColumn;
	})();

	module.exports = CheckboxSelectColumn;
});