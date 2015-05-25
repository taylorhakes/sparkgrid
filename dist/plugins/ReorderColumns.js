(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', 'sortablejs', '../util/events'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('sortablejs'), require('../util/events'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.Sortable, global.events);
		global.ReorderColumns = mod.exports;
	}
})(this, function (exports, module, _sortablejs, _utilEvents) {
	'use strict';

	function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	/**
  * This file needs Sortable `npm install html5-sortable`
  */

	var _Sortable = _interopRequire(_sortablejs);

	var ReorderColumns = (function () {
		function ReorderColumns(options) {
			_classCallCheck(this, ReorderColumns);

			this._grid = null;
			this._header = null;
			this._sortable = null;
			this.onColumnsReordered = new _utilEvents.Event();
			this._boundMovableInit = this.movableInit.bind(this);
			this._boundHandDragEnd = this.handleDragEnd.bind(this);
		}

		ReorderColumns.prototype.init = function init(grid) {
			this._grid = grid;
			grid.onHeadersRendered.subscribe(this._boundMovableInit);
			this.movableInit();
		};

		ReorderColumns.prototype.movableInit = function movableInit() {
			this._header = this._grid.getHeader();

			if (this._sortable) {
				this._sortable.destroy();
			}

			this._sortable = new _Sortable(this._header, {
				onUpdate: this.boundHandleDragEnd,
				animation: 300
			});
		};

		ReorderColumns.prototype.handleDragEnd = function handleDragEnd(evt) {
			var parent = evt.item.parentNode,
			    ids = [],
			    reorderedColumns = [],
			    uid = this._grid.getUid(),
			    columns = this._grid.getColumns();

			var len = parent.children.length;
			for (var i = 0; i < len; i++) {
				ids.push(parent.children[i].id);
			}

			for (var i = 0; i < ids.length; i++) {
				reorderedColumns.push(columns[this._grid.getColumnIndex(ids[i].replace(uid, ''))]);
			}

			this._grid.setColumns(reorderedColumns);
			this.onColumnsReordered.notify();
		};

		ReorderColumns.prototype.destroy = function destroy() {
			this._grid.onHeadersRendered.unsubscribe(this._boundMovableInit);
			this._sortable.destroy();
		};

		return ReorderColumns;
	})();

	module.exports = ReorderColumns;
});