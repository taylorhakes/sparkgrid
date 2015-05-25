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
		global.CellRangeDecorator = mod.exports;
	}
})(this, function (exports, module, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

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

	var CellRangeDecorator = (function () {
		function CellRangeDecorator(options) {
			_classCallCheck(this, CellRangeDecorator);

			var defaults = {
				selectionCssClass: 'slick-range-decorator',
				selectionCss: {
					zIndex: '9999',
					border: '2px dashed red'
				}
			};

			this._el = null;
			this._options = _utilMisc.deepExtend({}, defaults, options);
		}

		CellRangeDecorator.prototype.init = function init(grid) {
			this._grid = grid;
		};

		CellRangeDecorator.prototype.show = function show(range) {
			if (!this._el) {
				this._el = _utilMisc.createEl({
					style: _utilMisc.extend({}, this._options.selectionCss, {
						position: 'absolute'
					}),
					className: this._options.selectionCssClass
				});

				this._grid.getCanvaseNode().appendChild(this._el);
			}

			var from = this._grid.getCellNodeBox(range.fromRow, range.fromCell),
			    to = this._grid.getCellNodeBox(range.toRow, range.toCell);

			this._el.css({
				top: from.top - 1,
				left: from.left - 1,
				height: to.bottom - from.top - 2,
				width: to.right - from.left - 2
			});

			return this._el;
		};

		CellRangeDecorator.prototype.hide = function hide() {
			if (this._el) {
				this._el.remove();
				this._el = null;
			}
		};

		return CellRangeDecorator;
	})();

	module.exports = CellRangeDecorator;
});