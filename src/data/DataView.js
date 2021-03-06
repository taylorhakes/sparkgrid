import { extend }  from '../util/misc';
import Group from '../grouping/Group';
import GroupTotals from '../grouping/GroupTotals';
import { Event, EventControl } from '../util/events';
import GroupItemMetadataProvider from '../plugins/GroupItemMetadataProvider';

let defaults = {
	groupItemMetadataProvider: null
};

let groupingInfoDefaults = {
	getter: null,
	formatter: null,
	comparer(a, b) {
		if (a.value === b.value) {
			return 0;
		}

		return a.value > b.value ? 1 : -1;
	},
	predefinedValues: [],
	aggregators: [],
	aggregateEmpty: false,
	aggregateCollapsed: false,
	aggregateChildGroups: false,
	collapsed: false,
	displayTotalsRow: true,
	lazyTotalsCalculation: false
};

class DataView {
	constructor(options) {

		// Private
		this._grid = null;
		this._idProperty = 'id';  // property holding a unique row id
		this._items = [];         // data by index
		this._rows = [];          // data by row
		this._idxById = {};       // indexes by id
		this._rowsById = null;    // rows by id; lazy-calculated
		this._filter = null;      // filter function
		this._updated = null;     // updated item ids
		this._sortAsc = true;
		this._sortComparer = null;
		this._filterArgs = null;
		this._filteredItems = [];
		this._suspend = false;

		// Grouping
		this._groupingInfos = [];
		this._groups = [];
		this._toggledGroupsByLevel = [];
		this._groupingDelimiter = ':|:';

		// Paging
		this._tempPageNum = null;
		this._pageSize = 0;
		this._pageNum = 0;
		this._totalRows = 0;

		// events
		this.onRowCountChanged = new Event();
		this.onRowsChanged = new Event();
		this.onPagingInfoChanged = new Event();
		this.onRefresh = new Event();

		this._options = extend({}, defaults, options);
	}

	_updateIdxById(startingIndex) {
		startingIndex = startingIndex || 0;
		for (let i = startingIndex, l = this._items.length; i < l; i++) {
			let id = this._items[i][this._idProperty];
			if (id === undefined) {
				throw new Error('Each data element must implement a unique `id` property');
			}

			this._idxById[id] = i;
		}
	}

	_ensureIdUniqueness() {
		for (let i = 0, l = this._items.length; i < l; i++) {
			let id = this._items[i][this._idProperty];
			if (id === undefined || this._idxById[id] !== i) {
				throw new Error('Each data element must implement a unique `id` property');
			}
		}
	}

	_ensureRowsByIdCache() {
		if (!this._rowsById) {
			this._rowsById = {};
			for (let i = 0, l = this._rows.length; i < l; i++) {
				this._rowsById[this._rows[i][this._idProperty]] = i;
			}
		}
	}

	_extractGroups(rows, parentGroup) {
		let group,
			val,
			groups = [],
			groupsByVal = {},
			r,
			level = parentGroup ? parentGroup.level + 1 : 0,
			gi = this._groupingInfos[level];

		for (let i = 0, l = gi.predefinedValues.length; i < l; i++) {
			val = gi.predefinedValues[i];
			group = groupsByVal[val];
			if (!group) {
				group = new Group();
				group.value = val;
				group.level = level;
				group.groupingKey = (parentGroup ? parentGroup.groupingKey + this._groupingDelimiter : '') + val;
				groups[groups.length] = group;
				groupsByVal[val] = group;
			}
		}

		for (let i = 0, l = rows.length; i < l; i++) {
			r = rows[i];
			val = gi.getterIsAFn ? gi.getter(r) : r[gi.getter];
			group = groupsByVal[val];
			if (!group) {
				group = new Group();
				group.value = val;
				group.level = level;
				group.groupingKey = (parentGroup ? parentGroup.groupingKey + this._groupingDelimiter : '') + val;
				groups[groups.length] = group;
				groupsByVal[val] = group;
			}

			group.rows[group.count++] = r;
		}

		if (level < this._groupingInfos.length - 1) {
			for (let i = 0; i < groups.length; i++) {
				group = groups[i];
				group.groups = this._extractGroups(group.rows, group);
			}
		}

		groups.sort(this._groupingInfos[level].comparer);

		return groups;
	}

