import { extend, createEl, setPx, removeEl, show, hide } from  '../util/misc';

class ColumnPicker {
	constructor(options) {
		let defaults = {
			fadeSpeed: 250
		};
		this._options = extend({}, defaults, options);
		this._menu = null;
		this._columnCheckboxes = null;
		this._grid = null;
		this._columns = this._options.columns;
	}

	init(grid) {
		this._boundUpdateColumnOrder = this._updateColumn.bind(this);
		grid.onHeaderContextMenu.subscribe(this._handleHeaderContextMenu);
		grid.onColumnsReordered.subscribe(this._boundUpdateColumnOrder);

		// Default to current grid columns
		this._columns = this._columns || grid.getColumns();

		this._menu = createEl({
			tag: 'ul',
			className: 'spark-columnpicker',
			style: {
				display: 'none',
				position: 'absolute',
				zIndex: 20
			}
		});
		document.body.appendChild(this._menu);

		this._menu.addEventListener('mouseleave', () => {
			hide(this._menu);
		});

		this._menu.addEventListener('click', this._boundUpdateColumnOrder);
		this._grid = grid;
	}

	destroy() {
		this._grid.onHeaderContextMenu.unsubscribe(this._handleHeaderContextMenu);
		this._grid.onColumnsReordered.unsubscribe(this._boundUpdateColumnOrder);
		removeEl(this._menu);
	}

	_handleHeaderContextMenu(info) {
		let e = info.event;

		e.preventDefault();

		this._menu.innerHTML = '';
		this.updateColumnOrder();
		this._columnCheckboxes = [];

		for (let i = 0; i < this._columns.length; i++) {
			let li = createEl({
				tag: 'li'
			});
			this._menu.appendChild(li);
			let input = createEl({
				tag: 'input',
				type: 'checkbox'
			});
			input.dataset.column_id = this._columns[i].id;
			this._columnCheckboxes.push(input);

			if (this._grid.getColumnIndex(this._columns[i].id) != null) {
				input.checked = true;
			}

			let label = createEl({
				tag: 'label',
				textContent: this._columns[i].name
			});

			label.insertBefore(input, label.firstChild);
			li.appendChild(label);
		}

		let hr = createEl({
			tag: 'hr'
		});
		this._menu.appendChild(hr);
		let li = createEl({
			tag: 'li'
		});
		this._menu.appendChild(li);

		let input = createEl({
			tag: 'input',
			type: 'checkbox'
		});
		input.dataset.option = 'autoresize';
		let label = createEl({
			tag: 'label',
			textContent: 'Force fit columns'
		});
		label.insertBefore(input, label.firstChild);
		li.appendChild(label);

		if (this._grid.getOptions().forceFitColumns) {
			input.checked = true;
		}

		li = createEl({
			tag: 'li'
		});

		this._menu.appendChild(li);
		input = createEl({
			tag: 'input',
			type: 'checkbox'
		});
		input.dataset.option = 'syncresize';
		label = createEl({
			tag: 'label',
			textContent: 'Synchronous resize'
		});
		label.insertBefore(input, label.firstChild);
		if (this._grid.getOptions().syncColumnCellResize) {
			input.checked = true;
		}

		setPx(this._menu, 'top', e.pageY - 10);
		setPx(this._menu, 'left', e.pageX - 10);
		show(this._menu);
	}

	_updateColumnOrder() {
		// Because columns can be reordered, we have to update the `columns`
		// to reflect the new order, however we can't just take `grid.getColumns()`,
		// as it does not include columns currently hidden by the picker.
		// We create a new `columns` structure by leaving currently-hidden
		// columns in their original ordinal position and interleaving the results
		// of the current column sort.
		let current = this._grid.getColumns().slice(0),
			ordered = new Array(this._columns.length);
		for (let i = 0; i < ordered.length; i++) {
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
	}

	_updateColumn(e) {
		if (e.target.dataset.option === 'autoresize') {
			if (e.target.checked) {
				this._grid.setOptions({forceFitColumns: true});
				this._grid.autosizeColumns();
			} else {
				this._grid.setOptions({forceFitColumns: false});
			}

			return;
		}

		if (e.target.dataset.option === 'syncresize') {
			if (e.target.checked) {
				this._grid.setOptions({syncColumnCellResize: true});
			} else {
				this._grid.setOptions({syncColumnCellResize: false});
			}

			return;
		}

		if (e.target.type === 'checkbox') {
			let visibleColumns = [];
			this._columnCheckboxes.forEach(function(c, i) {
				if (c.checked) {
					visibleColumns.push(this._columns[i]);
				}
			});

			if (!visibleColumns.length) {
				e.target.checked = true;
				return;
			}

			this._grid.setColumns(visibleColumns);
		}
	}

	getAllColumns() {
		return this._columns;
	}
}

export default ColumnPicker;
