/***
 * A structure containing a range of cells.
 * @class Range
 * @constructor
 * @param fromRow {Integer} Starting row.
 * @param fromCell {Integer} Starting cell.
 * @param toRow {Integer} Optional. Ending row. Defaults to <code>fromRow</code>.
 * @param toCell {Integer} Optional. Ending cell. Defaults to <code>fromCell</code>.
 */
function Range(fromRow, fromCell, toRow, toCell) {
	if (toRow === undefined && toCell === undefined) {
		toRow = fromRow;
		toCell = fromCell;
	}

	/***
	 * @property fromRow
	 * @type {Integer}
	 */
	this.fromRow = Math.min(fromRow, toRow);

	/***
	 * @property fromCell
	 * @type {Integer}
	 */
	this.fromCell = Math.min(fromCell, toCell);

	/***
	 * @property toRow
	 * @type {Integer}
	 */
	this.toRow = Math.max(fromRow, toRow);

	/***
	 * @property toCell
	 * @type {Integer}
	 */
	this.toCell = Math.max(fromCell, toCell);

	/***
	 * Returns whether a range represents a single row.
	 * @method isSingleRow
	 * @return {Boolean}
	 */
	this.isSingleRow = function () {
		return this.fromRow == this.toRow;
	};

	/***
	 * Returns whether a range represents a single cell.
	 * @method isSingleCell
	 * @return {Boolean}
	 */
	this.isSingleCell = function () {
		return this.fromRow == this.toRow && this.fromCell == this.toCell;
	};

	/***
	 * Returns whether a range contains a given cell.
	 * @method contains
	 * @param row {Integer}
	 * @param cell {Integer}
	 * @return {Boolean}
	 */
	this.contains = function (row, cell) {
		return row >= this.fromRow && row <= this.toRow && cell >= this.fromCell && cell <= this.toCell;
	};

	/***
	 * Returns a readable representation of a range.
	 * @method toString
	 * @return {String}
	 */
	this.toString = function () {
		if (this.isSingleCell()) {
			return "(" + this.fromRow + ":" + this.fromCell + ")";
		} else {
			return "(" + this.fromRow + ":" + this.fromCell + " - " + this.toRow + ":" + this.toCell + ")";
		}
	}
}

export default Range;