	_calculateTotals(totals) {
		let group = totals.group,
			gi = this._groupingInfos[group.level],
			isLeafLevel = (group.level === this._groupingInfos.length),
			agg,
			idx = gi.aggregators.length;

		if (!isLeafLevel && gi.aggregateChildGroups) {
			// make sure all the subgroups are calculated
			let i = group.groups.length;
			while (i--) {
				if (!group.groups[i].initialized) {
					this._calculateTotals(group.groups[i]);
				}
			}
		}

		while (idx--) {
			agg = gi.aggregators[idx];
			agg.init();
			if (!isLeafLevel && gi.aggregateChildGroups) {
				agg.accumulate.call(agg, group.groups);
			} else {
				agg.accumulate.call(agg, group.rows);
			}

			agg.storeResult(totals);
		}

		totals.initialized = true;
	}

	_addGroupTotals(group) {
		let gi = this._groupingInfos[group.level],
			totals = new GroupTotals();

		totals.group = group;
		group.totals = totals;
		if (!gi.lazyTotalsCalculation) {
			this._calculateTotals(totals);
		}
	}

	_addTotals(groups, level) {
		level = level || 0;
		let gi = this._groupingInfos[level],
			groupCollapsed = gi.collapsed,
			toggledGroups = this._toggledGroupsByLevel[level],
			idx = groups.length,
			g;

		while (idx--) {
			g = groups[idx];

			if (g.collapsed && !gi.aggregateCollapsed) {
				continue;
			}

			// Do a depth-first aggregation so that parent group aggregators can access subgroup totals.
			if (g.groups) {
				this._addTotals(g.groups, level + 1);
			}

			if (gi.aggregators.length && (
				gi.aggregateEmpty || g.rows.length || (g.groups && g.groups.length))) {
				this._addGroupTotals(g);
			}

			g.collapsed = groupCollapsed ^ toggledGroups[g.groupingKey];
			g.title = gi.formatter ? gi.formatter(g) : g.value;
		}
	}

	_toggleGroup(level, groupingKey, collapse) {
		this._toggledGroupsByLevel[level][groupingKey] = this._groupingInfos[level].collapsed ^ collapse;
		this.refresh();
	}

	_toggleAllGroups(level, collapse) {
		if (level == null) {
			for (let i = 0; i < this._groupingInfos.length; i++) {
				this._toggledGroupsByLevel[i] = {};
				this._groupingInfos[i].collapsed = collapse;
			}
		} else {
			this._toggledGroupsByLevel[level] = {};
			this._groupingInfos[level].collapsed = collapse;
		}

		this.refresh();
	}

	_flattenGroupedRows(groups, level) {
		level = level || 0;

		let gi = this._groupingInfos[level];
		let groupedRows = [], rows, gl = 0, g;

		for (let i = 0, l = groups.length; i < l; i++) {
			g = groups[i];
			groupedRows[gl++] = g;

			if (!g.collapsed) {
				rows = g.groups ? this._flattenGroupedRows(g.groups, level + 1) : g.rows;
				for (let j = 0, jj = rows.length; j < jj; j++) {
					groupedRows[gl++] = rows[j];
				}
			}

			if (g.totals && gi.displayTotalsRow && (!g.collapsed || gi.aggregateCollapsed)) {
				groupedRows[gl++] = g.totals;
			}
		}

		return groupedRows;
	}

	_wrappedFilter(items, args) {
		let filteredItems = [];

		for (let i = 0, len = items.length; i < len; i++) {
			if (this._filter(items[i], args)) {
				filteredItems.push(items[i]);
			}
		}

		return filteredItems;
	}

	_getFilteredAndPagedItems(items) {
		if (this._filter) {
			this._filteredItems = this._wrappedFilter(items, this._filterArgs);
		} else {
			// special case:  if not filtering and not paging, the resulting
			// rows collection needs to be a copy so that changes due to sort
			// can be caught
			this._filteredItems = this._pageSize ? items : items.concat();
		}

		// get the current page
		let paged;
		if (this._pageSize) {
			if (this._filteredItems.length < this._pageNum * this._pageSize) {
				this._pageNum = Math.floor(this._filteredItems.length / this._pageSize);
			}

			paged = this._filteredItems.slice(this._pageSize * this._pageNum, this._pageSize * this._pageNum + this._pageSize);
		} else {
			paged = this._filteredItems;
		}

		return {
			totalRows: this._filteredItems.length,
			rows: paged
		};
	}

