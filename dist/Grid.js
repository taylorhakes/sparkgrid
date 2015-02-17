(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["exports", "module", "./core"], factory);
	} else if (typeof exports !== "undefined" && typeof module !== "undefined") {
		factory(exports, module, require("./core"));
	}
})(function (exports, module, _core) {
	"use strict";

	// browser's breaking point


	/**
  * Creates a new instance of the grid.
  * @class Grid
  * @constructor
  * @param {Node}              container   Container node to create the grid in.
  * @param {Array,Object}      data        An array of objects for databinding.
  * @param {Array}             columns     An array of column definitions.
  * @param {Object}            options     Grid options.
  **/
	module.exports = Grid;
	var GlobalEditorLock = _core.GlobalEditorLock;
	var extend = _core.extend;
	var createEl = _core.createEl;
	var delegate = _core.delegate;
	var getCss = _core.getCss;
	var setCss = _core.setCss;
	var slice = _core.slice;
	var closest = _core.closest;
	var toggleClass = _core.toggleClass;
	var Range = _core.Range;
	var Event = _core.Event;


	// shared across all grids on the page
	var scrollbarDimensions,
	    maxSupportedCssHeight,
	    uidIndex = 1;function Grid(container, data, columns, options) {
		// settings
		var defaults = {
			explicitInitialization: false,
			rowHeight: 25,
			defaultColumnWidth: 80,
			enableAddRow: false,
			leaveSpaceForNewRows: false,
			editable: false,
			autoEdit: true,
			enableCellNavigation: true,
			enableColumnReorder: true,
			asyncEditorLoading: false,
			asyncEditorLoadDelay: 100,
			forceFitColumns: true,
			enableAsyncPostRender: false,
			asyncPostRenderDelay: 50,
			autoHeight: false,
			editorLock: GlobalEditorLock,
			showHeaderRow: false,
			headerRowHeight: 25,
			showTopPanel: false,
			topPanelHeight: 25,
			formatterFactory: null,
			editorFactory: null,
			cellFlashingCssClass: "flashing",
			selectedCellCssClass: "selected",
			multiSelect: true,
			enableTextSelectionOnCells: false,
			dataItemColumnValueExtractor: null,
			fullWidthRows: false,
			multiColumnSort: false,
			defaultFormatter: defaultFormatter,
			forceSyncScrolling: false,
			addNewRowCssClass: "new-row"
		},
		    columnDefaults = {
			name: "",
			resizable: true,
			sortable: false,
			minWidth: 30,
			rerenderOnResize: false,
			headerCssClass: null,
			defaultSortAsc: true,
			focusable: true,
			selectable: true
		},
		   

		// scroller
		th,
		    // virtual height
		h,
		    // real scrollable height
		ph,
		    // page height
		n,
		    // number of pages
		cj,
		    // "jumpiness" coefficient

		page = 0,
		    // current page
		offset = 0,
		    // current page offset
		vScrollDir = 1,
		   

		// private
		initialized = false,
		    uid = "sparkgrid_" + uidIndex++,
		    self = this,
		    focusSink,
		    focusSink2,
		    headerScroller,
		    headers,
		    headerRow,
		    headerRowScroller,
		    headerRowSpacer,
		    topPanelScroller,
		    topPanel,
		    viewport,
		    canvas,
		    style,
		    boundAncestors,
		    stylesheet,
		    columnCssRulesL,
		    columnCssRulesR,
		    viewportH,
		    viewportW,
		    canvasWidth,
		    viewportHasHScroll,
		    viewportHasVScroll,
		    headerColumnWidthDiff = 0,
		    headerColumnHeightDiff = 0,
		    // border+padding
		cellWidthDiff = 0,
		    cellHeightDiff = 0,
		    absoluteColumnMinWidth,
		    tabbingDirection = 1,
		    activePosX,
		    activeRow,
		    activeCell,
		    activeCellNode = null,
		    currentEditor = null,
		    serializedEditorValue,
		    editController,
		    rowsCache = {},
		    renderedRows = 0,
		    numVisibleRows,
		    prevScrollTop = 0,
		    scrollTop = 0,
		    lastRenderedScrollTop = 0,
		    lastRenderedScrollLeft = 0,
		    prevScrollLeft = 0,
		    scrollLeft = 0,
		    selectionModel,
		    selectedRows = [],
		    plugins = [],
		    cellCssClasses = {},
		    columnsById = {},
		    sortColumns = [],
		    columnPosLeft = [],
		    columnPosRight = [],
		   

		// async call handles
		h_editorLoader = null,
		    h_render = null,
		    h_postrender = null,
		    postProcessedRows = {},
		    postProcessToRow = null,
		    postProcessFromRow = null,
		   

		// perf counters
		counter_rows_rendered = 0,
		    counter_rows_removed = 0,
		   

		// These two variables work around a bug with inertial scrolling in Webkit/Blink on Mac.
		// See http://crbug.com/312427.
		rowNodeFromLastMouseWheelEvent,
		    // this node must not be deleted while inertial scrolling
		zombieRowNodeFromLastMouseWheelEvent; // node that was hidden instead of getting deleted

		function init() {
			container = typeof container === "string" ? document.querySelector(container) : container;
			if (container.length < 1) {
				throw new Error("SparkGrid requires a valid container, " + container + " does not exist in the DOM.");
			}

			// calculate these only once and share between grid instances
			maxSupportedCssHeight = maxSupportedCssHeight || getMaxSupportedCssHeight();
			scrollbarDimensions = scrollbarDimensions || measureScrollbar();

			options = extend({}, defaults, options);
			validateAndEnforceOptions();
			columnDefaults.width = options.defaultColumnWidth;

			columnsById = {};
			for (var i = 0; i < columns.length; i++) {
				var m = columns[i] = extend({}, columnDefaults, columns[i]);
				columnsById[m.id] = i;
				if (m.minWidth && m.width < m.minWidth) {
					m.width = m.minWidth;
				}
				if (m.maxWidth && m.width > m.maxWidth) {
					m.width = m.maxWidth;
				}
			}

			editController = {
				commitCurrentEdit: commitCurrentEdit,
				cancelCurrentEdit: cancelCurrentEdit
			};

			container.innerHTML = "";
			container.style.overflow = "hidden";
			container.style.outline = 0;
			container.classList.add(uid);
			container.classList.add("spark");

			// set up a positioning container if needed
			var computedStyle = window.getComputedStyle(container);
			if (!/relative|absolute|fixed/.test(computedStyle.position)) {
				container.style.position = "relative";
			}

			focusSink = createEl({
				tag: "div",
				tabIndex: 0,
				hideFocus: true,
				style: {
					width: 0,
					height: 0,
					top: 0,
					left: 0
				}
			});
			container.appendChild(focusSink);

			headerScroller = createEl({
				tag: "div",
				className: "spark-header",
				style: {
					overflow: "hidden",
					position: "relative"
				}
			});
			container.appendChild(headerScroller);

			headers = createEl({
				tag: "div",
				className: "spark-header-columns",
				style: {
					left: "-1000px",
					width: getHeadersWidth() + "px"
				}
			});
			headerScroller.appendChild(headers);

			headerRowScroller = createEl({
				tag: "div",
				className: "spark-headerrow",
				style: {
					overflow: "hidden",
					position: "relative"
				}
			});
			container.appendChild(headerRowScroller);

			headerRow = createEl({
				tag: "div",
				className: "spark-headerrow-columns"
			});
			headerRowScroller.appendChild(headerRow);

			headerRowSpacer = createEl({
				tag: "div",
				style: {
					height: "1px",
					position: "absolute",
					top: 0,
					left: 0,
					width: getCanvasWidth() + scrollbarDimensions.width
				}
			});
			headerRowScroller.appendChild(headerRowSpacer);

			topPanelScroller = createEl({
				tag: "div",
				className: "spark-top-panel-scroller",
				style: {
					overflow: "hidden",
					position: "relative"
				}
			});
			container.appendChild(topPanelScroller);

			topPanel = createEl({
				tag: "div",
				className: "spark-top-panel",
				style: {
					width: "10000px"
				}
			});
			topPanelScroller.appendChild(topPanel);

			if (!options.showTopPanel) {
				topPanelScroller.style.display = "none";
			}

			if (!options.showHeaderRow) {
				headerRowScroller.style.display = "none";
			}

			viewport = createEl({
				tag: "div",
				className: "spark-viewport",
				style: {
					width: "100%",
					overflow: "auto",
					outline: 0,
					position: "relative",
					"overflow-y": options.autoHeight ? "hidden" : "auto"
				}
			});
			container.appendChild(viewport);

			canvas = createEl({
				tag: "div",
				className: "grid-canvas"
			});
			viewport.appendChild(canvas);

			focusSink2 = focusSink.cloneNode(false);
			container.appendChild(focusSink2);

			if (!options.explicitInitialization) {
				finishInitialization();
			}
		}

		function finishInitialization() {
			if (!initialized) {
				initialized = true;

				var style = window.getComputedStyle(container);
				viewportW = parseFloat(style.width);

				// header columns and cells may have different padding/border skewing width calculations (box-sizing, hello?)
				// calculate the diff so we can set consistent sizes
				measureCellPaddingAndBorder();

				if (!options.enableTextSelectionOnCells) {
					// disable text selection in grid cells except in input and textarea elements
					// (this is IE-specific, because selectstart event will only fire in IE)
					viewport.addEventListener("selectstart.ui", function (event) {
						return !! ~"input,textarea".indexOf(event.target.tagName.toLowerCase());
					});
				}

				updateColumnCaches();
				createColumnHeaders();
				setupColumnSort();
				createCssRules();
				resizeCanvas();
				bindAncestorScrollEvents();

				container.addEventListener("resize.sparkgrid", resizeCanvas);
				viewport.addEventListener("scroll", handleScroll);
				viewport.addEventListener("click", handleClick);
				headerScroller.addEventListener("contextmenu", handleHeaderContextMenu);
				headerScroller.addEventListener("click", handleHeaderClick);
				delegate(headerScroller, ".spark-header-column", "mouseover", handleHeaderMouseEnter);
				delegate(headerScroller, ".spark-header-column", "mouseout", handleHeaderMouseLeave);
				headerRowScroller.addEventListener("scroll", handleHeaderRowScroll);

				focusSink.addEventListener("keydown", handleKeyDown);
				focusSink2.addEventListener("keydown", handleKeyDown);

				canvas.addEventListener("keydown", handleKeyDown);
				canvas.addEventListener("click", handleClick);
				canvas.addEventListener("dblclick", handleDblClick);
				canvas.addEventListener("contextmenu", handleContextMenu);
				canvas.addEventListener("draginit", handleDragInit);
				canvas.addEventListener("dragstart", handleDragStart); // {distance: 3}
				canvas.addEventListener("drag", handleDrag);
				canvas.addEventListener("dragend", handleDragEnd);

				delegate(canvas, "spark-cell", "mouseover", handleMouseEnter);
				delegate(canvas, "spark-cell", "mouseout", handleMouseLeave);

				// Work around http://crbug.com/312427.
				if (navigator.userAgent.toLowerCase().match(/webkit/) && navigator.userAgent.toLowerCase().match(/macintosh/)) {
					canvas.addEventListener("mousewheel", handleMouseWheel);
				}
			}
		}

		function registerPlugin(plugin) {
			plugins.unshift(plugin);
			plugin.init(self);
		}

		function unregisterPlugin(plugin) {
			for (var i = plugins.length; i >= 0; i--) {
				if (plugins[i] === plugin) {
					if (plugins[i].destroy) {
						plugins[i].destroy();
					}
					plugins.splice(i, 1);
					break;
				}
			}
		}

		function setSelectionModel(model) {
			if (selectionModel) {
				selectionModel.onSelectedRangesChanged.unsubscribe(handleSelectedRangesChanged);
				if (selectionModel.destroy) {
					selectionModel.destroy();
				}
			}

			selectionModel = model;
			if (selectionModel) {
				selectionModel.init(self);
				selectionModel.onSelectedRangesChanged.subscribe(handleSelectedRangesChanged);
			}
		}

		function getSelectionModel() {
			return selectionModel;
		}

		function getCanvasNode() {
			return canvas;
		}

		function measureScrollbar() {
			var $c = createEl({
				tag: "div",
				style: {
					position: "absolute",
					top: "-10000px",
					left: "-10000px",
					width: "100px",
					height: "100px",
					overflow: "scroll"
				}
			});
			document.body.appendChild($c);
			var dim = {
				width: getCss($c, "height") - $c.clientWidth,
				height: getCss($c, "height") - $c.clientHeight
			};
			$c.parentNode.removeChild($c);
			return dim;
		}

		function getHeadersWidth() {
			var headersWidth = 0;
			for (var i = 0, ii = columns.length; i < ii; i++) {
				headersWidth += columns[i].width;
			}
			headersWidth += scrollbarDimensions.width;
			return Math.max(headersWidth, viewportW || 0) + 1000;
		}

		function getCanvasWidth() {
			var availableWidth = viewportHasVScroll ? viewportW - scrollbarDimensions.width : viewportW;
			var rowWidth = 0;
			var i = columns.length;
			while (i--) {
				rowWidth += columns[i].width;
			}
			return options.fullWidthRows ? Math.max(rowWidth, availableWidth) : rowWidth;
		}

		function updateCanvasWidth(forceColumnWidthsUpdate) {
			var oldCanvasWidth = canvasWidth;
			canvasWidth = getCanvasWidth();

			if (canvasWidth != oldCanvasWidth) {
				setCss(canvas, "width", canvasWidth);
				setCss(headerRow, "width", canvasWidth);
				setCss(headers, "width", getHeadersWidth());
				viewportHasHScroll = canvasWidth > viewportW - scrollbarDimensions.width;
			}

			setCss(headerRowSpacer, "width", canvasWidth + (viewportHasVScroll ? scrollbarDimensions.width : 0));

			if (canvasWidth != oldCanvasWidth || forceColumnWidthsUpdate) {
				applyColumnWidths();
			}
		}

		function getMaxSupportedCssHeight() {
			var supportedHeight = 1000000;
			// FF reports the height back but still renders blank after ~6M px
			var testUpTo = navigator.userAgent.toLowerCase().match(/firefox/) ? 6000000 : 1000000000;
			var div = createEl({
				tag: "div",
				style: {
					display: "none"
				}
			});
			document.body.appendChild(div);

			while (true) {
				var test = supportedHeight * 2;
				setCss(div, "height", test);
				if (test > testUpTo || div.offsetHeight !== test) {
					break;
				} else {
					supportedHeight = test;
				}
			}

			div.parentNode.removeChild(div);
			return supportedHeight;
		}

		// TODO:  this is static.  need to handle page mutation.
		function bindAncestorScrollEvents() {
			var elem = canvas;
			while ((elem = elem.parentNode) != document.body && elem != null) {
				// bind to scroll containers only
				if (elem == viewport || elem.scrollWidth != elem.clientWidth || elem.scrollHeight != elem.clientHeight) {
					if (!boundAncestors) {
						boundAncestors = [];
					}
					boundAncestors.push(elem);
					elem.addEventListener("scroll", handleActiveCellPositionChange);
				}
			}
		}

		function unbindAncestorScrollEvents() {
			if (!boundAncestors) {
				return;
			}
			for (var i = 0, len = boundAncestors.length; i < len; i++) {
				boundAncestors[i].removeEventListener("scroll");
			}

			boundAncestors = null;
		}

		function updateColumnHeader(columnId, title, toolTip) {
			if (!initialized) {
				return;
			}
			var idx = getColumnIndex(columnId);
			if (idx == null) {
				return;
			}

			var columnDef = columns[idx];
			var header = headers.children[idx];
			if (header) {
				if (title !== undefined) {
					columns[idx].name = title;
				}
				if (toolTip !== undefined) {
					columns[idx].toolTip = toolTip;
				}

				trigger(self.onBeforeHeaderCellDestroy, {
					node: header,
					column: columnDef
				});

				header.setAttribute("title", toolTip || "");
				header.children[0].innerHTML = title;

				trigger(self.onHeaderCellRendered, {
					node: header,
					column: columnDef
				});
			}
		}

		function getHeaderRow() {
			return headerRow;
		}

		function getHeaderRowColumn(columnId) {
			var idx = getColumnIndex(columnId);
			return headerRow.children[idx];
		}

		function createColumnHeaders() {
			slice(headers.querySelectorAll(".spark-header-column")).forEach(function (el) {
				var columnDef = columns[+el.dataset.columIndex];
				if (columnDef) {
					trigger(self.onBeforeHeaderCellDestroy, {
						node: el,
						column: columnDef
					});
				}
			});
			headers.innerHTML = "";
			setCss(headers, "width", getHeadersWidth());

			slice(headerRow.querySelectorAll(".spark-headerrow-column")).forEach(function (el) {
				var columnDef = columns[+el.dataset.columnIndex];
				if (columnDef) {
					trigger(self.onBeforeHeaderRowCellDestroy, {
						node: el,
						column: columnDef
					});
				}
			});
			headerRow.innerHTML = "";

			for (var i = 0; i < columns.length; i++) {
				var m = columns[i];

				var header = createEl({
					tag: "div",
					id: "" + uid + m.id,
					title: m.toolTip || "",
					className: "ui-state-default spark-header-column"
				});
				header.innerHTML = "<span class=\"spark-column-name\">" + m.name + "</span>";
				setCss(header, "width", m.width - headerColumnWidthDiff);
				header.dataset.columnIndex = i;
				if (m.headerCssClass) {
					header.classList.add(m.headerCssClass);
				}
				headers.appendChild(header);

				if (m.sortable) {
					header.classList.add("spark-header-sortable");

					var span = createEl({
						tag: "span",
						className: "spark-sort-indicator"
					});
					header.appendChild(span);
				}

				trigger(self.onHeaderCellRendered, {
					node: header,
					column: m
				});

				if (options.showHeaderRow) {
					var headerRowCell = createEl({
						tag: "div",
						className: "ui-state-default spark-headerrow-column l" + i + " r" + i
					});
					headerRowCell.dataset.columnIndex = i;
					headerRow.appendChild(headerRowCell);

					trigger(self.onHeaderRowCellRendered, {
						node: headerRowCell,
						column: m
					});
				}
			}

			setSortColumns(sortColumns);
			setupColumnResize();
			if (options.enableColumnReorder) {
				setupColumnReorder();
			}
		}

		//TODO: Fix column sort for query
		function setupColumnSort() {
			headers.addEventListener("click", function (e) {
				// temporary workaround for a bug in jQuery 1.7.1 (http://bugs.jquery.com/ticket/11328)
				e.metaKey = e.metaKey || e.ctrlKey;

				if (e.target.classList.contains("spark-resizable-handle")) {
					return;
				}

				var col = closest(e.target, "spark-header-column");
				if (!col) {
					return;
				}

				var column = columns[+col.dataset.columnIndex];
				if (column.sortable) {
					if (!getEditorLock().commitCurrentEdit()) {
						return;
					}

					var sortOpts = null;
					var i = 0;
					for (; i < sortColumns.length; i++) {
						if (sortColumns[i].columnId == column.id) {
							sortOpts = sortColumns[i];
							sortOpts.sortAsc = !sortOpts.sortAsc;
							break;
						}
					}

					if (e.metaKey && options.multiColumnSort) {
						if (sortOpts) {
							sortColumns.splice(i, 1);
						}
					} else {
						if (!e.shiftKey && !e.metaKey || !options.multiColumnSort) {
							sortColumns = [];
						}

						if (!sortOpts) {
							sortOpts = { columnId: column.id, sortAsc: column.defaultSortAsc };
							sortColumns.push(sortOpts);
						} else if (sortColumns.length == 0) {
							sortColumns.push(sortOpts);
						}
					}

					setSortColumns(sortColumns);

					if (!options.multiColumnSort) {
						trigger(self.onSort, {
							multiColumnSort: false,
							sortCol: column,
							sortAsc: sortOpts.sortAsc
						}, e);
					} else {
						trigger(self.onSort, {
							multiColumnSort: true,
							sortCols: $.map(sortColumns, function (col) {
								return { sortCol: columns[getColumnIndex(col.columnId)], sortAsc: col.sortAsc };
							})
						}, e);
					}
				}
			});
		}

		function setupColumnReorder() {}

		function setupColumnResize() {
			var j, c, pageX, columnElements, minPageX, maxPageX, firstResizable, lastResizable;
			columnElements = slice(headers.children);
			columnElements.forEach(function (el, i) {
				var handle = el.querySelector(".spark-resizable-handle");
				if (handle) {
					handle.parentNode.removeChild(handle);
				}
				if (columns[i].resizable) {
					if (firstResizable === undefined) {
						firstResizable = i;
					}
					lastResizable = i;
				}
			});
			if (firstResizable === undefined) {
				return;
			}
			columnElements.forEach(function (el, i) {
				if (i < firstResizable || options.forceFitColumns && i >= lastResizable) {
					return;
				}
				var handle = createEl({
					tag: "div",
					className: "spark-resizable-handle"
				});

				handle.addEventListener("mousedown", handleMousedown);

				function handleMousedown(e) {
					var shrinkLeewayOnRight = null,
					    stretchLeewayOnRight = null;

					if (!getEditorLock().commitCurrentEdit()) {
						return false;
					}
					pageX = e.pageX;
					e.preventDefault();
					this.parentNode.classList.add("spark-header-column-active");

					// lock each column's width option to current width
					columnElements.forEach(function (e, i) {
						columns[i].previousWidth = e.offsetWidth;
					});
					if (options.forceFitColumns) {
						shrinkLeewayOnRight = 0;
						stretchLeewayOnRight = 0;
						// columns on right affect maxPageX/minPageX
						for (j = i + 1; j < columnElements.length; j++) {
							c = columns[j];
							if (c.resizable) {
								if (stretchLeewayOnRight !== null) {
									if (c.maxWidth) {
										stretchLeewayOnRight += c.maxWidth - c.previousWidth;
									} else {
										stretchLeewayOnRight = null;
									}
								}
								shrinkLeewayOnRight += c.previousWidth - Math.max(c.minWidth || 0, absoluteColumnMinWidth);
							}
						}
					}
					var shrinkLeewayOnLeft = 0,
					    stretchLeewayOnLeft = 0;
					for (j = 0; j <= i; j++) {
						// columns on left only affect minPageX
						c = columns[j];
						if (c.resizable) {
							if (stretchLeewayOnLeft !== null) {
								if (c.maxWidth) {
									stretchLeewayOnLeft += c.maxWidth - c.previousWidth;
								} else {
									stretchLeewayOnLeft = null;
								}
							}
							shrinkLeewayOnLeft += c.previousWidth - Math.max(c.minWidth || 0, absoluteColumnMinWidth);
						}
					}
					if (shrinkLeewayOnRight === null) {
						shrinkLeewayOnRight = 100000;
					}
					if (shrinkLeewayOnLeft === null) {
						shrinkLeewayOnLeft = 100000;
					}
					if (stretchLeewayOnRight === null) {
						stretchLeewayOnRight = 100000;
					}
					if (stretchLeewayOnLeft === null) {
						stretchLeewayOnLeft = 100000;
					}
					maxPageX = pageX + Math.min(shrinkLeewayOnRight, stretchLeewayOnLeft);
					minPageX = pageX - Math.min(shrinkLeewayOnLeft, stretchLeewayOnRight);

					document.body.addEventListener("mousemove", handleDrag);
					document.body.addEventListener("mouseup", handleMouseUp);
				}

				function handleDrag(e) {
					var actualMinWidth,
					    d = Math.min(maxPageX, Math.max(minPageX, e.pageX)) - pageX,
					    x;
					e.preventDefault();
					if (d < 0) {
						// shrink column
						x = d;
						for (j = i; j >= 0; j--) {
							c = columns[j];
							if (c.resizable) {
								actualMinWidth = Math.max(c.minWidth || 0, absoluteColumnMinWidth);
								if (x && c.previousWidth + x < actualMinWidth) {
									x += c.previousWidth - actualMinWidth;
									c.width = actualMinWidth;
								} else {
									c.width = c.previousWidth + x;
									x = 0;
								}
							}
						}

						if (options.forceFitColumns) {
							x = -d;
							for (j = i + 1; j < columnElements.length; j++) {
								c = columns[j];
								if (c.resizable) {
									if (x && c.maxWidth && c.maxWidth - c.previousWidth < x) {
										x -= c.maxWidth - c.previousWidth;
										c.width = c.maxWidth;
									} else {
										c.width = c.previousWidth + x;
										x = 0;
									}
								}
							}
						}
					} else {
						// stretch column
						x = d;
						for (j = i; j >= 0; j--) {
							c = columns[j];
							if (c.resizable) {
								if (x && c.maxWidth && c.maxWidth - c.previousWidth < x) {
									x -= c.maxWidth - c.previousWidth;
									c.width = c.maxWidth;
								} else {
									c.width = c.previousWidth + x;
									x = 0;
								}
							}
						}

						if (options.forceFitColumns) {
							x = -d;
							for (j = i + 1; j < columnElements.length; j++) {
								c = columns[j];
								if (c.resizable) {
									actualMinWidth = Math.max(c.minWidth || 0, absoluteColumnMinWidth);
									if (x && c.previousWidth + x < actualMinWidth) {
										x += c.previousWidth - actualMinWidth;
										c.width = actualMinWidth;
									} else {
										c.width = c.previousWidth + x;
										x = 0;
									}
								}
							}
						}
					}
					applyColumnHeaderWidths();
					if (options.syncColumnCellResize) {
						applyColumnWidths();
					}
				}

				function handleMouseUp(e) {
					var newWidth;
					document.body.removeEventListener("mouseup", handleMouseUp);
					document.body.removeEventListener("mousemove", handleDrag);
					e.target.parentNode.classList.remove("spark-header-column-active");
					for (j = 0; j < columnElements.length; j++) {
						c = columns[j];
						newWidth = columnElements[j].clientWidth;

						if (c.previousWidth !== newWidth && c.rerenderOnResize) {
							invalidateAllRows();
						}
					}

					updateCanvasWidth(true);
					render();
					trigger(self.onColumnsResized, {});
				}

				el.appendChild(handle);
			});

		}

		function getVBoxDelta($el) {
			var p = ["borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"];
			var delta = 0;
			var i, len;
			i = 0;
			len = p.length;
			for (; i < len; i++) {
				var val = p[i];
				delta += parseFloat($el.style[val]) || 0;
			}
			return delta;
		}

		function measureCellPaddingAndBorder() {
			var el;
			var h = ["borderLeftWidth", "borderRightWidth", "paddingLeft", "paddingRight"];
			var v = ["borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"];
			var i, len, val, compStyle;

			el = createEl({
				tag: "div",
				className: "spark-header-column",
				style: {
					visibility: "hidden"
				}
			});
			headers.appendChild(el);
			headerColumnWidthDiff = headerColumnHeightDiff = 0;
			el.parentNode.removeChild(el);

			var r = createEl({
				tag: "div",
				className: "spark-row"
			});
			canvas.appendChild(r);

			el = createEl({
				tag: "div",
				className: "spark-cell",
				style: {
					visibility: "hidden"
				}
			});
			r.appendChild(el);

			cellWidthDiff = cellHeightDiff = 0;
			if (el.style.boxSizing !== "border-box" && el.style.MozBoxSizing !== "border-box" && el.style.webkitBoxSizing !== "border-box") {
				i = 0;
				len = h.length;
				compStyle = window.getComputedStyle(el);
				for (; i < len; i++) {
					val = h[i];
					cellWidthDiff += parseFloat(compStyle[val]) || 0;
				}
				i = 0;
				len = v.length;
				for (; i < len; i++) {
					val = v[i];
					cellHeightDiff += parseFloat(compStyle[val]) || 0;
				}
			}
			r.parentNode.removeChild(r);

			absoluteColumnMinWidth = Math.max(headerColumnWidthDiff, cellWidthDiff);
		}

		function createCssRules() {
			style = createEl({
				tag: "style",
				rel: "stylesheet"
			});
			document.body.appendChild(style);
			var rowHeight = options.rowHeight - cellHeightDiff;
			var rules = ["." + uid + " .spark-header-column { left: 1000px; }", "." + uid + " .spark-top-panel { height:" + options.topPanelHeight + "px; }", "." + uid + " .spark-headerrow-columns { height:" + options.headerRowHeight + "px; }", "." + uid + " .spark-row { height:" + options.rowHeight + "px; }", "." + uid + " .spark-cell { height:" + options.rowHeight + "px; }"];

			for (var i = 0; i < columns.length; i++) {
				rules.push("." + uid + " .l" + i + " { }");
				rules.push("." + uid + " .r" + i + " { }");
			}

			if (style.styleSheet) {
				// IE
				style.styleSheet.cssText = rules.join(" ");
			} else {
				style.appendChild(document.createTextNode(rules.join(" ")));
			}
		}

		function getColumnCssRules(idx) {
			if (!stylesheet) {
				var sheets = document.styleSheets;
				for (var i = 0; i < sheets.length; i++) {
					if ((sheets[i].ownerNode || sheets[i].owningElement) == style) {
						stylesheet = sheets[i];
						break;
					}
				}

				if (!stylesheet) {
					throw new Error("Cannot find stylesheet.");
				}

				// find and cache column CSS rules
				columnCssRulesL = [];
				columnCssRulesR = [];
				var cssRules = stylesheet.cssRules || stylesheet.rules;
				var matches, columnIdx;
				for (var i = 0; i < cssRules.length; i++) {
					var selector = cssRules[i].selectorText;
					if (matches = /\.l\d+/.exec(selector)) {
						columnIdx = parseInt(matches[0].substr(2, matches[0].length - 2), 10);
						columnCssRulesL[columnIdx] = cssRules[i];
					} else if (matches = /\.r\d+/.exec(selector)) {
						columnIdx = parseInt(matches[0].substr(2, matches[0].length - 2), 10);
						columnCssRulesR[columnIdx] = cssRules[i];
					}
				}
			}

			return {
				left: columnCssRulesL[idx],
				right: columnCssRulesR[idx]
			};
		}

		function removeCssRules() {
			style.remove();
			stylesheet = null;
		}

		function destroy() {
			getEditorLock().cancelCurrentEdit();

			trigger(self.onBeforeDestroy, {});

			var i = plugins.length;
			while (i--) {
				unregisterPlugin(plugins[i]);
			}

			if (options.enableColumnReorder) {
				headers.filter(":ui-sortable").sortable("destroy");
			}

			unbindAncestorScrollEvents();
			container.unbind(".sparkgrid");
			removeCssRules();

			//canvas.unbind("draginit dragstart dragend drag");
			container.empty().removeClass(uid);
		}

		//////////////////////////////////////////////////////////////////////////////////////////////
		// General

		function trigger(evt, args, e) {
			args = args || {};
			args.grid = self;
			return evt.notify(args, e, self);
		}

		function getEditorLock() {
			return options.editorLock;
		}

		function getEditController() {
			return editController;
		}

		function getColumnIndex(id) {
			return columnsById[id];
		}

		function autosizeColumns() {
			var i,
			    c,
			    widths = [],
			    shrinkLeeway = 0,
			    total = 0,
			    prevTotal,
			    availWidth = viewportHasVScroll ? viewportW - scrollbarDimensions.width : viewportW;

			for (i = 0; i < columns.length; i++) {
				c = columns[i];
				widths.push(c.width);
				total += c.width;
				if (c.resizable) {
					shrinkLeeway += c.width - Math.max(c.minWidth, absoluteColumnMinWidth);
				}
			}

			// shrink
			prevTotal = total;
			while (total > availWidth && shrinkLeeway) {
				var shrinkProportion = (total - availWidth) / shrinkLeeway;
				for (i = 0; i < columns.length && total > availWidth; i++) {
					c = columns[i];
					var width = widths[i];
					if (!c.resizable || width <= c.minWidth || width <= absoluteColumnMinWidth) {
						continue;
					}
					var absMinWidth = Math.max(c.minWidth, absoluteColumnMinWidth);
					var shrinkSize = Math.floor(shrinkProportion * (width - absMinWidth)) || 1;
					shrinkSize = Math.min(shrinkSize, width - absMinWidth);
					total -= shrinkSize;
					shrinkLeeway -= shrinkSize;
					widths[i] -= shrinkSize;
				}
				if (prevTotal <= total) {
					// avoid infinite loop
					break;
				}
				prevTotal = total;
			}

			// grow
			prevTotal = total;
			while (total < availWidth) {
				var growProportion = availWidth / total;
				for (i = 0; i < columns.length && total < availWidth; i++) {
					c = columns[i];
					var currentWidth = widths[i];
					var growSize;

					if (!c.resizable || c.maxWidth <= currentWidth) {
						growSize = 0;
					} else {
						growSize = Math.min(Math.floor(growProportion * currentWidth) - currentWidth, c.maxWidth - currentWidth || 1000000) || 1;
					}
					total += growSize;
					widths[i] += growSize;
				}
				if (prevTotal >= total) {
					// avoid infinite loop
					break;
				}
				prevTotal = total;
			}

			var reRender = false;
			for (i = 0; i < columns.length; i++) {
				if (columns[i].rerenderOnResize && columns[i].width != widths[i]) {
					reRender = true;
				}
				columns[i].width = widths[i];
			}

			applyColumnHeaderWidths();
			updateCanvasWidth(true);
			if (reRender) {
				invalidateAllRows();
				render();
			}
		}

		function applyColumnHeaderWidths() {
			if (!initialized) {
				return;
			}
			var h;
			for (var i = 0, hds = headers.children, ii = hds.length; i < ii; i++) {
				h = hds[i];
				if (h.offsetWidth !== columns[i].width - headerColumnWidthDiff) {
					h.style.width = columns[i].width - headerColumnWidthDiff + "px";
				}
			}

			updateColumnCaches();
		}

		function applyColumnWidths() {
			var x = 0,
			    w,
			    rule;
			for (var i = 0; i < columns.length; i++) {
				w = columns[i].width;

				rule = getColumnCssRules(i);
				rule.left.style.left = x + "px";
				rule.right.style.right = canvasWidth - x - w + "px";

				x += columns[i].width;
			}
		}

		function setSortColumn(columnId, ascending) {
			setSortColumns([{ columnId: columnId, sortAsc: ascending }]);
		}

		function setSortColumns(cols) {
			var i, len, j, el, sEl, sortEls, sortInds, indEl;
			sortColumns = cols;

			var headerColumnEls = slice(headers.children);

			i = 0;
			len = headerColumnEls.length;
			for (; i < len; i++) {
				el = headerColumnEls[i];
				el.classList.remove("spark-header-column-sorted");
				sortEls = slice(el.querySelectorAll(".spark-sort-indicator"));

				j = 0;
				len = sortEls.length;
				for (; j < len; j++) {
					sEl = sortEls[j];
					sEl.classList.remove("spark-sort-indicator-asc", "spark-sort-indicator-desc");
				}
			}

			i = 0;
			len = sortColumns.length;
			for (; i < len; i++) {
				var col = sortColumns[i];
				if (col.sortAsc == null) {
					col.sortAsc = true;
				}
				var columnIndex = getColumnIndex(col.columnId);
				if (columnIndex != null) {
					headerColumnEls[columnIndex].classList.add("spark-header-column-sorted");
					sortInds = headerColumnEls[columnIndex].querySelectorAll(".spark-sort-indicator");

					j = 0;
					len = sortInds.length;
					for (; j < len; j++) {
						indEl = sortInds[j];
						indEl.classList.add(col.sortAsc ? "spark-sort-indicator-asc" : "spark-sort-indicator-desc");
					}
				}
			}
		}

		function getSortColumns() {
			return sortColumns;
		}

		function handleSelectedRangesChanged(e, ranges) {
			selectedRows = [];
			var hash = {};
			for (var i = 0; i < ranges.length; i++) {
				for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
					if (!hash[j]) {
						// prevent duplicates
						selectedRows.push(j);
						hash[j] = {};
					}
					for (var k = ranges[i].fromCell; k <= ranges[i].toCell; k++) {
						if (canCellBeSelected(j, k)) {
							hash[j][columns[k].id] = options.selectedCellCssClass;
						}
					}
				}
			}

			setCellCssStyles(options.selectedCellCssClass, hash);

			trigger(self.onSelectedRowsChanged, { rows: getSelectedRows() }, e);
		}

		function getColumns() {
			return columns;
		}

		function updateColumnCaches() {
			// Pre-calculate cell boundaries.
			columnPosLeft = [];
			columnPosRight = [];
			var x = 0;
			for (var i = 0, ii = columns.length; i < ii; i++) {
				columnPosLeft[i] = x;
				columnPosRight[i] = x + columns[i].width;
				x += columns[i].width;
			}
		}

		function setColumns(columnDefinitions) {
			columns = columnDefinitions;

			columnsById = {};
			for (var i = 0; i < columns.length; i++) {
				var m = columns[i] = $.extend({}, columnDefaults, columns[i]);
				columnsById[m.id] = i;
				if (m.minWidth && m.width < m.minWidth) {
					m.width = m.minWidth;
				}
				if (m.maxWidth && m.width > m.maxWidth) {
					m.width = m.maxWidth;
				}
			}

			updateColumnCaches();

			if (initialized) {
				invalidateAllRows();
				createColumnHeaders();
				removeCssRules();
				createCssRules();
				resizeCanvas();
				applyColumnWidths();
				handleScroll();
			}
		}

		function getOptions() {
			return options;
		}

		function setOptions(args) {
			if (!getEditorLock().commitCurrentEdit()) {
				return;
			}

			makeActiveCellNormal();

			if (options.enableAddRow !== args.enableAddRow) {
				invalidateRow(getDataLength());
			}

			options = extend(options, args);
			validateAndEnforceOptions();

			viewport.style.overflowY = options.autoHeight ? "hidden" : "auto";
			render();
		}

		function validateAndEnforceOptions() {
			if (options.autoHeight) {
				options.leaveSpaceForNewRows = false;
			}
		}

		function setData(newData, scrollToTop) {
			data = newData;
			invalidateAllRows();
			updateRowCount();
			if (scrollToTop) {
				scrollTo(0);
			}
		}

		function getData() {
			return data;
		}

		function getDataLength() {
			if (data.getLength) {
				return data.getLength();
			} else {
				return data.length;
			}
		}

		function getDataLengthIncludingAddNew() {
			return getDataLength() + (options.enableAddRow ? 1 : 0);
		}

		function getDataItem(i) {
			if (data.getItem) {
				return data.getItem(i);
			} else {
				return data[i];
			}
		}

		function getTopPanel() {
			return topPanel;
		}

		function setTopPanelVisibility(visible) {
			if (options.showTopPanel != visible) {
				options.showTopPanel = visible;
				if (visible) {
					topPanelScroller.style.display = "";
					resizeCanvas();
				} else {
					topPanelScroller.style.display = "none";
					resizeCanvas();
				}
			}
		}

		function setHeaderRowVisibility(visible) {
			if (options.showHeaderRow != visible) {
				options.showHeaderRow = visible;
				if (visible) {
					topPanelScroller.style.display = "";
					resizeCanvas();
				} else {
					topPanelScroller.style.display = "none";
					resizeCanvas();
				}
			}
		}

		function getContainerNode() {
			return container.get(0);
		}

		//////////////////////////////////////////////////////////////////////////////////////////////
		// Rendering / Scrolling

		function getRowTop(row) {
			return options.rowHeight * row - offset;
		}

		function getRowFromPosition(y) {
			return Math.floor((y + offset) / options.rowHeight);
		}

		function scrollTo(y) {
			y = Math.max(y, 0);
			y = Math.min(y, th - viewportH + (viewportHasHScroll ? scrollbarDimensions.height : 0));

			var oldOffset = offset;

			page = Math.min(n - 1, Math.floor(y / ph));
			offset = Math.round(page * cj);
			var newScrollTop = y - offset;

			if (offset != oldOffset) {
				var range = getVisibleRange(newScrollTop);
				cleanupRows(range);
				updateRowPositions();
			}

			if (prevScrollTop != newScrollTop) {
				vScrollDir = prevScrollTop + oldOffset < newScrollTop + offset ? 1 : -1;
				viewport.scrollTop = lastRenderedScrollTop = scrollTop = prevScrollTop = newScrollTop;

				trigger(self.onViewportChanged, {});
			}
		}

		function defaultFormatter(row, cell, value, columnDef, dataContext) {
			if (value == null) {
				return "";
			} else {
				return (value + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
			}
		}

		function getFormatter(row, column) {
			var rowMetadata = data.getItemMetadata && data.getItemMetadata(row);

			// look up by id, then index
			var columnOverrides = rowMetadata && rowMetadata.columns && (rowMetadata.columns[column.id] || rowMetadata.columns[getColumnIndex(column.id)]);

			return columnOverrides && columnOverrides.formatter || rowMetadata && rowMetadata.formatter || column.formatter || options.formatterFactory && options.formatterFactory.getFormatter(column) || options.defaultFormatter;
		}

		function getEditor(row, cell) {
			var column = columns[cell];
			var rowMetadata = data.getItemMetadata && data.getItemMetadata(row);
			var columnMetadata = rowMetadata && rowMetadata.columns;

			if (columnMetadata && columnMetadata[column.id] && columnMetadata[column.id].editor !== undefined) {
				return columnMetadata[column.id].editor;
			}
			if (columnMetadata && columnMetadata[cell] && columnMetadata[cell].editor !== undefined) {
				return columnMetadata[cell].editor;
			}

			return column.editor || options.editorFactory && options.editorFactory.getEditor(column);
		}

		function getDataItemValueForColumn(item, columnDef) {
			if (options.dataItemColumnValueExtractor) {
				return options.dataItemColumnValueExtractor(item, columnDef);
			}
			return item[columnDef.field];
		}

		function appendRowHtml(stringArray, row, range, dataLength) {
			var d = getDataItem(row);
			var dataLoading = row < dataLength && !d;
			var rowCss = "spark-row" + (dataLoading ? " loading" : "") + (row === activeRow ? " active" : "") + (row % 2 == 1 ? " odd" : " even");

			if (!d) {
				rowCss += " " + options.addNewRowCssClass;
			}

			var metadata = data.getItemMetadata && data.getItemMetadata(row);

			if (metadata && metadata.cssClasses) {
				rowCss += " " + metadata.cssClasses;
			}

			stringArray.push("<div class='" + rowCss + "' style='top:" + getRowTop(row) + "px'>");

			var colspan, m;
			for (var i = 0, ii = columns.length; i < ii; i++) {
				m = columns[i];
				colspan = 1;
				if (metadata && metadata.columns) {
					var columnData = metadata.columns[m.id] || metadata.columns[i];
					colspan = columnData && columnData.colspan || 1;
					if (colspan === "*") {
						colspan = ii - i;
					}
				}

				// Do not render cells outside of the viewport.
				if (columnPosRight[Math.min(ii - 1, i + colspan - 1)] > range.leftPx) {
					if (columnPosLeft[i] > range.rightPx) {
						// All columns to the right are outside the range.
						break;
					}

					appendCellHtml(stringArray, row, i, colspan, d);
				}

				if (colspan > 1) {
					i += colspan - 1;
				}
			}

			stringArray.push("</div>");
		}

		function appendCellHtml(stringArray, row, cell, colspan, item) {
			var m = columns[cell];
			var cellCss = "spark-cell l" + cell + " r" + Math.min(columns.length - 1, cell + colspan - 1) + (m.cssClass ? " " + m.cssClass : "");
			if (row === activeRow && cell === activeCell) {
				cellCss += " active";
			}

			// TODO:  merge them together in the setter
			for (var key in cellCssClasses) {
				if (cellCssClasses[key][row] && cellCssClasses[key][row][m.id]) {
					cellCss += " " + cellCssClasses[key][row][m.id];
				}
			}

			stringArray.push("<div class='" + cellCss + "'>");

			// if there is a corresponding row (if not, this is the Add New row or this data hasn't been loaded yet)
			if (item) {
				var value = getDataItemValueForColumn(item, m);
				stringArray.push(getFormatter(row, m)(row, cell, value, m, item));
			}

			stringArray.push("</div>");

			rowsCache[row].cellRenderQueue.push(cell);
			rowsCache[row].cellColSpans[cell] = colspan;
		}

		function cleanupRows(rangeToKeep) {
			for (var i in rowsCache) {
				if ((i = parseInt(i, 10)) !== activeRow && (i < rangeToKeep.top || i > rangeToKeep.bottom)) {
					removeRowFromCache(i);
				}
			}
		}

		function invalidate() {
			updateRowCount();
			invalidateAllRows();
			render();
		}

		function invalidateAllRows() {
			if (currentEditor) {
				makeActiveCellNormal();
			}
			for (var row in rowsCache) {
				removeRowFromCache(row);
			}
		}

		function removeRowFromCache(row) {
			var cacheEntry = rowsCache[row];
			if (!cacheEntry) {
				return;
			}

			if (rowNodeFromLastMouseWheelEvent == cacheEntry.rowNode) {
				cacheEntry.rowNode.style.display = "none";
				zombieRowNodeFromLastMouseWheelEvent = rowNodeFromLastMouseWheelEvent;
			} else {
				canvas.removeChild(cacheEntry.rowNode);
			}

			delete rowsCache[row];
			delete postProcessedRows[row];
			renderedRows--;
			counter_rows_removed++;
		}

		function invalidateRows(rows) {
			var i, rl;
			if (!rows || !rows.length) {
				return;
			}
			vScrollDir = 0;
			for (i = 0, rl = rows.length; i < rl; i++) {
				if (currentEditor && activeRow === rows[i]) {
					makeActiveCellNormal();
				}
				if (rowsCache[rows[i]]) {
					removeRowFromCache(rows[i]);
				}
			}
		}

		function invalidateRow(row) {
			invalidateRows([row]);
		}

		function updateCell(row, cell) {
			var cellNode = getCellNode(row, cell);
			if (!cellNode) {
				return;
			}

			var m = columns[cell],
			    d = getDataItem(row);
			if (currentEditor && activeRow === row && activeCell === cell) {
				currentEditor.loadValue(d);
			} else {
				cellNode.innerHTML = d ? getFormatter(row, m)(row, cell, getDataItemValueForColumn(d, m), m, d) : "";
				invalidatePostProcessingResults(row);
			}
		}

		function updateRow(row) {
			var cacheEntry = rowsCache[row];
			if (!cacheEntry) {
				return;
			}

			ensureCellNodesInRowsCache(row);

			var d = getDataItem(row);

			for (var columnIdx in cacheEntry.cellNodesByColumnIdx) {
				if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(columnIdx)) {
					continue;
				}

				columnIdx = columnIdx | 0;
				var m = columns[columnIdx],
				    node = cacheEntry.cellNodesByColumnIdx[columnIdx];

				if (row === activeRow && columnIdx === activeCell && currentEditor) {
					currentEditor.loadValue(d);
				} else if (d) {
					node.innerHTML = getFormatter(row, m)(row, columnIdx, getDataItemValueForColumn(d, m), m, d);
				} else {
					node.innerHTML = "";
				}
			}

			invalidatePostProcessingResults(row);
		}

		function getViewportHeight() {
			return container.clientHeight - parseFloat(container.style.paddingTop || 0) - parseFloat(container.style.paddingBottom || 0) - headerScroller.offsetHeight - getVBoxDelta(headerScroller) - (options.showTopPanel ? options.topPanelHeight + getVBoxDelta(topPanelScroller) : 0) - (options.showHeaderRow ? options.headerRowHeight + getVBoxDelta(headerRowScroller) : 0);
		}

		function resizeCanvas() {
			if (!initialized) {
				return;
			}
			if (options.autoHeight) {
				viewportH = options.rowHeight * getDataLengthIncludingAddNew();
			} else {
				viewportH = getViewportHeight();
			}

			numVisibleRows = Math.ceil(viewportH / options.rowHeight);
			viewportW = container.clientWidth;
			if (!options.autoHeight) {
				setCss(viewport, "height", viewportH);
			}

			if (options.forceFitColumns) {
				autosizeColumns();
			}

			updateRowCount();
			handleScroll();
			// Since the width has changed, force the render() to reevaluate virtually rendered cells.
			lastRenderedScrollLeft = -1;
			render();
		}

		function updateRowCount() {
			if (!initialized) {
				return;
			}

			var dataLengthIncludingAddNew = getDataLengthIncludingAddNew();
			var numberOfRows = dataLengthIncludingAddNew + (options.leaveSpaceForNewRows ? numVisibleRows - 1 : 0);

			var oldViewportHasVScroll = viewportHasVScroll;
			// with autoHeight, we do not need to accommodate the vertical scroll bar
			viewportHasVScroll = !options.autoHeight && numberOfRows * options.rowHeight > viewportH;

			makeActiveCellNormal();

			// remove the rows that are now outside of the data range
			// this helps avoid redundant calls to .removeRow() when the size of the data decreased by thousands of rows
			var l = dataLengthIncludingAddNew - 1;
			for (var i in rowsCache) {
				if (i >= l) {
					removeRowFromCache(i);
				}
			}

			if (activeCellNode && activeRow > l) {
				resetActiveCell();
			}

			var oldH = h;
			th = Math.max(options.rowHeight * numberOfRows, viewportH - scrollbarDimensions.height);
			if (th < maxSupportedCssHeight) {
				// just one page
				h = ph = th;
				n = 1;
				cj = 0;
			} else {
				// break into pages
				h = maxSupportedCssHeight;
				ph = h / 100;
				n = Math.floor(th / ph);
				cj = (th - h) / (n - 1);
			}

			if (h !== oldH) {
				setCss(canvas, "height", h);
				scrollTop = viewport.scrollTop;
			}

			var oldScrollTopInRange = scrollTop + offset <= th - viewportH;

			if (th == 0 || scrollTop == 0) {
				page = offset = 0;
			} else if (oldScrollTopInRange) {
				// maintain virtual position
				scrollTo(scrollTop + offset);
			} else {
				// scroll to bottom
				scrollTo(th - viewportH);
			}

			if (h != oldH && options.autoHeight) {
				resizeCanvas();
			}

			if (options.forceFitColumns && oldViewportHasVScroll != viewportHasVScroll) {
				autosizeColumns();
			}
			updateCanvasWidth(false);
		}

		function getVisibleRange(viewportTop, viewportLeft) {
			if (viewportTop == null) {
				viewportTop = scrollTop;
			}
			if (viewportLeft == null) {
				viewportLeft = scrollLeft;
			}

			return {
				top: getRowFromPosition(viewportTop),
				bottom: getRowFromPosition(viewportTop + viewportH) + 1,
				leftPx: viewportLeft,
				rightPx: viewportLeft + viewportW
			};
		}

		function getRenderedRange(viewportTop, viewportLeft) {
			var range = getVisibleRange(viewportTop, viewportLeft);
			var buffer = Math.round(viewportH / options.rowHeight);
			var minBuffer = 3;

			if (vScrollDir == -1) {
				range.top -= buffer;
				range.bottom += minBuffer;
			} else if (vScrollDir == 1) {
				range.top -= minBuffer;
				range.bottom += buffer;
			} else {
				range.top -= minBuffer;
				range.bottom += minBuffer;
			}

			range.top = Math.max(0, range.top);
			range.bottom = Math.min(getDataLengthIncludingAddNew() - 1, range.bottom);

			range.leftPx -= viewportW;
			range.rightPx += viewportW;

			range.leftPx = Math.max(0, range.leftPx);
			range.rightPx = Math.min(canvasWidth, range.rightPx);

			return range;
		}

		function ensureCellNodesInRowsCache(row) {
			var cacheEntry = rowsCache[row];
			if (cacheEntry) {
				if (cacheEntry.cellRenderQueue.length) {
					var lastChild = cacheEntry.rowNode.lastChild;
					while (cacheEntry.cellRenderQueue.length) {
						var columnIdx = cacheEntry.cellRenderQueue.pop();
						cacheEntry.cellNodesByColumnIdx[columnIdx] = lastChild;
						lastChild = lastChild.previousSibling;
					}
				}
			}
		}

		function cleanUpCells(range, row) {
			var totalCellsRemoved = 0;
			var cacheEntry = rowsCache[row];

			// Remove cells outside the range.
			var cellsToRemove = [];
			for (var i in cacheEntry.cellNodesByColumnIdx) {
				// I really hate it when people mess with Array.prototype.
				if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(i)) {
					continue;
				}

				// This is a string, so it needs to be cast back to a number.
				i = i | 0;

				var colspan = cacheEntry.cellColSpans[i];
				if (columnPosLeft[i] > range.rightPx || columnPosRight[Math.min(columns.length - 1, i + colspan - 1)] < range.leftPx) {
					if (!(row == activeRow && i == activeCell)) {
						cellsToRemove.push(i);
					}
				}
			}

			var cellToRemove;
			while ((cellToRemove = cellsToRemove.pop()) != null) {
				cacheEntry.rowNode.removeChild(cacheEntry.cellNodesByColumnIdx[cellToRemove]);
				delete cacheEntry.cellColSpans[cellToRemove];
				delete cacheEntry.cellNodesByColumnIdx[cellToRemove];
				if (postProcessedRows[row]) {
					delete postProcessedRows[row][cellToRemove];
				}
				totalCellsRemoved++;
			}
		}

		function cleanUpAndRenderCells(range) {
			var cacheEntry;
			var stringArray = [];
			var processedRows = [];
			var cellsAdded;
			var totalCellsAdded = 0;
			var colspan;

			for (var row = range.top, btm = range.bottom; row <= btm; row++) {
				cacheEntry = rowsCache[row];
				if (!cacheEntry) {
					continue;
				}

				// cellRenderQueue populated in renderRows() needs to be cleared first
				ensureCellNodesInRowsCache(row);

				cleanUpCells(range, row);

				// Render missing cells.
				cellsAdded = 0;

				var metadata = data.getItemMetadata && data.getItemMetadata(row);
				metadata = metadata && metadata.columns;

				var d = getDataItem(row);

				// TODO:  shorten this loop (index? heuristics? binary search?)
				for (var i = 0, ii = columns.length; i < ii; i++) {
					// Cells to the right are outside the range.
					if (columnPosLeft[i] > range.rightPx) {
						break;
					}

					// Already rendered.
					if ((colspan = cacheEntry.cellColSpans[i]) != null) {
						i += colspan > 1 ? colspan - 1 : 0;
						continue;
					}

					colspan = 1;
					if (metadata) {
						var columnData = metadata[columns[i].id] || metadata[i];
						colspan = columnData && columnData.colspan || 1;
						if (colspan === "*") {
							colspan = ii - i;
						}
					}

					if (columnPosRight[Math.min(ii - 1, i + colspan - 1)] > range.leftPx) {
						appendCellHtml(stringArray, row, i, colspan, d);
						cellsAdded++;
					}

					i += colspan > 1 ? colspan - 1 : 0;
				}

				if (cellsAdded) {
					totalCellsAdded += cellsAdded;
					processedRows.push(row);
				}
			}

			if (!stringArray.length) {
				return;
			}

			var x = document.createElement("div");
			x.innerHTML = stringArray.join("");

			var processedRow;
			var node;
			while ((processedRow = processedRows.pop()) != null) {
				cacheEntry = rowsCache[processedRow];
				var columnIdx;
				while ((columnIdx = cacheEntry.cellRenderQueue.pop()) != null) {
					node = x.lastChild;
					cacheEntry.rowNode.appendChild(node);
					cacheEntry.cellNodesByColumnIdx[columnIdx] = node;
				}
			}
		}

		function renderRows(range) {
			var parentNode = canvas,
			    stringArray = [],
			    rows = [],
			    needToReselectCell = false,
			    dataLength = getDataLength();

			for (var i = range.top, ii = range.bottom; i <= ii; i++) {
				if (rowsCache[i]) {
					continue;
				}
				renderedRows++;
				rows.push(i);

				// Create an entry right away so that appendRowHtml() can
				// start populatating it.
				rowsCache[i] = {
					rowNode: null,

					// ColSpans of rendered cells (by column idx).
					// Can also be used for checking whether a cell has been rendered.
					cellColSpans: [],

					// Cell nodes (by column idx).  Lazy-populated by ensureCellNodesInRowsCache().
					cellNodesByColumnIdx: [],

					// Column indices of cell nodes that have been rendered, but not yet indexed in
					// cellNodesByColumnIdx.  These are in the same order as cell nodes added at the
					// end of the row.
					cellRenderQueue: []
				};

				appendRowHtml(stringArray, i, range, dataLength);
				if (activeCellNode && activeRow === i) {
					needToReselectCell = true;
				}
				counter_rows_rendered++;
			}

			if (!rows.length) {
				return;
			}

			var x = document.createElement("div");
			x.innerHTML = stringArray.join("");

			for (var i = 0, ii = rows.length; i < ii; i++) {
				rowsCache[rows[i]].rowNode = parentNode.appendChild(x.firstChild);
			}

			if (needToReselectCell) {
				activeCellNode = getCellNode(activeRow, activeCell);
			}
		}

		function startPostProcessing() {
			if (!options.enableAsyncPostRender) {
				return;
			}
			clearTimeout(h_postrender);
			h_postrender = setTimeout(asyncPostProcessRows, options.asyncPostRenderDelay);
		}

		function invalidatePostProcessingResults(row) {
			delete postProcessedRows[row];
			postProcessFromRow = Math.min(postProcessFromRow, row);
			postProcessToRow = Math.max(postProcessToRow, row);
			startPostProcessing();
		}

		function updateRowPositions() {
			for (var row in rowsCache) {
				rowsCache[row].rowNode.style.top = getRowTop(row) + "px";
			}
		}

		function render() {
			if (!initialized) {
				return;
			}
			var visible = getVisibleRange();
			var rendered = getRenderedRange();

			// remove rows no longer in the viewport
			cleanupRows(rendered);

			// add new rows & missing cells in existing rows
			if (lastRenderedScrollLeft != scrollLeft) {
				cleanUpAndRenderCells(rendered);
			}

			// render missing rows
			renderRows(rendered);

			postProcessFromRow = visible.top;
			postProcessToRow = Math.min(getDataLengthIncludingAddNew() - 1, visible.bottom);
			startPostProcessing();

			lastRenderedScrollTop = scrollTop;
			lastRenderedScrollLeft = scrollLeft;
			h_render = null;
		}

		function handleHeaderRowScroll() {
			var scrollLeft = headerRowScroller.scrollLeft;
			if (scrollLeft != viewport.scrollLeft) {
				viewport.scrollLeft = scrollLeft;
			}
		}

		function handleScroll() {
			scrollTop = viewport.scrollTop;
			scrollLeft = viewport.scrollLeft;
			var vScrollDist = Math.abs(scrollTop - prevScrollTop);
			var hScrollDist = Math.abs(scrollLeft - prevScrollLeft);

			if (hScrollDist) {
				prevScrollLeft = scrollLeft;
				headerScroller.scrollLeft = scrollLeft;
				topPanelScroller.scrollLeft = scrollLeft;
				headerRowScroller.scrollLeft = scrollLeft;
			}

			if (vScrollDist) {
				vScrollDir = prevScrollTop < scrollTop ? 1 : -1;
				prevScrollTop = scrollTop;

				// switch virtual pages if needed
				if (vScrollDist < viewportH) {
					scrollTo(scrollTop + offset);
				} else {
					var oldOffset = offset;
					if (h == viewportH) {
						page = 0;
					} else {
						page = Math.min(n - 1, Math.floor(scrollTop * ((th - viewportH) / (h - viewportH)) * (1 / ph)));
					}
					offset = Math.round(page * cj);
					if (oldOffset != offset) {
						invalidateAllRows();
					}
				}
			}

			if (hScrollDist || vScrollDist) {
				if (h_render) {
					clearTimeout(h_render);
				}

				if (Math.abs(lastRenderedScrollTop - scrollTop) > 20 || Math.abs(lastRenderedScrollLeft - scrollLeft) > 20) {
					if (options.forceSyncScrolling || Math.abs(lastRenderedScrollTop - scrollTop) < viewportH && Math.abs(lastRenderedScrollLeft - scrollLeft) < viewportW) {
						render();
					} else {
						h_render = setTimeout(render, 10);
					}

					trigger(self.onViewportChanged, {});
				}
			}

			trigger(self.onScroll, { scrollLeft: scrollLeft, scrollTop: scrollTop });
		}

		function asyncPostProcessRows() {
			var dataLength = getDataLength();
			while (postProcessFromRow <= postProcessToRow) {
				var row = vScrollDir >= 0 ? postProcessFromRow++ : postProcessToRow--;
				var cacheEntry = rowsCache[row];
				if (!cacheEntry || row >= dataLength) {
					continue;
				}

				if (!postProcessedRows[row]) {
					postProcessedRows[row] = {};
				}

				ensureCellNodesInRowsCache(row);
				for (var columnIdx in cacheEntry.cellNodesByColumnIdx) {
					if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(columnIdx)) {
						continue;
					}

					columnIdx = columnIdx | 0;

					var m = columns[columnIdx];
					if (m.asyncPostRender && !postProcessedRows[row][columnIdx]) {
						var node = cacheEntry.cellNodesByColumnIdx[columnIdx];
						if (node) {
							m.asyncPostRender(node, row, getDataItem(row), m);
						}
						postProcessedRows[row][columnIdx] = true;
					}
				}

				h_postrender = setTimeout(asyncPostProcessRows, options.asyncPostRenderDelay);
				return;
			}
		}

		function updateCellCssStylesOnRenderedRows(addedHash, removedHash) {
			var node, columnId, addedRowHash, removedRowHash;
			for (var row in rowsCache) {
				removedRowHash = removedHash && removedHash[row];
				addedRowHash = addedHash && addedHash[row];

				if (removedRowHash) {
					for (columnId in removedRowHash) {
						if (!addedRowHash || removedRowHash[columnId] != addedRowHash[columnId]) {
							node = getCellNode(row, getColumnIndex(columnId));
							if (node) {
								node.classList.remove(removedRowHash[columnId]);
							}
						}
					}
				}

				if (addedRowHash) {
					for (columnId in addedRowHash) {
						if (!removedRowHash || removedRowHash[columnId] != addedRowHash[columnId]) {
							node = getCellNode(row, getColumnIndex(columnId));
							if (node) {
								node.classList.add(addedRowHash[columnId]);
							}
						}
					}
				}
			}
		}

		function addCellCssStyles(key, hash) {
			if (cellCssClasses[key]) {
				throw "addCellCssStyles: cell CSS hash with key '" + key + "' already exists.";
			}

			cellCssClasses[key] = hash;
			updateCellCssStylesOnRenderedRows(hash, null);

			trigger(self.onCellCssStylesChanged, { key: key, hash: hash });
		}

		function removeCellCssStyles(key) {
			if (!cellCssClasses[key]) {
				return;
			}

			updateCellCssStylesOnRenderedRows(null, cellCssClasses[key]);
			delete cellCssClasses[key];

			trigger(self.onCellCssStylesChanged, { key: key, hash: null });
		}

		function setCellCssStyles(key, hash) {
			var prevHash = cellCssClasses[key];

			cellCssClasses[key] = hash;
			updateCellCssStylesOnRenderedRows(hash, prevHash);

			trigger(self.onCellCssStylesChanged, { key: key, hash: hash });
		}

		function getCellCssStyles(key) {
			return cellCssClasses[key];
		}

		function flashCell(row, cell, speed) {
			speed = speed || 100;

			if (rowsCache[row]) {
				toggleCellClass(4, getCellNode(row, cell));
			}
			function toggleCellClass(times, cellLocal) {
				if (!times) {
					return;
				}
				setTimeout(function () {
					toggleClass(cellLocal, options.cellFlashingCssClass);
					toggleCellClass(times - 1, cellLocal);
				}, speed);
			}
		}

		//////////////////////////////////////////////////////////////////////////////////////////////
		// Interactivity

		function handleMouseWheel(e) {
			var rowNode = closest(e.target, "spark-row");
			if (rowNode != rowNodeFromLastMouseWheelEvent) {
				if (zombieRowNodeFromLastMouseWheelEvent && zombieRowNodeFromLastMouseWheelEvent != rowNode) {
					canvas.removeChild(zombieRowNodeFromLastMouseWheelEvent);
					zombieRowNodeFromLastMouseWheelEvent = null;
				}
				rowNodeFromLastMouseWheelEvent = rowNode;
			}
		}

		function handleDragInit(e, dd) {
			var cell = getCellFromEvent(e);
			if (!cell || !cellExists(cell.row, cell.cell)) {
				return false;
			}

			var retval = trigger(self.onDragInit, dd, e);
			if (e.isImmediatePropagationStopped()) {
				return retval;
			}

			// if nobody claims to be handling drag'n'drop by stopping immediate propagation,
			// cancel out of it
			return false;
		}

		function handleDragStart(e, dd) {
			var cell = getCellFromEvent(e);
			if (!cell || !cellExists(cell.row, cell.cell)) {
				return false;
			}

			var retval = trigger(self.onDragStart, dd, e);
			if (e.isImmediatePropagationStopped()) {
				return retval;
			}

			return false;
		}

		function handleDrag(e, dd) {
			return trigger(self.onDrag, dd, e);
		}

		function handleDragEnd(e, dd) {
			trigger(self.onDragEnd, dd, e);
		}

		function handleKeyDown(e) {
			trigger(self.onKeyDown, { row: activeRow, cell: activeCell }, e);
			var handled = false /*e.isImmediatePropagationStopped()*/;

			if (!handled) {
				if (!e.shiftKey && !e.altKey && !e.ctrlKey) {
					if (e.which == 27) {
						if (!getEditorLock().isActive()) {
							return; // no editing mode to cancel, allow bubbling and default processing (exit without cancelling the event)
						}
						cancelEditAndSetFocus();
					} else if (e.which == 34) {
						navigatePageDown();
						handled = true;
					} else if (e.which == 33) {
						navigatePageUp();
						handled = true;
					} else if (e.which == 37) {
						handled = navigateLeft();
					} else if (e.which == 39) {
						handled = navigateRight();
					} else if (e.which == 38) {
						handled = navigateUp();
					} else if (e.which == 40) {
						handled = navigateDown();
					} else if (e.which == 9) {
						handled = navigateNext();
					} else if (e.which == 13) {
						if (options.editable) {
							if (currentEditor) {
								// adding new row
								if (activeRow === getDataLength()) {
									navigateDown();
								} else {
									commitEditAndSetFocus();
								}
							} else {
								if (getEditorLock().commitCurrentEdit()) {
									makeActiveCellEditable();
								}
							}
						}
						handled = true;
					}
				} else if (e.which == 9 && e.shiftKey && !e.ctrlKey && !e.altKey) {
					handled = navigatePrev();
				}
			}

			if (handled) {
				// the event has been handled so don't let parent element (bubbling/propagation) or browser (default) handle it
				e.stopPropagation();
				e.preventDefault();
				try {
					e.keyCode = 0; // prevent default behaviour for special keys in IE browsers (F3, F5, etc.)
				}
				// ignore exceptions - setting the original event's keycode throws access denied exception for "Ctrl"
				// (hitting control key only, nothing else), "Shift" (maybe others)
				catch (error) {}
			}
		}

		function handleClick(e) {
			if (!currentEditor) {
				// if this click resulted in some cell child node getting focus,
				// don't steal it back - keyboard events will still bubble up
				// IE9+ seems to default DIVs to tabIndex=0 instead of -1, so check for cell clicks directly.
				if (e.target != document.activeElement || e.target.classList.contains("spark-cell")) {
					setFocus();
				}
			}

			var cell = getCellFromEvent(e);
			if (!cell || currentEditor !== null && activeRow == cell.row && activeCell == cell.cell) {
				return;
			}

			var eventControl = trigger(self.onClick, { row: cell.row, cell: cell.cell }, e);

			if (eventControl.isStopped()) {
				return;
			}

			if ((activeCell != cell.cell || activeRow != cell.row) && canCellBeActive(cell.row, cell.cell)) {
				if (!getEditorLock().isActive() || getEditorLock().commitCurrentEdit()) {
					scrollRowIntoView(cell.row, false);
					setActiveCellInternal(getCellNode(cell.row, cell.cell));
				}
			}
		}

		function handleContextMenu(e) {
			var cell = closest(e.target, "spark-cell");
			if (!cell) {
				return;
			}

			// are we editing this cell?
			if (activeCellNode === cell && currentEditor !== null) {
				return;
			}

			trigger(self.onContextMenu, {}, e);
		}

		function handleDblClick(e) {
			var cell = getCellFromEvent(e);
			if (!cell || currentEditor !== null && activeRow == cell.row && activeCell == cell.cell) {
				return;
			}

			trigger(self.onDblClick, { row: cell.row, cell: cell.cell }, e);

			if (options.editable) {
				gotoCell(cell.row, cell.cell, true);
			}
		}

		function handleHeaderMouseEnter(e) {
			trigger(self.onHeaderMouseEnter, {
				column: this.dataset.column
			}, e);
		}

		function handleHeaderMouseLeave(e) {
			trigger(self.onHeaderMouseLeave, {
				column: this.dataset.column
			}, e);
		}

		function handleHeaderContextMenu(e) {
			var header = closest(e.target, "spark-header-column");
			var column = header && columns[+header.dataset.columnIndex];
			trigger(self.onHeaderContextMenu, { column: column }, e);
		}

		function handleHeaderClick(e) {
			var header = closest(e.target, "spark-header-column");
			var column = header && columns[+header.dataset.columnIndex];
			if (column) {
				trigger(self.onHeaderClick, { column: column }, e);
			}
		}

		function handleMouseEnter(e) {
			trigger(self.onMouseEnter, {}, e);
		}

		function handleMouseLeave(e) {
			trigger(self.onMouseLeave, {}, e);
		}

		function cellExists(row, cell) {
			return !(row < 0 || row >= getDataLength() || cell < 0 || cell >= columns.length);
		}

		function getCellFromPoint(x, y) {
			var row = getRowFromPosition(y);
			var cell = 0;

			var w = 0;
			for (var i = 0; i < columns.length && w < x; i++) {
				w += columns[i].width;
				cell++;
			}

			if (cell < 0) {
				cell = 0;
			}

			return { row: row, cell: cell - 1 };
		}

		function getCellFromNode(cellNode) {
			// read column number from .l<columnNumber> CSS class
			var cls = /l\d+/.exec(cellNode.className);
			if (!cls) {
				throw "getCellFromNode: cannot get cell - " + cellNode.className;
			}
			return parseInt(cls[0].substr(1, cls[0].length - 1), 10);
		}

		function getRowFromNode(rowNode) {
			for (var row in rowsCache) {
				if (rowsCache[row].rowNode === rowNode) {
					return row | 0;
				}
			}

			return null;
		}

		function getCellFromEvent(e) {
			var cell = closest(e.target, "spark-cell");
			if (!cell) {
				return null;
			}

			var row = getRowFromNode(cell.parentNode);
			cell = getCellFromNode(cell);

			if (row == null || cell == null) {
				return null;
			} else {
				return {
					row: row,
					cell: cell
				};
			}
		}

		function getCellNodeBox(row, cell) {
			if (!cellExists(row, cell)) {
				return null;
			}

			var y1 = getRowTop(row);
			var y2 = y1 + options.rowHeight - 1;
			var x1 = 0;
			for (var i = 0; i < cell; i++) {
				x1 += columns[i].width;
			}
			var x2 = x1 + columns[cell].width;

			return {
				top: y1,
				left: x1,
				bottom: y2,
				right: x2
			};
		}

		//////////////////////////////////////////////////////////////////////////////////////////////
		// Cell switching

		function resetActiveCell() {
			setActiveCellInternal(null, false);
		}

		function setFocus() {
			if (tabbingDirection == -1) {
				focusSink.focus();
			} else {
				focusSink2.focus();
			}
		}

		function scrollCellIntoView(row, cell, doPaging) {
			scrollRowIntoView(row, doPaging);

			var colspan = getColspan(row, cell);
			var left = columnPosLeft[cell],
			    right = columnPosRight[cell + (colspan > 1 ? colspan - 1 : 0)],
			    scrollRight = scrollLeft + viewportW;

			if (left < scrollLeft) {
				viewport.scrollLeft = left;
				handleScroll();
				render();
			} else if (right > scrollRight) {
				viewport.scrollLeft = Math.min(left, right - viewport.clientWidth);
				handleScroll();
				render();
			}
		}

		function setActiveCellInternal(newCell, opt_editMode) {
			if (activeCellNode !== null) {
				makeActiveCellNormal();
				activeCellNode.classList.remove("active");
				if (rowsCache[activeRow]) {
					rowsCache[activeRow].rowNode.classList.remove("active");
				}
			}

			var activeCellChanged = activeCellNode !== newCell;
			activeCellNode = newCell;

			if (activeCellNode != null) {
				activeRow = getRowFromNode(activeCellNode.parentNode);
				activeCell = activePosX = getCellFromNode(activeCellNode);

				if (opt_editMode == null) {
					opt_editMode = activeRow == getDataLength() || options.autoEdit;
				}

				activeCellNode.classList.add("active");
				rowsCache[activeRow].rowNode.classList.add("active");

				if (options.editable && opt_editMode && isCellPotentiallyEditable(activeRow, activeCell)) {
					clearTimeout(h_editorLoader);

					if (options.asyncEditorLoading) {
						h_editorLoader = setTimeout(function () {
							makeActiveCellEditable();
						}, options.asyncEditorLoadDelay);
					} else {
						makeActiveCellEditable();
					}
				}
			} else {
				activeRow = activeCell = null;
			}

			if (activeCellChanged) {
				trigger(self.onActiveCellChanged, getActiveCell());
			}
		}

		function clearTextSelection() {
			if (document.selection && document.selection.empty) {
				try {
					//IE fails here if selected element is not in dom
					document.selection.empty();
				} catch (e) {}
			} else if (window.getSelection) {
				var sel = window.getSelection();
				if (sel && sel.removeAllRanges) {
					sel.removeAllRanges();
				}
			}
		}

		function isCellPotentiallyEditable(row, cell) {
			var dataLength = getDataLength();
			// is the data for this row loaded?
			if (row < dataLength && !getDataItem(row)) {
				return false;
			}

			// are we in the Add New row?  can we create new from this cell?
			if (columns[cell].cannotTriggerInsert && row >= dataLength) {
				return false;
			}

			// does this cell have an editor?
			if (!getEditor(row, cell)) {
				return false;
			}

			return true;
		}

		function makeActiveCellNormal() {
			if (!currentEditor) {
				return;
			}
			trigger(self.onBeforeCellEditorDestroy, { editor: currentEditor });
			currentEditor.destroy();
			currentEditor = null;

			if (activeCellNode) {
				var d = getDataItem(activeRow);
				activeCellNode.classList.remove("editable", "invalid");
				if (d) {
					var column = columns[activeCell];
					var formatter = getFormatter(activeRow, column);
					activeCellNode.innerHTML = formatter(activeRow, activeCell, getDataItemValueForColumn(d, column), column, d);
					invalidatePostProcessingResults(activeRow);
				}
			}

			// if there previously was text selected on a page (such as selected text in the edit cell just removed),
			// IE can't set focus to anything else correctly
			if (navigator.userAgent.toLowerCase().match(/msie/)) {
				clearTextSelection();
			}

			getEditorLock().deactivate(editController);
		}

		function makeActiveCellEditable(editor) {
			if (!activeCellNode) {
				return;
			}
			if (!options.editable) {
				throw "Grid : makeActiveCellEditable : should never get called when options.editable is false";
			}

			// cancel pending async call if there is one
			clearTimeout(h_editorLoader);

			if (!isCellPotentiallyEditable(activeRow, activeCell)) {
				return;
			}

			var columnDef = columns[activeCell];
			var item = getDataItem(activeRow);

			if (trigger(self.onBeforeEditCell, { row: activeRow, cell: activeCell, item: item, column: columnDef }) === false) {
				setFocus();
				return;
			}

			getEditorLock().activate(editController);
			activeCellNode.classList.add("editable");

			// don't clear the cell if a custom editor is passed through
			if (!editor) {
				activeCellNode.innerHTML = "";
			}

			currentEditor = new (editor || getEditor(activeRow, activeCell))({
				grid: self,
				gridPosition: absBox(container),
				position: absBox(activeCellNode),
				container: activeCellNode,
				column: columnDef,
				item: item || {},
				commitChanges: commitEditAndSetFocus,
				cancelChanges: cancelEditAndSetFocus
			});

			if (item) {
				currentEditor.loadValue(item);
			}

			serializedEditorValue = currentEditor.serializeValue();

			if (currentEditor.position) {
				handleActiveCellPositionChange();
			}
		}

		function commitEditAndSetFocus() {
			// if the commit fails, it would do so due to a validation error
			// if so, do not steal the focus from the editor
			if (getEditorLock().commitCurrentEdit()) {
				setFocus();
				if (options.autoEdit) {
					navigateDown();
				}
			}
		}

		function cancelEditAndSetFocus() {
			if (getEditorLock().cancelCurrentEdit()) {
				setFocus();
			}
		}

		function absBox(elem) {
			var box = {
				top: elem.offsetTop,
				left: elem.offsetLeft,
				bottom: 0,
				right: 0,
				width: elem.offsetWidth,
				height: elem.offsetHeight,
				visible: true
			};
			box.bottom = box.top + box.height;
			box.right = box.left + box.width;

			// walk up the tree
			var offsetParent = elem.offsetParent;
			while ((elem = elem.parentNode) != document.body) {
				if (box.visible && elem.scrollHeight != elem.offsetHeight && elem.style.overflowY != "visible") {
					box.visible = box.bottom > elem.scrollTop && box.top < elem.scrollTop + elem.clientHeight;
				}

				if (box.visible && elem.scrollWidth != elem.offsetWidth && elem.style.overflowX != "visible") {
					box.visible = box.right > elem.scrollLeft && box.left < elem.scrollLeft + elem.clientWidth;
				}

				box.left -= elem.scrollLeft;
				box.top -= elem.scrollTop;

				if (elem === offsetParent) {
					box.left += elem.offsetLeft;
					box.top += elem.offsetTop;
					offsetParent = elem.offsetParent;
				}

				box.bottom = box.top + box.height;
				box.right = box.left + box.width;
			}

			return box;
		}

		function getActiveCellPosition() {
			return absBox(activeCellNode);
		}

		function getGridPosition() {
			return absBox(container);
		}

		function handleActiveCellPositionChange() {
			if (!activeCellNode) {
				return;
			}

			trigger(self.onActiveCellPositionChanged, {});

			if (currentEditor) {
				var cellBox = getActiveCellPosition();
				if (currentEditor.show && currentEditor.hide) {
					if (!cellBox.visible) {
						currentEditor.hide();
					} else {
						currentEditor.show();
					}
				}

				if (currentEditor.position) {
					currentEditor.position(cellBox);
				}
			}
		}

		function getCellEditor() {
			return currentEditor;
		}

		function getActiveCell() {
			if (!activeCellNode) {
				return null;
			} else {
				return { row: activeRow, cell: activeCell };
			}
		}

		function getActiveCellNode() {
			return activeCellNode;
		}

		function scrollRowIntoView(row, doPaging) {
			var rowAtTop = row * options.rowHeight;
			var rowAtBottom = (row + 1) * options.rowHeight - viewportH + (viewportHasHScroll ? scrollbarDimensions.height : 0);

			// need to page down?
			if ((row + 1) * options.rowHeight > scrollTop + viewportH + offset) {
				scrollTo(doPaging ? rowAtTop : rowAtBottom);
				render();
			}
			// or page up?
			else if (row * options.rowHeight < scrollTop + offset) {
				scrollTo(doPaging ? rowAtBottom : rowAtTop);
				render();
			}
		}

		function scrollRowToTop(row) {
			scrollTo(row * options.rowHeight);
			render();
		}

		function scrollPage(dir) {
			var deltaRows = dir * numVisibleRows;
			scrollTo((getRowFromPosition(scrollTop) + deltaRows) * options.rowHeight);
			render();

			if (options.enableCellNavigation && activeRow != null) {
				var row = activeRow + deltaRows;
				var dataLengthIncludingAddNew = getDataLengthIncludingAddNew();
				if (row >= dataLengthIncludingAddNew) {
					row = dataLengthIncludingAddNew - 1;
				}
				if (row < 0) {
					row = 0;
				}

				var cell = 0,
				    prevCell = null;
				var prevActivePosX = activePosX;
				while (cell <= activePosX) {
					if (canCellBeActive(row, cell)) {
						prevCell = cell;
					}
					cell += getColspan(row, cell);
				}

				if (prevCell !== null) {
					setActiveCellInternal(getCellNode(row, prevCell));
					activePosX = prevActivePosX;
				} else {
					resetActiveCell();
				}
			}
		}

		function navigatePageDown() {
			scrollPage(1);
		}

		function navigatePageUp() {
			scrollPage(-1);
		}

		function getColspan(row, cell) {
			var metadata = data.getItemMetadata && data.getItemMetadata(row);
			if (!metadata || !metadata.columns) {
				return 1;
			}

			var columnData = metadata.columns[columns[cell].id] || metadata.columns[cell];
			var colspan = columnData && columnData.colspan;
			if (colspan === "*") {
				colspan = columns.length - cell;
			} else {
				colspan = colspan || 1;
			}

			return colspan;
		}

		function findFirstFocusableCell(row) {
			var cell = 0;
			while (cell < columns.length) {
				if (canCellBeActive(row, cell)) {
					return cell;
				}
				cell += getColspan(row, cell);
			}
			return null;
		}

		function findLastFocusableCell(row) {
			var cell = 0;
			var lastFocusableCell = null;
			while (cell < columns.length) {
				if (canCellBeActive(row, cell)) {
					lastFocusableCell = cell;
				}
				cell += getColspan(row, cell);
			}
			return lastFocusableCell;
		}

		function gotoRight(row, cell, posX) {
			if (cell >= columns.length) {
				return null;
			}

			do {
				cell += getColspan(row, cell);
			} while (cell < columns.length && !canCellBeActive(row, cell));

			if (cell < columns.length) {
				return {
					row: row,
					cell: cell,
					posX: cell
				};
			}
			return null;
		}

		function gotoLeft(row, cell, posX) {
			if (cell <= 0) {
				return null;
			}

			var firstFocusableCell = findFirstFocusableCell(row);
			if (firstFocusableCell === null || firstFocusableCell >= cell) {
				return null;
			}

			var prev = {
				row: row,
				cell: firstFocusableCell,
				posX: firstFocusableCell
			};
			var pos;
			while (true) {
				pos = gotoRight(prev.row, prev.cell, prev.posX);
				if (!pos) {
					return null;
				}
				if (pos.cell >= cell) {
					return prev;
				}
				prev = pos;
			}
		}

		function gotoDown(row, cell, posX) {
			var prevCell;
			var dataLengthIncludingAddNew = getDataLengthIncludingAddNew();
			while (true) {
				if (++row >= dataLengthIncludingAddNew) {
					return null;
				}

				prevCell = cell = 0;
				while (cell <= posX) {
					prevCell = cell;
					cell += getColspan(row, cell);
				}

				if (canCellBeActive(row, prevCell)) {
					return {
						row: row,
						cell: prevCell,
						posX: posX
					};
				}
			}
		}

		function gotoUp(row, cell, posX) {
			var prevCell;
			while (true) {
				if (--row < 0) {
					return null;
				}

				prevCell = cell = 0;
				while (cell <= posX) {
					prevCell = cell;
					cell += getColspan(row, cell);
				}

				if (canCellBeActive(row, prevCell)) {
					return {
						row: row,
						cell: prevCell,
						posX: posX
					};
				}
			}
		}

		function gotoNext(row, cell, posX) {
			if (row == null && cell == null) {
				row = cell = posX = 0;
				if (canCellBeActive(row, cell)) {
					return {
						row: row,
						cell: cell,
						posX: cell
					};
				}
			}

			var pos = gotoRight(row, cell, posX);
			if (pos) {
				return pos;
			}

			var firstFocusableCell = null;
			var dataLengthIncludingAddNew = getDataLengthIncludingAddNew();
			while (++row < dataLengthIncludingAddNew) {
				firstFocusableCell = findFirstFocusableCell(row);
				if (firstFocusableCell !== null) {
					return {
						row: row,
						cell: firstFocusableCell,
						posX: firstFocusableCell
					};
				}
			}
			return null;
		}

		function gotoPrev(row, cell, posX) {
			if (row == null && cell == null) {
				row = getDataLengthIncludingAddNew() - 1;
				cell = posX = columns.length - 1;
				if (canCellBeActive(row, cell)) {
					return {
						row: row,
						cell: cell,
						posX: cell
					};
				}
			}

			var pos;
			var lastSelectableCell;
			while (!pos) {
				pos = gotoLeft(row, cell, posX);
				if (pos) {
					break;
				}
				if (--row < 0) {
					return null;
				}

				cell = 0;
				lastSelectableCell = findLastFocusableCell(row);
				if (lastSelectableCell !== null) {
					pos = {
						row: row,
						cell: lastSelectableCell,
						posX: lastSelectableCell
					};
				}
			}
			return pos;
		}

		function navigateRight() {
			return navigate("right");
		}

		function navigateLeft() {
			return navigate("left");
		}

		function navigateDown() {
			return navigate("down");
		}

		function navigateUp() {
			return navigate("up");
		}

		function navigateNext() {
			return navigate("next");
		}

		function navigatePrev() {
			return navigate("prev");
		}

		/**
   * @param {string} dir Navigation direction.
   * @return {boolean} Whether navigation resulted in a change of active cell.
   */
		function navigate(dir) {
			if (!options.enableCellNavigation) {
				return false;
			}

			if (!activeCellNode && dir != "prev" && dir != "next") {
				return false;
			}

			if (!getEditorLock().commitCurrentEdit()) {
				return true;
			}

			setFocus();

			var tabbingDirections = {
				up: -1,
				down: 1,
				left: -1,
				right: 1,
				prev: -1,
				next: 1
			};
			tabbingDirection = tabbingDirections[dir];

			var stepFunctions = {
				up: gotoUp,
				down: gotoDown,
				left: gotoLeft,
				right: gotoRight,
				prev: gotoPrev,
				next: gotoNext
			};
			var stepFn = stepFunctions[dir];
			var pos = stepFn(activeRow, activeCell, activePosX);
			if (pos) {
				var isAddNewRow = pos.row == getDataLength();
				scrollCellIntoView(pos.row, pos.cell, !isAddNewRow);
				setActiveCellInternal(getCellNode(pos.row, pos.cell));
				activePosX = pos.posX;
				return true;
			} else {
				setActiveCellInternal(getCellNode(activeRow, activeCell));
				return false;
			}
		}

		function getCellNode(row, cell) {
			if (rowsCache[row]) {
				ensureCellNodesInRowsCache(row);
				return rowsCache[row].cellNodesByColumnIdx[cell];
			}
			return null;
		}

		function setActiveCell(row, cell) {
			if (!initialized) {
				return;
			}
			if (row > getDataLength() || row < 0 || cell >= columns.length || cell < 0) {
				return;
			}

			if (!options.enableCellNavigation) {
				return;
			}

			scrollCellIntoView(row, cell, false);
			setActiveCellInternal(getCellNode(row, cell), false);
		}

		function canCellBeActive(row, cell) {
			if (!options.enableCellNavigation || row >= getDataLengthIncludingAddNew() || row < 0 || cell >= columns.length || cell < 0) {
				return false;
			}

			var rowMetadata = data.getItemMetadata && data.getItemMetadata(row);
			if (rowMetadata && typeof rowMetadata.focusable === "boolean") {
				return rowMetadata.focusable;
			}

			var columnMetadata = rowMetadata && rowMetadata.columns;
			if (columnMetadata && columnMetadata[columns[cell].id] && typeof columnMetadata[columns[cell].id].focusable === "boolean") {
				return columnMetadata[columns[cell].id].focusable;
			}
			if (columnMetadata && columnMetadata[cell] && typeof columnMetadata[cell].focusable === "boolean") {
				return columnMetadata[cell].focusable;
			}

			return columns[cell].focusable;
		}

		function canCellBeSelected(row, cell) {
			if (row >= getDataLength() || row < 0 || cell >= columns.length || cell < 0) {
				return false;
			}

			var rowMetadata = data.getItemMetadata && data.getItemMetadata(row);
			if (rowMetadata && typeof rowMetadata.selectable === "boolean") {
				return rowMetadata.selectable;
			}

			var columnMetadata = rowMetadata && rowMetadata.columns && (rowMetadata.columns[columns[cell].id] || rowMetadata.columns[cell]);
			if (columnMetadata && typeof columnMetadata.selectable === "boolean") {
				return columnMetadata.selectable;
			}

			return columns[cell].selectable;
		}

		function gotoCell(row, cell, forceEdit) {
			if (!initialized) {
				return;
			}
			if (!canCellBeActive(row, cell)) {
				return;
			}

			if (!getEditorLock().commitCurrentEdit()) {
				return;
			}

			scrollCellIntoView(row, cell, false);

			var newCell = getCellNode(row, cell);

			// if selecting the 'add new' row, start editing right away
			setActiveCellInternal(newCell, forceEdit || row === getDataLength() || options.autoEdit);

			// if no editor was created, set the focus back on the grid
			if (!currentEditor) {
				setFocus();
			}
		}

		//////////////////////////////////////////////////////////////////////////////////////////////
		// IEditor implementation for the editor lock

		function commitCurrentEdit() {
			var item = getDataItem(activeRow);
			var column = columns[activeCell];

			if (currentEditor) {
				if (currentEditor.isValueChanged()) {
					var validationResults = currentEditor.validate();

					if (validationResults.valid) {
						if (activeRow < getDataLength()) {
							var editCommand = {
								row: activeRow,
								cell: activeCell,
								editor: currentEditor,
								serializedValue: currentEditor.serializeValue(),
								prevSerializedValue: serializedEditorValue,
								execute: function () {
									this.editor.applyValue(item, this.serializedValue);
									updateRow(this.row);
									trigger(self.onCellChange, {
										row: activeRow,
										cell: activeCell,
										item: item
									});
								},
								undo: function () {
									this.editor.applyValue(item, this.prevSerializedValue);
									updateRow(this.row);
									trigger(self.onCellChange, {
										row: activeRow,
										cell: activeCell,
										item: item
									});
								}
							};

							if (options.editCommandHandler) {
								makeActiveCellNormal();
								options.editCommandHandler(item, column, editCommand);
							} else {
								editCommand.execute();
								makeActiveCellNormal();
							}
						} else {
							var newItem = {};
							currentEditor.applyValue(newItem, currentEditor.serializeValue());
							makeActiveCellNormal();
							trigger(self.onAddNewRow, { item: newItem, column: column });
						}

						// check whether the lock has been re-acquired by event handlers
						return !getEditorLock().isActive();
					} else {
						// Re-add the CSS class to trigger transitions, if any.
						activeCellNode.classList.remove("invalid");
						activeCellNode.clientWidth; // force layout
						activeCellNode.classList.add("invalid");

						trigger(self.onValidationError, {
							editor: currentEditor,
							cellNode: activeCellNode,
							validationResults: validationResults,
							row: activeRow,
							cell: activeCell,
							column: column
						});

						currentEditor.focus();
						return false;
					}
				}

				makeActiveCellNormal();
			}
			return true;
		}

		function cancelCurrentEdit() {
			makeActiveCellNormal();
			return true;
		}

		function rowsToRanges(rows) {
			var ranges = [];
			var lastCell = columns.length - 1;
			for (var i = 0; i < rows.length; i++) {
				ranges.push(new Range(rows[i], 0, rows[i], lastCell));
			}
			return ranges;
		}

		function getSelectedRows() {
			if (!selectionModel) {
				throw "Selection model is not set";
			}
			return selectedRows;
		}

		function setSelectedRows(rows) {
			if (!selectionModel) {
				throw "Selection model is not set";
			}
			selectionModel.setSelectedRanges(rowsToRanges(rows));
		}

		// Public API
		var obj = extend(this, {
			sparkGridVersion: "2.1",

			// Events
			onScroll: new Event(),
			onSort: new Event(),
			onHeaderMouseEnter: new Event(),
			onHeaderMouseLeave: new Event(),
			onHeaderContextMenu: new Event(),
			onHeaderClick: new Event(),
			onHeaderCellRendered: new Event(),
			onBeforeHeaderCellDestroy: new Event(),
			onHeaderRowCellRendered: new Event(),
			onBeforeHeaderRowCellDestroy: new Event(),
			onMouseEnter: new Event(),
			onMouseLeave: new Event(),
			onClick: new Event(),
			onDblClick: new Event(),
			onContextMenu: new Event(),
			onKeyDown: new Event(),
			onAddNewRow: new Event(),
			onValidationError: new Event(),
			onViewportChanged: new Event(),
			onColumnsReordered: new Event(),
			onColumnsResized: new Event(),
			onCellChange: new Event(),
			onBeforeEditCell: new Event(),
			onBeforeCellEditorDestroy: new Event(),
			onBeforeDestroy: new Event(),
			onActiveCellChanged: new Event(),
			onActiveCellPositionChanged: new Event(),
			onDragInit: new Event(),
			onDragStart: new Event(),
			onDrag: new Event(),
			onDragEnd: new Event(),
			onSelectedRowsChanged: new Event(),
			onCellCssStylesChanged: new Event(),

			// Methods
			registerPlugin: registerPlugin,
			unregisterPlugin: unregisterPlugin,
			getColumns: getColumns,
			setColumns: setColumns,
			getColumnIndex: getColumnIndex,
			updateColumnHeader: updateColumnHeader,
			setSortColumn: setSortColumn,
			setSortColumns: setSortColumns,
			getSortColumns: getSortColumns,
			autosizeColumns: autosizeColumns,
			getOptions: getOptions,
			setOptions: setOptions,
			getData: getData,
			getDataLength: getDataLength,
			getDataItem: getDataItem,
			setData: setData,
			getSelectionModel: getSelectionModel,
			setSelectionModel: setSelectionModel,
			getSelectedRows: getSelectedRows,
			setSelectedRows: setSelectedRows,
			getContainerNode: getContainerNode,

			render: render,
			invalidate: invalidate,
			invalidateRow: invalidateRow,
			invalidateRows: invalidateRows,
			invalidateAllRows: invalidateAllRows,
			updateCell: updateCell,
			updateRow: updateRow,
			getViewport: getVisibleRange,
			getRenderedRange: getRenderedRange,
			resizeCanvas: resizeCanvas,
			updateRowCount: updateRowCount,
			scrollRowIntoView: scrollRowIntoView,
			scrollRowToTop: scrollRowToTop,
			scrollCellIntoView: scrollCellIntoView,
			getCanvasNode: getCanvasNode,
			focus: setFocus,

			getCellFromPoint: getCellFromPoint,
			getCellFromEvent: getCellFromEvent,
			getActiveCell: getActiveCell,
			setActiveCell: setActiveCell,
			getActiveCellNode: getActiveCellNode,
			getActiveCellPosition: getActiveCellPosition,
			resetActiveCell: resetActiveCell,
			editActiveCell: makeActiveCellEditable,
			getCellEditor: getCellEditor,
			getCellNode: getCellNode,
			getCellNodeBox: getCellNodeBox,
			canCellBeSelected: canCellBeSelected,
			canCellBeActive: canCellBeActive,
			navigatePrev: navigatePrev,
			navigateNext: navigateNext,
			navigateUp: navigateUp,
			navigateDown: navigateDown,
			navigateLeft: navigateLeft,
			navigateRight: navigateRight,
			navigatePageUp: navigatePageUp,
			navigatePageDown: navigatePageDown,
			gotoCell: gotoCell,
			getTopPanel: getTopPanel,
			setTopPanelVisibility: setTopPanelVisibility,
			setHeaderRowVisibility: setHeaderRowVisibility,
			getHeaderRow: getHeaderRow,
			getHeaderRowColumn: getHeaderRowColumn,
			getGridPosition: getGridPosition,
			flashCell: flashCell,
			addCellCssStyles: addCellCssStyles,
			setCellCssStyles: setCellCssStyles,
			removeCellCssStyles: removeCellCssStyles,
			getCellCssStyles: getCellCssStyles,

			init: finishInitialization,
			destroy: destroy,

			// IEditor implementation
			getEditorLock: getEditorLock,
			getEditController: getEditController
		});
		init();

		return obj;
	}
});

