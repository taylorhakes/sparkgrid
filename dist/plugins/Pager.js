(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["exports", "module", "../core"], factory);
	} else if (typeof exports !== "undefined" && typeof module !== "undefined") {
		factory(exports, module, require("../core"));
	}
})(function (exports, module, _core) {
	"use strict";

	module.exports = Pager;
	var GlobalEditorLock = _core.GlobalEditorLock;
	var createEl = _core.createEl;
	var toggle = _core.toggle;
	var slice = _core.slice;
	var query = _core.query;
	function Pager(dataView, grid, container) {
		var status;

		function init() {
			dataView.onPagingInfoChanged.subscribe(function (e, pagingInfo) {
				updatePager(pagingInfo);
			});

			constructPagerUI();
			updatePager(dataView.getPagingInfo());
		}

		function getNavState() {
			var cannotLeaveEditMode = !GlobalEditorLock.commitCurrentEdit();
			var pagingInfo = dataView.getPagingInfo();
			var lastPage = pagingInfo.totalPages - 1;

			return {
				canGotoFirst: !cannotLeaveEditMode && pagingInfo.pageSize != 0 && pagingInfo.pageNum > 0,
				canGotoLast: !cannotLeaveEditMode && pagingInfo.pageSize != 0 && pagingInfo.pageNum != lastPage,
				canGotoPrev: !cannotLeaveEditMode && pagingInfo.pageSize != 0 && pagingInfo.pageNum > 0,
				canGotoNext: !cannotLeaveEditMode && pagingInfo.pageSize != 0 && pagingInfo.pageNum < lastPage,
				pagingInfo: pagingInfo
			};
		}

		function setPageSize(n) {
			dataView.setRefreshHints({
				isFilterUnchanged: true
			});
			dataView.setPagingOptions({ pageSize: n });
		}

		function gotoFirst() {
			if (getNavState().canGotoFirst) {
				dataView.setPagingOptions({ pageNum: 0 });
			}
		}

		function gotoLast() {
			var state = getNavState();
			if (state.canGotoLast) {
				dataView.setPagingOptions({ pageNum: state.pagingInfo.totalPages - 1 });
			}
		}

		function gotoPrev() {
			var state = getNavState();
			if (state.canGotoPrev) {
				dataView.setPagingOptions({ pageNum: state.pagingInfo.pageNum - 1 });
			}
		}

		function gotoNext() {
			var state = getNavState();
			if (state.canGotoNext) {
				dataView.setPagingOptions({ pageNum: state.pagingInfo.pageNum + 1 });
			}
		}

		function constructPagerUI() {
			container.innerHTML = "";

			var nav = createEl({
				tag: "span",
				className: "spark-pager-nav"
			});

			container.appendChild(nav);
			var settings = createEl({
				tag: "span",
				className: "spark-pager-settings"
			});
			container.appendChild(settings);
			status = createEl({
				tag: "span",
				className: "spark-pager-status"
			});
			container.appendChild(status);

			settings.innerHTML = "<span class='spark-pager-settings-expanded' style='display:none'>Show: <a data=0>All</a><a data='-1'>Auto</a><a data=25>25</a><a data=50>50</a><a data=100>100</a></span>";

			settings.addEventListener("click", function (e) {
				if (e.target.tagName.toLowerCase() !== "a" || e.target.getAttribute("data") == null) {
					return;
				}

				var pagesize = e.target.getAttribute("data");
				if (pagesize != undefined) {
					if (pagesize == -1) {
						var vp = grid.getViewport();
						setPageSize(vp.bottom - vp.top);
					} else {
						setPageSize(parseInt(pagesize));
					}
				}
			});

			var node = createEl({
				tag: "span",
				className: "spark-icon-settings"
			});
			node.addEventListener("click", function () {
				toggle(settings.children[0]);
			});
			settings.appendChild(node);

			[["spark-icon-first-page", gotoFirst], ["spark-icon-prev-page", gotoPrev], ["spark-icon-next-page", gotoNext], ["spark-icon-last-page", gotoLast]].forEach(function (item) {
				node = createEl({
					tag: "span",
					className: item[0]
				});
				node.addEventListener("click", item[1]);
				nav.appendChild(node);
			});

			var wrapper = createEl({
				tag: "div",
				className: "spark-pager"
			});
			slice(container.children).forEach(function (c) {
				wrapper.appendChild(c);
			});
			container.appendChild(wrapper);
		}

		function updatePager(pagingInfo) {
			var state = getNavState();

			query(".spark-pager-nav span", container).forEach(function (span) {
				span.classList.remove("spark-disabled");
			});
			if (!state.canGotoFirst) {
				query(".spark-icon-first-page", container).forEach(function (icon) {
					icon.classList.add("spark-disabled");
				});
			}
			if (!state.canGotoLast) {
				query(".spark-icon-last-page", container).forEach(function (icon) {
					icon.classList.add("spark-disabled");
				});
			}
			if (!state.canGotoNext) {
				query(".spark-icon-next-page", container).forEach(function (icon) {
					icon.classList.add("spark-disabled");
				});
			}
			if (!state.canGotoPrev) {
				query(".spark-icon-prev-page", container).forEach(function (icon) {
					icon.classList.add("spark-disabled");
				});
			}

			if (pagingInfo.pageSize == 0) {
				var totalRowsCount = dataView.getItems().length;
				var visibleRowsCount = pagingInfo.totalRows;
				if (visibleRowsCount < totalRowsCount) {
					status.textContent = "Showing " + visibleRowsCount + " of " + totalRowsCount + " rows";
				} else {
					status.textContent = "Showing all " + totalRowsCount + " rows";
				}
				status.textContent = "Showing all " + pagingInfo.totalRows + " rows";
			} else {
				status.textContent = "Showing page " + (pagingInfo.pageNum + 1) + " of " + pagingInfo.totalPages;
			}
		}

		init();
	}
});