	_getRowDiffs(rows, newRows) {
		let item, r, eitherIsNonData, diff = [],
			from = 0, to = newRows.length;

		for (let i = from, rl = rows.length; i < to; i++) {
			if (i >= rl) {
				diff[diff.length] = i;
			} else {
				item = newRows[i];
				r = rows[i];

				if ((this._groupingInfos.length && (eitherIsNonData = (item.__nonDataRow) || (r.__nonDataRow)) && item.__group !== r.__group || item.__group && !item.equals(r)) || (eitherIsNonData && // no good way to compare totals since they are arbitrary DTOs
						// deep object comparison is pretty expensive
						// always considering them 'dirty' seems easier for the time being
					(item.__groupTotals || r.__groupTotals)) || item[this._idProperty] !== r[this._idProperty] || (this._updated && this._updated[item[this._idProperty]])) {
					diff[diff.length] = i;
				}
			}
		}

		return diff;
	}

	_recalc(items) {
		this._rowsById = null;

		let filteredItems = this._getFilteredAndPagedItems(items);
		this._totalRows = filteredItems.totalRows;
		let newRows = filteredItems.rows;

		this._groups = [];
		if (this._groupingInfos.length) {
			this._groups = this._extractGroups(newRows);
			if (this._groups.length) {
				this._addTotals(this._groups);
				newRows = this._flattenGroupedRows(this._groups);
			}
		}

		let diff = this._getRowDiffs(this._rows, newRows);

		this._rows = newRows;

		return diff;
	}

	_mapRowsToIds(rowArray) {
		var ids = [];
		for (var i = 0, l = rowArray.length; i < l; i++) {
			if (rowArray[i] < this._rows.length) {
				ids[ids.length] = this._rows[rowArray[i]][this._idProperty];
			}
		}

		return ids;
	}

	_mapIdsToRows(idArray) {
		var rows = [];
		this._ensureRowsByIdCache();
		for (var i = 0, l = idArray.length; i < l; i++) {
			var row = this._rowsById[idArray[i]];
			if (row != null) {
				rows[rows.length] = row;
			}
		}

		return rows;
	}

	/**
	 * Initialize the view with the grid. This is called by the grid
	 * @param {Grid} grid
	 */
	init(grid) {

		// wire up model events to drive the grid
		this.onRowCountChanged.subscribe(function() {
			grid.updateRowCount();
		});

		this.onRowsChanged.subscribe(function(info) {
			var args = info.data;
			grid.invalidateRows(args.rows);
			grid.render();
		});

		this.onPagingInfoChanged.subscribe(function(info) {
			var pagingInfo = info.data;
			var isLastPage = pagingInfo.pageNum === pagingInfo.totalPages - 1;
			var enableAddRow = isLastPage || pagingInfo.pageSize === 0;
			var options = grid.getOptions();

			if (options.enableAddRow !== enableAddRow) {
				grid.setOptions({enableAddRow: enableAddRow});
			}
		});
	}

	/**
	 * Call before multiple view updates to avoid multiple refreshes
	 */
	beginUpdate() {
		this._suspend = true;
	}

	/**
	 * Call after multiple updates to refresh view with all changes
	 */
	endUpdate() {
		this._suspend = false;
		this.refresh();
	}

	/**
	 * Set page size and/or page number
	 * @param {Object} options
	 * @param {number} options.pageNum
	 * @param {number} options.pageSize
	 */
	setPagingOptions({ pageSize, pageNum }) {
		if (pageSize !== undefined) {
			this._pageSize = pageSize;

		}

		if (pageNum !== undefined) {
			this._tempPageNum = pageNum;
		}

		this.refresh();
	}