//    			headers.filter(":ui-sortable").sortable("destroy");
//    			$headers.sortable({
//    				containment: "parent",
//    				distance: 3,
//    				axis: "x",
//    				cursor: "default",
//    				tolerance: "intersection",
//    				helper: "clone",
//    				placeholder: "spark-sortable-placeholder ui-state-default spark-header-column",
//    				start: function (e, ui) {
//    					ui.placeholder.width(ui.helper.outerWidth() - headerColumnWidthDiff);
//    					$(ui.helper).addClass("spark-header-column-active");
//    				},
//    				beforeStop: function (e, ui) {
//    					$(ui.helper).removeClass("spark-header-column-active");
//    				},
//    				stop: function (e) {
//    					if (!getEditorLock().commitCurrentEdit()) {
//    						$(this).sortable("cancel");
//    						return;
//    					}
//
//    					var reorderedIds = $headers.sortable("toArray");
//    					var reorderedColumns = [];
//    					for (var i = 0; i < reorderedIds.length; i++) {
//    						reorderedColumns.push(columns[getColumnIndex(reorderedIds[i].replace(uid, ""))]);
//    					}
//    					setColumns(reorderedColumns);
//
//    					trigger(self.onColumnsReordered, {});
//    					e.stopPropagation();
//    					setupColumnResize();
//    				}
//    			});