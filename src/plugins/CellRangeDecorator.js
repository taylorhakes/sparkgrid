import { extend, createEl } from '../util/misc';

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
class CellRangeDecorator {
	constructor(options) {
		let _defaults = {
			selectionCssClass: 'slick-range-decorator',
			selectionCss: {
				"zIndex": "9999",
				"border": "2px dashed red"
			}
		};

		this._el = null;
		this._options = extend({}, _defaults, options);
	}
	init(grid) {
		this._grid = grid;
	}

	show(range) {
		if (!this._elem) {
			this._elem = createEl({
				style: extend({}, options.selectionCss, {
					position: 'absolute'
				}),
				className: options.selectionCssClass
			});

			this._grid.getCanvaseNode().appendChild(this._elem);
		}

		let from = this._grid.getCellNodeBox(range.fromRow, range.fromCell),
			to = this._grid.getCellNodeBox(range.toRow, range.toCell);

		this._elem.css({
			top: from.top - 1,
			left: from.left - 1,
			height: to.bottom - from.top - 2,
			width: to.right - from.left - 2
		});

		return this._elem;
	}

	hide() {
		if (this._elem) {
			this._elem.remove();
			this._elem = null;
		}
	}
}

export default CellRangeDecorator;