	/**
	 * Get page details about the current view
	 * @returns {{pageSize: number, pageNum: number, totalRows: number, totalPages: number}}
	 */
	getPagingInfo() {
		let totalPages = this._pageSize ? Math.max(1, Math.ceil(this._totalRows / this._pageSize)) : 1;
		return {
			pageSize: this._pageSize,
			pageNum: this._pageNum,
			totalRows: this._totalRows,
			totalPages: totalPages
		};
	}

	/**
	 * Get all the items without filters
	 * @returns {Array}
	 */
	getItems() {
		return this._items;
	}

	/**
	 * Set the data
	 * @param {Array} data
	 * @param {string} [objectIdProperty]
	 */
	setItems(data, objectIdProperty) {
		if (objectIdProperty !== undefined) {
			this._idProperty = objectIdProperty;
		}

		this._items = this._filteredItems = data;
		this._idxById = {};
		this._updateIdxById();
		this._ensureIdUniqueness();
		this.refresh();
	}

	setFilter(filterFn) {
		this._filter = filterFn;
		this.refresh();
	}

	/**
	 * Sort the grid with a custom compare function
	 * @param {function} compareFn
	 * @param {boolean} ascending
	 */
	sort(compareFn, ascending) {
		this._sortAsc = ascending;
		this._sortComparer = compareFn;
		if (ascending === false) {
			this._items.reverse();
		}

		this._items.sort(compareFn);
		if (ascending === false) {
			this._items.reverse();
		}

		this._idxById = {};
		this._updateIdxById();
		this.refresh();
	}

	/**
	 * Sort the view with existing filter args and function
	 */
	reSort() {
		if (this._sortComparer) {
			this.sort(this._sortComparer, this._sortAsc);
		}
	}

	/**
	 * Get grouping info
	 * @returns {Array}
	 */
	getGrouping() {
		return this._groupingInfos;
	}

	/**
	 * Set grouping info
	 * @param {Array} groupingInfo
	 */
	setGrouping(groupingInfo) {
		if (!this._options.groupItemMetadataProvider) {
			this._options.groupItemMetadataProvider = new GroupItemMetadataProvider();
		}

		this._groups = [];
		this._toggledGroupsByLevel = [];
		groupingInfo = groupingInfo || [];
		this._groupingInfos = (groupingInfo instanceof Array) ? groupingInfo : [groupingInfo];

		for (let i = 0; i < this._groupingInfos.length; i++) {
			let gi = this._groupingInfos[i] = extend({}, groupingInfoDefaults, this._groupingInfos[i]);
			gi.getterIsAFn = typeof gi.getter === 'function';

			this._toggledGroupsByLevel[i] = {};
		}

		this.refresh();
	}

	/**
	 * Collapse all groups at a level
	 * @param {string} level
	 */
	collapseAllGroups(level) {
		this._toggleAllGroups(level, true);
	}

	/**
	 * Expand all groups at level
	 * @param {string} level
	 */
	expandAllGroups(level) {
		this._toggleAllGroups(level, false);
	}

	/**
	 * Collapse single group
	 * @param {string} level
	 * @param {string} groupingKey
	 */
	collapseGroup(level, groupingKey) {
		this._toggleGroup(level, groupingKey, true);
	}

	/**
	 * Expand single group
	 * @param {string} level
	 * @param {string} groupingKey
	 */
	expandGroup(level, groupingKey) {
		this._toggleGroup(level, groupingKey, false);
	}

	/**
	 * Get all groups
	 * @returns {Array}
	 */
	getGroups() {
		return this._groups;
	}

	/**
	 * Get index by id
	 * @param {string} id
	 * @returns {number}
	 */
	getIdxById(id) {
		return this._idxById[id];
	}

	/**
	 * Get row by Id
	 * @param {string} id
	 * @returns {*}
	 */
	getRowById(id) {
		this._ensureRowsByIdCache();
		return this._rowsById[id];
	}

	/**
	 * Get item by id
	 * @param {string} id
	 * @returns {Object}
	 */
	getItemById(id) {
		return this._items[this._idxById[id]];
	}

	/**
	 * Get item by index
	 * @param {number} index
	 * @returns {Object}
	 */
	getItemByIdx(index) {
		return this._items[index];
	}

