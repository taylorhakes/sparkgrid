/***
 * A base class that all special / non-data rows (like Group and GroupTotals) derive from.
 * @class NonDataItem
 * @constructor
 */
function NonDataItem() {
	this.__nonDataRow = true;
}

export default NonDataItem;
