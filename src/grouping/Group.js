import NonDataItem from './NonDataItem';

/***
 * Information about a group of rows.
 * @class Group
 * @extends Slick.NonDataItem
 * @constructor
 */
class Group extends NonDataItem {
	constructor() {
		super();

		this.__group = true;

		/**
		 * Grouping level, starting with 0.
		 * @property level
		 * @type {Number}
		 */
		this.level = 0;

		/***
		 * Number of rows in the group.
		 * @property count
		 * @type {Integer}
		 */
		this.count = 0;

		/***
		 * Grouping value.
		 * @property value
		 * @type {Object}
		 */
		this.value = null;

		/***
		 * Formatted display value of the group.
		 * @property title
		 * @type {String}
		 */
		this.title = null;

		/***
		 * Whether a group is collapsed.
		 * @property collapsed
		 * @type {Boolean}
		 */
		this.collapsed = false;

		/***
		 * GroupTotals, if any.
		 * @property totals
		 * @type {GroupTotals}
		 */
		this.totals = null;

		/**
		 * Rows that are part of the group.
		 * @property rows
		 * @type {Array}
		 */
		this.rows = [];

		/**
		 * Sub-groups that are part of the group.
		 * @property groups
		 * @type {Array}
		 */
		this.groups = null;

		/**
		 * A unique key used to identify the group.  This key can be used in calls to DataView
		 * collapseGroup() or expandGroup().
		 * @property groupingKey
		 * @type {Object}
		 */
		this.groupingKey = null;
	}
	/***
	 * Compares two Group instances.
	 * @method equals
	 * @return {Boolean}
	 * @param group {Group} Group instance to compare to.
	 */
	equals(group) {
		return this.value === group.value && this.count === group.count && this.collapsed === group.collapsed && this.title === group.title;
	}
}

export default Group;