	/**
	 * Get rows by an array of IDs
	 * @param {Array<string>} idArray
	 * @returns {Array<Object>}
	 */
	mapIdsToRows(idArray) {
		let rows = [];
		this._ensureRowsByIdCache();
		for (let i = 0, l = idArray.length; i < l; i++) {
			let row = this._rowsById[idArray[i]];
			if (row !== null) {
				rows.push(row);
			}
		}

		return rows;
	}

	/**
	 * Get ids by an array of row objects
	 * @param {Array<Object>} rowArray
	 * @returns {Array<string>}
	 */
	mapRowsToIds(rowArray) {
		let ids = [];
		for (let i = 0, l = rowArray.length; i < l; i++) {
			if (rowArray[i] < this._rows.length) {
				ids[ids.length] = this._rows[rowArray[i]][this._idProperty];
			}
		}

		return ids;
	}

	/**
	 * Set the view filter
	 * @param {Object} args Object with field as property and filter value
	 */
	setFilterArgs(args) {
		this._filterArgs = args;
	}

	/**
	 * Refresh the view after data change
	 */
	refresh() {
		if (this._suspend) {
			return;
		}

		let countBefore = this._rows.length,
			totalRowsBefore = this._totalRows,
			diff = this._recalc(this._items, this._filter); // pass as direct refs to avoid closure perf hit

		if (this._tempPageNum) {
			this._pageNum = this._pageSize ? Math.min(this._tempPageNum, Math.max(0, Math.ceil(this._totalRows / this._pageSize) - 1)) : 0;
		}

		// if the current page is no longer valid, go to last page and recalc
		// we suffer a performance penalty here, but the main loop (recalc) remains highly optimized
		if (this._pageSize && this._totalRows < this._pageNum * this._pageSize) {
			this._pageNum = Math.max(0, Math.ceil(this._totalRows / this._pageSize) - 1);
			diff = this._recalc(this._items, this._filter);
		}

		this._updated = null;

		if (totalRowsBefore !== this._totalRows) {
			this.onPagingInfoChanged.notify(this.getPagingInfo(), null, this);
		}

		if (countBefore !== this._rows.length) {
			this.onRowCountChanged.notify({previous: countBefore, current: this._rows.length}, null, this);
		}

		if (diff.length > 0) {
			this.onRowsChanged.notify({rows: diff}, null, this);
		}

		this.onRefresh.notify(null, null, this);
	}

	/**
	 * Update an item by id
	 * @param {string} id
	 * @param {Object} item
	 */
	updateItem(id, item) {
		if (this._idxById[id] === undefined || id !== item[this._idProperty]) {
			throw new Error('Invalid or non-matching id');
		}

		this._items[this._idxById[id]] = item;
		if (!this._updated) {
			this._updated = {};
		}

		this._updated[id] = true;
		this.refresh();
	}

	/**
	 * Insert an item at an index
	 * @param {number} index
	 * @param {Object} item
	 */
	insertItem(index, item) {
		this._items.splice(index, 0, item);
		this._updateIdxById(index);
		this.refresh();
	}

	/**
	 * Add an item
	 * @param {Object} item
	 */
	addItem(item) {
		this._items.push(item);
		this._updateIdxById(this._items.length - 1);
		this.refresh();
	}

	/**
	 * Delete an item from the view
	 * @param {string} id
	 */
	deleteItem(id) {
		let idx = this._idxById[id];
		if (idx === undefined) {
			throw new Error('Invalid id');
		}

		delete this._idxById[id];
		this._items.splice(idx, 1);
		this._updateIdxById(idx);
		this.refresh();
	}

	/**
	 * Destroy the view
	 */
	destroy() {

	}

	/**
	 * Get the number of items in the view
	 * @returns {Number}
	 */
	getLength() {
		return this._rows.length;
	}

	/**
	 * Get an item by index
	 * @param index
	 * @returns {Object}
	 */
	getItem(index) {
		let item = this._rows[index];

		// if this is a group row, make sure totals are calculated and update the title
		if (item && item.__group && item.totals && !item.totals.initialized) {
			let gi = this._groupingInfos[item.level];
			if (!gi.displayTotalsRow) {
				this._calculateTotals(item.totals);
				item.title = gi.formatter ? gi.formatter(item) : item.value;
			}
		}

		// if this is a totals row, make sure it's calculated
		else if (item && item.__groupTotals && !item.initialized) {
			this._calculateTotals(item);
		}

		return item;
	}

