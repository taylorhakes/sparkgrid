(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod);
		global.Range = mod.exports;
	}
})(this, function (exports, module) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	/***
  * A structure containing a range of cells.
  * @class Range
  * @constructor
  * @param fromRow {Integer} Starting row.
  * @param fromCell {Integer} Starting cell.
  * @param toRow {Integer} Optional. Ending row. Defaults to <code>fromRow</code>.
  * @param toCell {Integer} Optional. Ending cell. Defaults to <code>fromCell</code>.
  */

	var Range = (function () {
		function Range(fromRow, fromCell, toRow, toCell) {
			_classCallCheck(this, Range);

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
		}

		/***
   * Returns whether a range represents a single row.
   * @method isSingleRow
   * @return {Boolean}
   */

		Range.prototype.isSingleRow = function isSingleRow() {
			return this.fromRow === this.toRow;
		};

		/***
   * Returns whether a range represents a single cell.
   * @method isSingleCell
   * @return {Boolean}
   */

		Range.prototype.isSingleCell = function isSingleCell() {
			return this.fromRow === this.toRow && this.fromCell === this.toCell;
		};

		/***
   * Returns whether a range contains a given cell.
   * @method contains
   * @param row {Integer}
   * @param cell {Integer}
   * @return {Boolean}
   */

		Range.prototype.contains = function contains(row, cell) {
			return row >= this.fromRow && row <= this.toRow && cell >= this.fromCell && cell <= this.toCell;
		};

		/***
   * Returns a readable representation of a range.
   * @method toString
   * @return {String}
   */

		Range.prototype.toString = function toString() {
			if (this.isSingleCell()) {
				return '(' + this.fromRow + ':' + this.fromCell + ')';
			} else {
				return '(' + this.fromRow + ':' + this.fromCell + ' - ' + this.toRow + ':' + this.toCell + ')';
			}
		};

		return Range;
	})();

	module.exports = Range;
});