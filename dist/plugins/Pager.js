(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc', '../Grid'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'), require('../Grid'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.Grid);
		global.Pager = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _Grid) {
	'use strict';

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Grid2 = _interopRequireDefault(_Grid);

	var GlobalEditorLock = _Grid2['default'].GlobalEditorLock;

	var Pager = (function () {
		function Pager(options) {
			_classCallCheck(this, Pager);

			this._status = null;
			this._dataView = options.dataView;
			this._grid = null;
			this._container = options.container;

			this._boundGotoFirst = this.gotoFirst.bind(this);
			this._boundGotoLast = this.gotoLast.bind(this);
			this._boundGotoNext = this.gotoNext.bind(this);
			this._boundGotoPrev = this.gotoPrev.bind(this);
		}

		Pager.prototype.init = function init(grid) {
			var _this = this;

			this._grid = grid;

			this._dataView.onPagingInfoChanged.subscribe(function (info) {
				_this.updatePager(info.data);
			});

			this.constructPagerUI();
			this.updatePager(this._dataView.getPagingInfo());
		};

		Pager.prototype.getNavState = function getNavState() {
			var cannotLeaveEditMode = !GlobalEditorLock.commitCurrentEdit(),
			    pagingInfo = this._dataView.getPagingInfo(),
			    lastPage = pagingInfo.totalPages - 1;

			return {
				canGotoFirst: !cannotLeaveEditMode && pagingInfo.pageSize !== 0 && pagingInfo.pageNum > 0,
				canGotoLast: !cannotLeaveEditMode && pagingInfo.pageSize !== 0 && pagingInfo.pageNum !== lastPage,
				canGotoPrev: !cannotLeaveEditMode && pagingInfo.pageSize !== 0 && pagingInfo.pageNum > 0,
				canGotoNext: !cannotLeaveEditMode && pagingInfo.pageSize !== 0 && pagingInfo.pageNum < lastPage,
				pagingInfo: pagingInfo
			};
		};

		Pager.prototype.setPageSize = function setPageSize(n) {
			this._dataView.setRefreshHints({
				isFilterUnchanged: true
			});
			this._dataView.setPagingOptions({ pageSize: n });
		};

		Pager.prototype.gotoFirst = function gotoFirst() {
			if (this.getNavState().canGotoFirst) {
				this._dataView.setPagingOptions({ pageNum: 0 });
			}
		};

		Pager.prototype.gotoLast = function gotoLast() {
			var state = this.getNavState();
			if (state.canGotoLast) {
				this._dataView.setPagingOptions({ pageNum: state.pagingInfo.totalPages - 1 });
			}
		};

		Pager.prototype.gotoPrev = function gotoPrev() {
			var state = this.getNavState();
			if (state.canGotoPrev) {
				this._dataView.setPagingOptions({ pageNum: state.pagingInfo.pageNum - 1 });
			}
		};

		Pager.prototype.gotoNext = function gotoNext() {
			var state = this.getNavState();
			if (state.canGotoNext) {
				this._dataView.setPagingOptions({ pageNum: state.pagingInfo.pageNum + 1 });
			}
		};

		Pager.prototype.constructPagerUI = function constructPagerUI() {
			var _this2 = this;

			this._container.innerHTML = '';

			var nav = _utilMisc.createEl({
				tag: 'span',
				className: 'spark-pager-nav'
			});

			this._container.appendChild(nav);
			var settings = _utilMisc.createEl({
				tag: 'span',
				className: 'spark-pager-settings'
			});
			this._container.appendChild(settings);
			this._status = _utilMisc.createEl({
				tag: 'span',
				className: 'spark-pager-status'
			});
			this._container.appendChild(status);

			settings.innerHTML = '<span class="spark-pager-settings-expanded" style="display:none">Show: <a data=0>All</a><a data="-1">Auto</a><a data=25>25</a><a data=50>50</a><a data=100>100</a></span>';

			settings.addEventListener('click', function (e) {
				if (e.target.tagName.toLowerCase() !== 'a' || e.target.getAttribute('data') == null) {
					return;
				}

				var pagesize = e.target.getAttribute('data');
				if (pagesize != null) {
					if (pagesize === -1) {
						var vp = _this2._grid.getViewport();
						_this2.setPageSize(vp.bottom - vp.top);
					} else {
						_this2.setPageSize(parseInt(pagesize));
					}
				}
			});

			var node = _utilMisc.createEl({
				tag: 'span',
				className: 'spark-icon-settings'
			});
			node.addEventListener('click', function () {
				_utilMisc.toggle(settings.children[0]);
			});
			settings.appendChild(node);

			[['spark-icon-first-page', this._boundGotoFirst], ['spark-icon-prev-page', this._boundGotoPrev], ['spark-icon-next-page', this._boundGotoNext], ['spark-icon-last-page', this._boundGotoLast]].forEach(function (item) {
				node = _utilMisc.createEl({
					tag: 'span',
					className: item[0]
				});
				node.addEventListener('click', item[1]);
				nav.appendChild(node);
			});

			var wrapper = _utilMisc.createEl({
				tag: 'div',
				className: 'spark-pager'
			});
			_utilMisc.slice(this._container.children).forEach(function (c) {
				wrapper.appendChild(c);
			});
			this._container.appendChild(wrapper);
		};

		Pager.prototype.updatePager = function updatePager(pagingInfo) {
			var state = this.getNavState();

			_utilMisc.query('.spark-pager-nav span', this._container).forEach(function (span) {
				span.classList.remove('spark-disabled');
			});
			if (!state.canGotoFirst) {
				_utilMisc.query('.spark-icon-first-page', this._container).forEach(function (icon) {
					icon.classList.add('spark-disabled');
				});
			}

			if (!state.canGotoLast) {
				_utilMisc.query('.spark-icon-last-page', this._container).forEach(function (icon) {
					icon.classList.add('spark-disabled');
				});
			}

			if (!state.canGotoNext) {
				_utilMisc.query('.spark-icon-next-page', this._container).forEach(function (icon) {
					icon.classList.add('spark-disabled');
				});
			}

			if (!state.canGotoPrev) {
				_utilMisc.query('.spark-icon-prev-page', this._container).forEach(function (icon) {
					icon.classList.add('spark-disabled');
				});
			}

			if (pagingInfo.pageSize === 0) {
				var totalRowsCount = this._dataView.getItems().length,
				    visibleRowsCount = pagingInfo.totalRows;
				if (visibleRowsCount < totalRowsCount) {
					this._status.textContent = 'Showing ' + visibleRowsCount + ' of ' + totalRowsCount + ' rows';
				} else {
					this._status.textContent = 'Showing all ' + totalRowsCount + ' rows';
				}

				this._status.textContent = 'Showing all ' + pagingInfo.totalRows + ' rows';
			} else {
				this._status.textContent = 'Showing page ' + (pagingInfo.pageNum + 1) + ' of ' + pagingInfo.totalPages;
			}
		};

		return Pager;
	})();

	module.exports = Pager;
});