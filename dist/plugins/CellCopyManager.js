(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', 'core/util/events'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('core/util/events'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.events);
		global.CellCopyManager = mod.exports;
	}
})(this, function (exports, module, _coreUtilEvents) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var CellCopyManager = (function () {
		function CellCopyManager() {
			_classCallCheck(this, CellCopyManager);

			this._grid = null;
			this._copiedRanges = null;
			this.onCopyCells = new _coreUtilEvents.Event();
			this.onCopyCancelled = new _coreUtilEvents.Event();
			this.onPasteCells = new _coreUtilEvents.Event();
		}

		CellCopyManager.prototype.init = function init(grid) {
			this._grid = grid;
			this._grid.onKeyDown.subscribe(this._handleKeyDown);
		};

		CellCopyManager.prototype.destroy = function destroy() {
			this._grid.onKeyDown.unsubscribe(this._handleKeyDown);
		};

		CellCopyManager.prototype._handleKeyDown = function _handleKeyDown(info) {
			var ranges = undefined,
			    e = info.event;

			if (!this._grid.getEditorLock().isActive()) {
				if (e.which === _coreUtilEvents.KEYCODES.ESCAPE) {
					if (this._copiedRanges) {
						e.preventDefault();
						this.clearCopySelection();
						this.onCopyCancelled.notify({ ranges: this._copiedRanges });
						this._copiedRanges = null;
					}
				}

				if (e.which === _coreUtilEvents.KEYCODES.C && (e.ctrlKey || e.metaKey)) {
					ranges = this._grid.getSelectionModel().getSelectedRanges();
					if (ranges.length !== 0) {
						e.preventDefault();
						this._copiedRanges = ranges;
						this.markCopySelection(ranges);
						this.onCopyCells.notify({ ranges: ranges });
					}
				}

				if (e.which === _coreUtilEvents.KEYCODES.V && (e.ctrlKey || e.metaKey)) {
					if (this._copiedRanges) {
						e.preventDefault();
						this.clearCopySelection();
						ranges = this._grid.getSelectionModel().getSelectedRanges();
						this.onPasteCells.notify({ from: this._copiedRanges, to: ranges });
						this._copiedRanges = null;
					}
				}
			}
		};

		CellCopyManager.prototype.markCopySelection = function markCopySelection(ranges) {
			var columns = this._grid.getColumns(),
			    hash = {};

			for (var i = 0; i < ranges.length; i++) {
				for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
					hash[j] = {};
					for (var k = ranges[i].fromCell; k <= ranges[i].toCell; k++) {
						hash[j][columns[k].id] = 'copied';
					}
				}
			}

			this._grid.setCellCssStyles('copy-manager', hash);
		};

		CellCopyManager.prototype.clearCopySelection = function clearCopySelection() {
			this._grid.removeCellCssStyles('copy-manager');
		};

		return CellCopyManager;
	})();

	module.exports = CellCopyManager;
});