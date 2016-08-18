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
		global.GroupTotals = mod.exports;
	}
})(this, function (exports, module, _NonDataItem2) {
	'use strict';

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var _NonDataItem3 = _interopRequireDefault(_NonDataItem2);

	/***
  * Information about group totals.
  * An instance of GroupTotals will be created for each totals row and passed to the aggregators
  * so that they can store arbitrary data in it.  That data can later be accessed by group totals
  * formatters during the display.
  * @class GroupTotals
  * @extends Slick.NonDataItem
  * @constructor
  */

	var GroupTotals = (function (_NonDataItem) {
		_inherits(GroupTotals, _NonDataItem);

		function GroupTotals() {
			_classCallCheck(this, GroupTotals);

			_NonDataItem.call(this);

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

		return GroupTotals;
	})(_NonDataItem3['default']);

	module.exports = GroupTotals;
});