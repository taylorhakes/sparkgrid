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
		global.AutoTooltips = mod.exports;
	}
})(this, function (exports, module, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var defaults = {
		enableForCells: true,
		enableForHeaderCells: false,
		maxToolTipLength: null
	};

	/**
  * AutoTooltips plugin to show/hide tooltips when columns are too narrow to fit content.
  * @constructor
  * @param {boolean} [options.enableForCells=true]        - Enable tooltip for grid cells
  * @param {boolean} [options.enableForHeaderCells=false] - Enable tooltip for header cells
  * @param {number}  [options.maxToolTipLength=null]      - The maximum length for a tooltip
  */

	var AutoTooltips = (function () {
		function AutoTooltips(options) {
			_classCallCheck(this, AutoTooltips);

			this._options = _utilMisc.extend({}, defaults, options);
			this._grid = null;
		}

		/**
   * Initialize plugin.
   */

		AutoTooltips.prototype.init = function init(grid) {
			var _this = this;

			this._grid = grid;

			if (this._options.enableForCells) {
				this._boundHandleMouseEnter = function (info) {
					var e = info.event,
					    cell = _this._grid.getCellFromEvent(e);
					if (cell) {
						var node = _this._grid.getCellNode(cell.row, cell.cell),
						    text = undefined;
						if (node.clientWidth < node.scrollWidth) {
							text = node.textContent.trim();
							if (_this._options.maxToolTipLength && text.length > _this._options.maxToolTipLength) {
								text = text.substr(0, _this._options.maxToolTipLength - 3) + '...';
							}
						} else {
							text = '';
						}

						node.title = text;
					}
				};
				this._grid.onMouseEnter.subscribe(this._boundHandleMouseEnter);
			}

			if (this._options.enableForHeaderCells) {
				this._boundHandleHeaderMouseEnter = function (info) {
					var e = info.e,
					    data = info.data,
					    column = data.column,
					    node = _utilMisc.closest(e.target, '.slick-header-column');
					if (!column.toolTip) {
						node.title = node.clientWidth < node.scrollWidth ? column.name : '';
					}
				};
				this._grid.onHeaderMouseEnter.subscribe(this._boundHandleHeaderMouseEnter());
			}
		};

		/**
   * Destroy plugin.
   */

		AutoTooltips.prototype.destroy = function destroy() {
			if (this._options.enableForCells) {
				this._grid.onMouseEnter.unsubscribe(this._boundHandleMouseEnter);
			}

			if (this._options.enableForHeaderCells) {
				this._grid.onHeaderMouseEnter.unsubscribe(this._boundHandleHeaderMouseEnter());
			}
		};

		return AutoTooltips;
	})();

	module.exports = AutoTooltips;
});