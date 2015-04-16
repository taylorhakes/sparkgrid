import { createEl, toggle, slice, query } from  '../util/misc';
import Grid from '../Grid';

let GlobalEditorLock = Grid.GlobalEditorLock;

class Pager {
	constructor(options) {
		this._status = null;
		this._dataView = options.dataView;
		this._grid = null;
		this._container = options.container;

		this._boundGotoFirst = this.gotoFirst.bind(this);
		this._boundGotoLast = this.gotoLast.bind(this);
		this._boundGotoNext = this.gotoNext.bind(this);
		this._boundGotoPrev = this.gotoPrev.bind(this);
	}

	init(grid) {
		this._grid = grid;

		this._dataView.onPagingInfoChanged.subscribe((info) => {
			this.updatePager(info.data);
		});

		this.constructPagerUI();
		this.updatePager(this._dataView.getPagingInfo());
	}

	getNavState() {
		let cannotLeaveEditMode = !GlobalEditorLock.commitCurrentEdit(),
			pagingInfo = this._dataView.getPagingInfo(),
			lastPage = pagingInfo.totalPages - 1;

		return {
			canGotoFirst: !cannotLeaveEditMode && pagingInfo.pageSize !== 0 && pagingInfo.pageNum > 0,
			canGotoLast: !cannotLeaveEditMode && pagingInfo.pageSize !== 0 && pagingInfo.pageNum !== lastPage,
			canGotoPrev: !cannotLeaveEditMode && pagingInfo.pageSize !== 0 && pagingInfo.pageNum > 0,
			canGotoNext: !cannotLeaveEditMode && pagingInfo.pageSize !== 0 && pagingInfo.pageNum < lastPage,
			pagingInfo: pagingInfo
		};
	}

	setPageSize(n) {
		this._dataView.setRefreshHints({
			isFilterUnchanged: true
		});
		this._dataView.setPagingOptions({pageSize: n});
	}

	gotoFirst() {
		if (this.getNavState().canGotoFirst) {
			this._dataView.setPagingOptions({pageNum: 0});
		}
	}

	gotoLast() {
		let state = this.getNavState();
		if (state.canGotoLast) {
			this._dataView.setPagingOptions({pageNum: state.pagingInfo.totalPages - 1});
		}
	}

	gotoPrev() {
		let state = this.getNavState();
		if (state.canGotoPrev) {
			this._dataView.setPagingOptions({pageNum: state.pagingInfo.pageNum - 1});
		}
	}

	gotoNext() {
		let state = this.getNavState();
		if (state.canGotoNext) {
			this._dataView.setPagingOptions({pageNum: state.pagingInfo.pageNum + 1});
		}
	}

	constructPagerUI() {
		this._container.innerHTML = '';

		let nav = createEl({
			tag: 'span',
			className: 'spark-pager-nav'
		});

		this._container.appendChild(nav);
		let settings = createEl({
			tag: 'span',
			className: 'spark-pager-settings'
		});
		this._container.appendChild(settings);
		this._status = createEl({
			tag: 'span',
			className: 'spark-pager-status'
		});
		this._container.appendChild(status);

		settings.innerHTML = '<span class="spark-pager-settings-expanded" style="display:none">Show: <a data=0>All</a><a data="-1">Auto</a><a data=25>25</a><a data=50>50</a><a data=100>100</a></span>';

		settings.addEventListener('click', (e) => {
			if (e.target.tagName.toLowerCase() !== 'a' || e.target.getAttribute('data') == null) {
				return;
			}

			let pagesize = e.target.getAttribute('data');
			if (pagesize != null) {
				if (pagesize === -1) {
					let vp = this._grid.getViewport();
					this.setPageSize(vp.bottom - vp.top);
				} else {
					this.setPageSize(parseInt(pagesize));
				}
			}
		});

		let node = createEl({
			tag: 'span',
			className: 'spark-icon-settings'
		});
		node.addEventListener('click', function () {
			toggle(settings.children[0]);
		});
		settings.appendChild(node);

		[
			['spark-icon-first-page', this._boundGotoFirst],
			['spark-icon-prev-page', this._boundGotoPrev],
			['spark-icon-next-page', this._boundGotoNext],
			['spark-icon-last-page', this._boundGotoLast]
		].forEach(function (item) {
				node = createEl({
					tag: 'span',
					className: item[0]
				});
				node.addEventListener('click', item[1]);
				nav.appendChild(node);
			});

		let wrapper = createEl({
			tag: 'div',
			className: 'spark-pager'
		});
		slice(this._container.children).forEach(function (c) {
			wrapper.appendChild(c);
		});
		this._container.appendChild(wrapper);
	}

	updatePager(pagingInfo) {
		let state = this.getNavState();

		query('.spark-pager-nav span', this._container).forEach(function (span) {
			span.classList.remove('spark-disabled');
		});
		if (!state.canGotoFirst) {
			query('.spark-icon-first-page', this._container).forEach(function (icon) {
				icon.classList.add('spark-disabled');
			});
		}
		if (!state.canGotoLast) {
			query('.spark-icon-last-page', this._container).forEach(function (icon) {
				icon.classList.add('spark-disabled');
			});
		}
		if (!state.canGotoNext) {
			query('.spark-icon-next-page', this._container).forEach(function (icon) {
				icon.classList.add('spark-disabled');
			});
		}
		if (!state.canGotoPrev) {
			query('.spark-icon-prev-page', this._container).forEach(function (icon) {
				icon.classList.add('spark-disabled');
			});
		}

		if (pagingInfo.pageSize === 0) {
			let totalRowsCount = this._dataView.getItems().length,
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
	}
}

export default Pager;
