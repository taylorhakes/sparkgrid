(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["exports", "module", "../core"], factory);
	} else if (typeof exports !== "undefined" && typeof module !== "undefined") {
		factory(exports, module, require("../core"));
	}
})(function (exports, module, _core) {
	"use strict";

	module.exports = ColumnPicker;
	var extend = _core.extend;
	var createEl = _core.createEl;
	var setPx = _core.setPx;
	function ColumnPicker(columns, grid, options) {
		var menu;
		var columnCheckboxes;

		var defaults = {
			fadeSpeed: 250
		};

		function init() {
			grid.onHeaderContextMenu.subscribe(handleHeaderContextMenu);
			grid.onColumnsReordered.subscribe(updateColumnOrder);
			options = extend({}, defaults, options);

			menu = createEl({
				tag: "span",
				className: "spark-columnpicker",
				styles: {
					display: "none",
					position: "absolute",
					zIndex: 20
				}
			});
			document.body.appendChild(menu);

			menu.addEventListener("mouseleave", function (e) {
				menu.style.display = "none";
			});
			menu.addEventListener("click", updateColumn);
		}

		function destroy() {
			grid.onHeaderContextMenu.unsubscribe(handleHeaderContextMenu);
			grid.onColumnsReordered.unsubscribe(updateColumnOrder);
			menu.parentNode.removeChild(menu);
		}

		function handleHeaderContextMenu(info) {
			var e = info.event;

			menu.innerHTML = "";
			updateColumnOrder();
			columnCheckboxes = [];

			var li, input, label, hr;
			for (var i = 0; i < columns.length; i++) {
				li = createEl({
					tag: "li"
				});
				menu.appendChild(li);
				input = createEl({
					tag: "input",
					type: "checkbox"
				});
				input.dataset["column-id"] = columns[i].id;
				columnCheckboxes.push(input);

				if (grid.getColumnIndex(columns[i].id) != null) {
					input.checked = true;
				}

				label = createEl({
					tag: "label",
					textContent: columns[i].name
				});

				label.insertBefore(input, label.firstChild);
				li.appendChild(label);
			}

			hr = createEl({
				tag: "hr"
			});
			menu.appendChild(hr);
			li = createEl({
				tag: "li"
			});
			menu.appendChild(li);
			input = createEl({
				tag: "input",
				type: "checkbox"
			});
			input.dataset.option = "autoresize";
			label = createEl({
				tag: "label",
				textContent: "Force fit columns"
			});
			label.insertBefore(input, label.firstChild);
			li.appendChild(label);

			if (grid.getOptions().forceFitColumns) {
				input.checked = true;
			}

			li = createEl({
				tag: "li"
			});
			menu.appendChild(li);
			input = createEl({
				tag: "input",
				type: "checkbox"
			});
			input.dataset.option = "syncresize";
			label = createEl({
				tag: "label",
				textContent: "Synchronous resize"
			});
			label.insertBefore(input, label.firstChild);
			if (grid.getOptions().syncColumnCellResize) {
				input.checked = true;
			}

			setPx(menu, "top", e.pageY - 10);
			setPx(menu, "left", e.pageX - 10);
			menu.style.display = "";
		}

		function updateColumnOrder() {
			// Because columns can be reordered, we have to update the `columns`
			// to reflect the new order, however we can't just take `grid.getColumns()`,
			// as it does not include columns currently hidden by the picker.
			// We create a new `columns` structure by leaving currently-hidden
			// columns in their original ordinal position and interleaving the results
			// of the current column sort.
			var current = grid.getColumns().slice(0);
			var ordered = new Array(columns.length);
			for (var i = 0; i < ordered.length; i++) {
				if (grid.getColumnIndex(columns[i].id) === undefined) {
					// If the column doesn't return a value from getColumnIndex,
					// it is hidden. Leave it in this position.
					ordered[i] = columns[i];
				} else {
					// Otherwise, grab the next visible column.
					ordered[i] = current.shift();
				}
			}
			columns = ordered;
		}

		function updateColumn(e) {
			if (e.target.dataset.option == "autoresize") {
				if (e.target.checked) {
					grid.setOptions({ forceFitColumns: true });
					grid.autosizeColumns();
				} else {
					grid.setOptions({ forceFitColumns: false });
				}
				return;
			}

			if (e.target.dataset.option == "syncresize") {
				if (e.target.checked) {
					grid.setOptions({ syncColumnCellResize: true });
				} else {
					grid.setOptions({ syncColumnCellResize: false });
				}
				return;
			}

			if (e.target.type === "checkbox") {
				var visibleColumns = [];
				$.each(columnCheckboxes, function (i, e) {
					if (this.checked) {
						visibleColumns.push(columns[i]);
					}
				});

				if (!visibleColumns.length) {
					e.target.checked = true;
					return;
				}

				grid.setColumns(visibleColumns);
			}
		}

		function getAllColumns() {
			return columns;
		}

		init();

		return {
			getAllColumns: getAllColumns,
			destroy: destroy
		};
	}
});