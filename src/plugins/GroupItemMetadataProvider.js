import { extend } from '../util/misc';
import Group from '../grouping/Group';
import { KEYCODES } from '../util/events';

let defaults = {
		groupCssClass: 'spark-group',
		groupTitleCssClass: 'spark-group-title',
		totalsCssClass: 'spark-group-totals',
		groupFocusable: true,
		totalsFocusable: false,
		toggleCssClass: 'spark-group-toggle',
		toggleExpandedCssClass: 'spark-icon-remove-circle',
		toggleCollapsedCssClass: 'spark-icon-add-circle',
		enableExpandCollapse: true,
		groupFormatter: defaultGroupCellFormatter,
		totalsFormatter: defaultTotalsCellFormatter
	};

function defaultGroupCellFormatter(row, cell, value, columnDef, item) {
	if (!this._options.enableExpandCollapse) {
		return item.title;
	}

	var indentation = item.level * 15 + 'px';

	return '<span class="' + this._options.toggleCssClass + ' ' +
		(item.collapsed ? this._options.toggleCollapsedCssClass : this._options.toggleExpandedCssClass) +
		'" style="margin-left:' + indentation + '">' +
		'</span>' +
		'<span class="' + this._options.groupTitleCssClass + '" level="' + item.level + '">' +
		item.title +
		'</span>';
}

function defaultTotalsCellFormatter(row, cell, value, columnDef, item) {
	return (columnDef.groupTotalsFormatter && columnDef.groupTotalsFormatter(item, columnDef)) || '';
}

/***
 * Provides item metadata for group (spark.Group) and totals (spark.Totals) rows produced by the DataView.
 * This metadata overrides the default behavior and formatting of those rows so that they appear and function
 * correctly when processed by the grid.
 *
 * This class also acts as a grid plugin providing event handlers to expand & collapse groups.
 * If 'grid.registerPlugin(...)' is not called, expand & collapse will not work.
 *
 * @class GroupItemMetadataProvider
 * @constructor
 * @param options
 */
class GroupItemMetadataProvider {
	constructor(options) {
		this._options = extend({}, defaults, options);
		this._grid = null;
	}

	init(grid) {
		this._grid = grid;
		this._boundHandleGridClick = this._handleGridClick.bind(this);
		this._boundHandleGridKeyDown = this._handleGridKeyDown.bind(this);
		grid.onClick.subscribe(this._boundHandleGridClick);
		grid.onKeyDown.subscribe(this._boundHandleGridKeyDown);

	}

	destroy() {
		if (this._grid) {
			this._grid.onClick.unsubscribe(this._boundHandleGridClick);
			this._grid.onKeyDown.unsubscribe(this._boundHandleGridKeyDown);
		}
	}

	toggleGroup(e, cell) {
		let item = this._grid.getDataItem(cell.row);
		if (item && item instanceof Group) {
			let range = this._grid.getRenderedRange(),
				dataView = this._grid.getData();

			dataView.getData().setRefreshHints({
				ignoreDiffsBefore: range.top,
				ignoreDiffsAfter: range.bottom
			});

			if (item.collapsed) {
				dataView.expandGroup(0, item.groupingKey);
			} else {
				dataView.collapseGroup(0, item.groupingKey);
			}
			e.preventDefault();
		}
	}

	_handleGridClick(info) {
		let data = info.data,
			e = info.event,
			item = this._grid.getDataItem(data.row);

		if (item && item instanceof Group && e.target.classList.contains(this._options.toggleCssClass)) {
			this.toggleGroup(e, data);
		}
	}

	// TODO:  add -/+ handling
	_handleGridKeyDown(info) {
		let e = info.event;
		if (this._options.enableExpandCollapse && (e.which === KEYCODES.SPACE)) {
			let activeCell = this.getActiveCell();
			if (activeCell) {
				this.toggleGroup(e, activeCell);
			}
		}
	}

	getGroupRowMetadata() {
		return {
			selectable: false,
			focusable: this._options.groupFocusable,
			cssClasses: this._options.groupCssClass,
			columns: {
				0: {
					colspan: '*',
					formatter: this._options.groupFormatter,
					editor: null
				}
			}
		};
	}

	getTotalsRowMetadata() {
		return {
			selectable: false,
			focusable: this._options.totalsFocusable,
			cssClasses: this._options.totalsCssClass,
			formatter: this._options.totalsFormatter,
			editor: null
		};
	}
}

export default GroupItemMetadataProvider;
