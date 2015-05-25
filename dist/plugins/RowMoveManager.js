(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc', '../util/events'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'), require('../util/events'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.events);
		global.RowMoveManager = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _utilEvents) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var defaults = {
		cancelEditOnDrag: false
	};

	var RowMoveManager = (function () {
		function RowMoveManager(options) {
			_classCallCheck(this, RowMoveManager);

			this._grid = null;
			this._canvas = null;
			this._dragging = null;
			this._options = _utilMisc.extend({}, defaults, options);
			this._handler = new _utilEvents.EventHandler();
			this.onMoveRows = new _utilEvents.Event();
		}

		RowMoveManager.prototype.init = function init(grid) {
			this._grid = grid;
			this._canvas = this._grid.getCanvasNode();
			this._handler.subscribe(this._grid.onDragInit, this.handleDragInit.bind(this)).subscribe(this._grid.onDragStart, this.handleDragStart.bind(this)).subscribe(this._grid.onDrag, this.handleDrag.bind(this)).subscribe(this._grid.onDragEnd, this.handleDragEnd.bind(this));
		};

		RowMoveManager.prototype.destroy = function destroy() {
			this._handler.unsubscribeAll();
		};

		RowMoveManager.prototype.handleDragInit = function handleDragInit(info) {
			info.event.stopPropagation();
		};

		RowMoveManager.prototype.handleDragStart = function handleDragStart(info) {
			var e = info.event,
			    cell = this._grid.getCellFromEvent(e),
			    dd = info.data;

			if (this._options.cancelEditOnDrag && this._grid.getEditorLock().isActive()) {
				this._grid.getEditorLock().cancelCurrentEdit();
			}

			if (this._grid.getEditorLock().isActive() || !/move|selectAndMove/.test(this._grid.getColumns()[cell.cell].behavior)) {
				return false;
			}

			this._dragging = true;
			e.stopImmediatePropagation();

			var selectedRows = this._grid.getSelectedRows();

			if (selectedRows.length === 0 || selectedRows.indexOf(cell.row) === -1) {
				selectedRows = [cell.row];
				this._grid.setSelectedRows(selectedRows);
			}

			var rowHeight = this._grid.getOptions().rowHeight,
			    width = this._canvas.clientWidth;

			dd.selectedRows = selectedRows;

			dd.selectionProxy = _utilMisc.createEl({
				className: 'core-reorder-proxy',
				style: {
					position: 'absolute',
					zIndex: '99999',
					width: width,
					height: rowHeight * selectedRows.length
				}
			});
			this._canvas.appendChild(dd.selectionProxy);

			dd.guide = _utilMisc.createEl({
				className: 'core-reorder-guide',
				style: {
					position: 'absolute',
					zIndex: '99998',
					width: width,
					height: rowHeight * selectedRows.length,
					top: -1000 + 'px'
				}
			});
			this._canvas.appendChild(dd.guide);

			dd.insertBefore = -1;
		};

		RowMoveManager.prototype.handleDrag = function handleDrag(info) {
			if (!this._dragging) {
				return;
			}

			var e = info.event,
			    dd = info.data;

			e.stopImmediatePropagation();

			var top = e.pageY - this._canvas.offsetTop;
			dd.selectionProxy.style.top = top - 5 + 'px';

			var insertBefore = Math.max(0, Math.min(Math.round(top / this._grid.getOptions().rowHeight), this._grid.getDataLength()));
			if (insertBefore !== dd.insertBefore) {
				var eventData = {
					rows: dd.selectedRows,
					insertBefore: insertBefore
				};

				if (this.onBeforeMoveRows.notify(eventData) === false) {
					dd.guide.style.top = -1000 + 'px';
					dd.canMove = false;
				} else {
					dd.guide.style.top = insertBefore * this._grid.getOptions().rowHeight + 'px';
					dd.canMove = true;
				}

				dd.insertBefore = insertBefore;
			}
		};

		RowMoveManager.prototype.handleDragEnd = function handleDragEnd(info) {
			if (!this._dragging) {
				return;
			}

			var e = info.event,
			    dd = info.data;

			this._dragging = false;
			e.stopImmediatePropagation();

			dd.guide.remove();
			dd.selectionProxy.remove();

			if (dd.canMove) {
				var eventData = {
					rows: dd.selectedRows,
					insertBefore: dd.insertBefore
				};

				// TODO:  _grid.remapCellCssClasses ?
				this.onMoveRows.notify(eventData);
			}
		};

		return RowMoveManager;
	})();

	module.exports = RowMoveManager;
});