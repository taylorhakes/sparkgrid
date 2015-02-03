(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["exports", "module", "../core"], factory);
	} else if (typeof exports !== "undefined" && typeof module !== "undefined") {
		factory(exports, module, require("../core"));
	}
})(function (exports, module, _core) {
	"use strict";

	/***
  * Displays an overlay on top of a given cell range.
  *
  * TODO:
  * Currently, it blocks mouse events to DOM nodes behind it.
  * Use FF and WebKit-specific "pointer-events" CSS style, or some kind of event forwarding.
  * Could also construct the borders separately using 4 individual DIVs.
  *
  * @param {Grid} grid
  * @param {Object} options
  */
	module.exports = CellRangeDecorator;
	var extend = _core.extend;
	var createEl = _core.createEl;
	function CellRangeDecorator(grid, options) {
		var _elem;
		var _defaults = {
			selectionCssClass: "slick-range-decorator",
			selectionCss: {
				zIndex: "9999",
				border: "2px dashed red"
			}
		};

		options = extend({}, _defaults, options);


		function show(range) {
			if (!_elem) {
				_elem = createEl({
					style: extend({}, options.selectionCss, {
						position: "absolute"
					}),
					className: options.selectionCssClass
				});

				grid.getCanvaseNode().appendChild(_elem);
			}

			var from = grid.getCellNodeBox(range.fromRow, range.fromCell);
			var to = grid.getCellNodeBox(range.toRow, range.toCell);

			_elem.css({
				top: from.top - 1,
				left: from.left - 1,
				height: to.bottom - from.top - 2,
				width: to.right - from.left - 2
			});

			return _elem;
		}

		function hide() {
			if (_elem) {
				_elem.remove();
				_elem = null;
			}
		}

		return {
			show: show,
			hide: hide
		};
	}
});