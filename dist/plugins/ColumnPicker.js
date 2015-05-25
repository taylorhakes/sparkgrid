(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc);
		global.ColumnPicker = mod.exports;
	}
})(this, function (exports, module, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var ColumnPicker = (function () {
		function ColumnPicker(options) {
			_classCallCheck(this, ColumnPicker);

			var defaults = {
				fadeSpeed: 250
			};
			this._options = _utilMisc.extend({}, defaults, options);
			this._menu = null;
			this._columnCheckboxes = null;
			this._grid = null;
			this._columns = this._options.columns;
		}

		ColumnPicker.prototype.init = function init(grid) {
			var _this = this;

			this._boundUpdateColumnOrder = this._updateColumn.bind(this);
			grid.onHeaderContextMenu.subscribe(this._handleHeaderContextMenu);
			grid.onColumnsReordered.subscribe(this._boundUpdateColumnOrder);

			// Default to current grid columns
			this._columns = this._columns || grid.getColumns();

			this._menu = _utilMisc.createEl({
				tag: 'ul',
				className: 'spark-columnpicker',
				style: {
					display: 'none',
					position: 'absolute',
					zIndex: 20
				}
			});
			document.body.appendChild(this._menu);

			this._menu.addEventListener('mouseleave', function () {
				_utilMisc.hide(_this._menu);
			});

			this._menu.addEventListener('click', this._boundUpdateColumnOrder);
			this._grid = grid;
		};

		ColumnPicker.prototype.destroy = function destroy() {
			this._grid.onHeaderContextMenu.unsubscribe(this._handleHeaderContextMenu);
			this._grid.onColumnsReordered.unsubscribe(this._boundUpdateColumnOrder);
			_utilMisc.removeEl(this._menu);
		};

		ColumnPicker.prototype._handleHeaderContextMenu = function _handleHeaderContextMenu(info) {
			var e = info.event;

			e.preventDefault();

			this._menu.innerHTML = '';
			this.updateColumnOrder();
			this._columnCheckboxes = [];

			for (var i = 0; i < this._columns.length; i++) {
				var _li = _utilMisc.createEl({
					tag: 'li'
				});
				this._menu.appendChild(_li);
				var _input = _utilMisc.createEl({
					tag: 'input',
					type: 'checkbox'
				});
				_input.dataset.column_id = this._columns[i].id;
				this._columnCheckboxes.push(_input);

				if (this._grid.getColumnIndex(this._columns[i].id) != null) {
					_input.checked = true;
				}

				var _label = _utilMisc.createEl({
					tag: 'label',
					textContent: this._columns[i].name
				});

				_label.insertBefore(_input, _label.firstChild);
				_li.appendChild(_label);
			}

			var hr = _utilMisc.createEl({
				tag: 'hr'
			});
			this._menu.appendChild(hr);
			var li = _utilMisc.createEl({
				tag: 'li'
			});
			this._menu.appendChild(li);

			var input = _utilMisc.createEl({
				tag: 'input',
				type: 'checkbox'
			});
			input.dataset.option = 'autoresize';
			var label = _utilMisc.createEl({
				tag: 'label',
				textContent: 'Force fit columns'
			});
			label.insertBefore(input, label.firstChild);
			li.appendChild(label);

			if (this._grid.getOptions().forceFitColumns) {
				input.checked = true;
			}

			li = _utilMisc.createEl({
				tag: 'li'
			});

			this._menu.appendChild(li);
			input = _utilMisc.createEl({
				tag: 'input',
				type: 'checkbox'
			});
			input.dataset.option = 'syncresize';
			label = _utilMisc.createEl({
				tag: 'label',
				textContent: 'Synchronous resize'
			});
			label.insertBefore(input, label.firstChild);
			if (this._grid.getOptions().syncColumnCellResize) {
				input.checked = true;
			}

			_utilMisc.setPx(this._menu, 'top', e.pageY - 10);
			_utilMisc.setPx(this._menu, 'left', e.pageX - 10);
			_utilMisc.show(this._menu);
		};

		ColumnPicker.prototype._updateColumnOrder = function _updateColumnOrder() {
			// Because columns can be reordered, we have to update the `columns`
			// to reflect the new order, however we can't just take `grid.getColumns()`,
			// as it does not include columns currently hidden by the picker.
			// We create a new `columns` structure by leaving currently-hidden
			// columns in their original ordinal position and interleaving the results
			// of the current column sort.
			var current = this._grid.getColumns().slice(0),
			    ordered = new Array(this._columns.length);
			for (var i = 0; i < ordered.length; i++) {
				if (this._grid.getColumnIndex(this._columns[i].id) === undefined) {
					// If the column doesn't return a value from getColumnIndex,
					// it is hidden. Leave it in this position.
					ordered[i] = this._columns[i];
				} else {
					// Otherwise, grab the next visible column.
					ordered[i] = current.shift();
				}
			}

			this._columns = ordered;
		};

		ColumnPicker.prototype._updateColumn = function _updateColumn(e) {
			var _this2 = this;

			if (e.target.dataset.option === 'autoresize') {
				if (e.target.checked) {
					this._grid.setOptions({ forceFitColumns: true });
					this._grid.autosizeColumns();
				} else {
					this._grid.setOptions({ forceFitColumns: false });
				}

				return;
			}

			if (e.target.dataset.option === 'syncresize') {
				if (e.target.checked) {
					this._grid.setOptions({ syncColumnCellResize: true });
				} else {
					this._grid.setOptions({ syncColumnCellResize: false });
				}

				return;
			}

			if (e.target.type === 'checkbox') {
				var _ret = (function () {
					var visibleColumns = [];
					_this2._columnCheckboxes.forEach(function (c, i) {
						if (c.checked) {
							visibleColumns.push(this._columns[i]);
						}
					});

					if (!visibleColumns.length) {
						e.target.checked = true;
						return {
							v: undefined
						};
					}

					_this2._grid.setColumns(visibleColumns);
				})();

				if (typeof _ret === 'object') return _ret.v;
			}
		};

		ColumnPicker.prototype.getAllColumns = function getAllColumns() {
			return this._columns;
		};

		return ColumnPicker;
	})();

	module.exports = ColumnPicker;
});