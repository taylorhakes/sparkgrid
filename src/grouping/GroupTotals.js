import NonDataItem from './NonDataItem';

/***
 * Information about group totals.
 * An instance of GroupTotals will be created for each totals row and passed to the aggregators
 * so that they can store arbitrary data in it.  That data can later be accessed by group totals
 * formatters during the display.
 * @class GroupTotals
 * @extends Slick.NonDataItem
 * @constructor
 */
function GroupTotals() {
	this.__groupTotals = true;

	/***
	 * Parent Group.
	 * @param group
	 * @type {Group}
	 */
	this.group = null;

	/***
	 * Whether the totals have been fully initialized / calculated.
	 * Will be set to false for lazy-calculated group totals.
	 * @param initialized
	 * @type {Boolean}
	 */
	this.initialized = false;
}

GroupTotals.prototype = new NonDataItem();

export default GroupTotals;