	/**
	 * Get metadata by index
	 * @param index
	 * @returns {{columns: Array, formatter: function, formatterFactory: function}}
	 */
	getItemMetadata(index) {
		let item = this._rows[index];
		if (item === undefined) {
			return null;
		}

		// overrides for grouping rows
		if (item.__group) {
			return this._options.groupItemMetadataProvider.getGroupRowMetadata(item);
		}

		// overrides for totals rows
		if (item.__groupTotals) {
			return this._options.groupItemMetadataProvider.getTotalsRowMetadata(item);
		}

		return null;
	}

	/**
	 * Get items after filter function
	 * @returns {Array}
	 */
	getFilteredItems() {
		return this._filteredItems;
	}

	/**
	 * Sync the data view with a grid
	 * @param {Grid} grid
	 * @param {boolean} preserveHidden
	 * @param {boolean} preserveHiddenOnSelectionChange
	 * @returns {Event}
	 */
	syncGridSelection(grid, preserveHidden, preserveHiddenOnSelectionChange = false) {
		let inHandler,
			selectedRowIds = this._mapRowsToIds(grid.getSelectedRows()),
			onSelectedRowIdsChanged = new Event();

		let setSelectedRowIds = (rowIds) => {
			if (selectedRowIds.join(',') === rowIds.join(',')) {
				return;
			}

			selectedRowIds = rowIds;

			onSelectedRowIdsChanged.notify({
				grid: grid,
				ids: selectedRowIds
			}, new EventControl(), this);
		};

		let update = () => {
			if (selectedRowIds.length > 0) {
				inHandler = true;
				let selectedRows = this._mapIdsToRows(selectedRowIds);
				if (!preserveHidden) {
					setSelectedRowIds(this._mapRowsToIds(selectedRows));
				}

				grid.setSelectedRows(selectedRows);
				inHandler = false;
			}
		};

		grid.onSelectedRowsChanged.subscribe(() => {
			if (inHandler) {
				return;
			}

			let newSelectedRowIds = this._mapRowsToIds(grid.getSelectedRows());
			if (!preserveHiddenOnSelectionChange || !grid.getOptions().multiSelect) {
				setSelectedRowIds(newSelectedRowIds);
			} else {
				// keep the ones that are hidden
				let existing = selectedRowIds.filter((id) => {
					return this.getRowById(id) === undefined;
				});

				// add the newly selected ones
				setSelectedRowIds(existing.concat(newSelectedRowIds));
			}
		});

		this.onRowsChanged.subscribe(update);

		this.onRowCountChanged.subscribe(update);

		return onSelectedRowIdsChanged;
	}

	/**
	 * Sync data view styles with a grid
	 * @param {Grid} grid
	 * @param {string} key
	 */
	syncGridCellCssStyles(grid, key) {
		let hashById,
			inHandler;

		let storeCellCssStyles = (hash) => {
			hashById = {};
			for (let row in hash) {
				let id = this._rows[row][this._idProperty];
				hashById[id] = hash[row];
			}
		};

		// since this method can be called after the cell styles have been set,
		// get the existing ones right away
		storeCellCssStyles(grid.getCellCssStyles(key));

		let update = () => {
			if (hashById) {
				inHandler = true;
				this._ensureRowsByIdCache();
				let newHash = {};
				for (let id in hashById) {
					let row = this._rowsById[id];
					if (row !== undefined) {
						newHash[row] = hashById[id];
					}
				}

				grid.setCellCssStyles(key, newHash);
				inHandler = false;
			}
		};

		grid.onCellCssStylesChanged.subscribe(function(info) {
			let args = info.data;
			if (inHandler) {
				return;
			}

			if (key !== args.key) {
				return;
			}

			if (args.hash) {
				storeCellCssStyles(args.hash);
			}
		});

		this.onRowsChanged.subscribe(update);
		this.onRowCountChanged.subscribe(update);
	}
}

export default DataView;
