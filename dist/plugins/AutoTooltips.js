(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["exports", "module", "../core"], factory);
	} else if (typeof exports !== "undefined" && typeof module !== "undefined") {
		factory(exports, module, require("../core"));
	}
})(function (exports, module, _core) {
	"use strict";

	/**
  * AutoTooltips plugin to show/hide tooltips when columns are too narrow to fit content.
  * @constructor
  * @param {boolean} [options.enableForCells=true]        - Enable tooltip for grid cells
  * @param {boolean} [options.enableForHeaderCells=false] - Enable tooltip for header cells
  * @param {number}  [options.maxToolTipLength=null]      - The maximum length for a tooltip
  */
	module.exports = AutoTooltips;
	var closest = _core.closest;
	var extend = _core.extend;
	function AutoTooltips(options) {
		var _grid;
		var _defaults = {
			enableForCells: true,
			enableForHeaderCells: false,
			maxToolTipLength: null
		};

		/**
   * Initialize plugin.
   */
		function init(grid) {
			options = extend({}, _defaults, options);
			_grid = grid;
			if (options.enableForCells) _grid.onMouseEnter.subscribe(handleMouseEnter);
			if (options.enableForHeaderCells) _grid.onHeaderMouseEnter.subscribe(handleHeaderMouseEnter);
		}

		/**
   * Destroy plugin.
   */
		function destroy() {
			if (options.enableForCells) _grid.onMouseEnter.unsubscribe(handleMouseEnter);
			if (options.enableForHeaderCells) _grid.onHeaderMouseEnter.unsubscribe(handleHeaderMouseEnter);
		}

		/**
   * Handle mouse entering grid cell to add/remove tooltip.
   * @param {jQuery.Event} e - The event
   */
		function handleMouseEnter(e) {
			var cell = _grid.getCellFromEvent(e);
			if (cell) {
				var node = _grid.getCellNode(cell.row, cell.cell);
				var text;
				if (node.clientWidth < node.scrollWidth) {
					text = node.textContent.trim();
					if (options.maxToolTipLength && text.length > options.maxToolTipLength) {
						text = text.substr(0, options.maxToolTipLength - 3) + "...";
					}
				} else {
					text = "";
				}
				node.title = text;
			}
		}

		/**
   * Handle mouse entering header cell to add/remove tooltip.
   * @param {jQuery.Event} e     - The event
   * @param {object} args.column - The column definition
   */
		function handleHeaderMouseEnter(e, args) {
			var column = args.column,
			    node = core.closest(e.target, ".slick-header-column");
			if (!column.toolTip) {
				node.title = node.clientWidth < node.scrollWidth ? column.name : "";
			}
		}

		// Public API
		return {
			init: init,
			destroy: destroy
		};
	}
});