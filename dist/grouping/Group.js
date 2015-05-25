(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', './NonDataItem'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('./NonDataItem'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.NonDataItem);
		global.Group = mod.exports;
	}
})(this, function (exports, module, _NonDataItem2) {
	'use strict';

	function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

	var _NonDataItem3 = _interopRequire(_NonDataItem2);

	/***
  * Information about a group of rows.
  * @class Group
  * @extends Slick.NonDataItem
  * @constructor
  */

	var Group = (function (_NonDataItem) {
		function Group() {
			_classCallCheck(this, Group);

			_NonDataItem.call(this);

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

		_inherits(Group, _NonDataItem);

		/***
   * Compares two Group instances.
   * @method equals
   * @return {Boolean}
   * @param group {Group} Group instance to compare to.
   */

		Group.prototype.equals = function equals(group) {
			return this.value === group.value && this.count === group.count && this.collapsed === group.collapsed && this.title === group.title;
		};

		return Group;
	})(_NonDataItem3);

	module.exports = Group;
});