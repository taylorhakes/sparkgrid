import { closest, extend } from '../util/misc';

const defaults = {
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
class AutoTooltips {
	constructor(options) {
		this._options = extend({}, defaults, options);
		this._grid = null;
	}

	/**
	 * Initialize plugin.
	 */
	init(grid) {
		this._grid = grid;

		if (this._options.enableForCells) {
			this._boundHandleMouseEnter = (info) => {
				let e = info.event,
					cell = this._grid.getCellFromEvent(e);
				if (cell) {
					let node = this._grid.getCellNode(cell.row, cell.cell),
						text;
					if (node.clientWidth < node.scrollWidth) {
						text = node.textContent.trim();
						if (options.maxToolTipLength && text.length > options.maxToolTipLength) {
							text = text.substr(0, options.maxToolTipLength - 3) + '...';
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
			this._boundHandleHeaderMouseEnter = (info) => {
				let e = info.e, data = info.data,
					column = data.column,
					node = core.closest(e.target, '.slick-header-column');
				if (!column.toolTip) {
					node.title = node.clientWidth < node.scrollWidth ? column.name : '';
				}
			};
			this._grid.onHeaderMouseEnter.subscribe(this._boundHandleHeaderMouseEnter());
		}
	}

	/**
	 * Destroy plugin.
	 */
	destroy() {
		if (this._options.enableForCells) {
			this._grid.onMouseEnter.unsubscribe(this._boundHandleMouseEnter);
		}
		if (this._options.enableForHeaderCells) {
			this._grid.onHeaderMouseEnter.unsubscribe(this._boundHandleHeaderMouseEnter());
		}
	}
}

export default AutoTooltips;