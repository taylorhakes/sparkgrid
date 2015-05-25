(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', './util/misc', './selection/Range', './util/events', './editing/EditorLock'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('./util/misc'), require('./selection/Range'), require('./util/events'), require('./editing/EditorLock'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.Range, global.events, global.EditorLock);
		global.Grid = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _selectionRange, _utilEvents, _editingEditorLock) {
	'use strict';

	function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Range = _interopRequire(_selectionRange);

	var _EditorLock = _interopRequire(_editingEditorLock);

	// shared across all grids on the page
	var scrollbarDimensions = undefined,
	    maxSupportedCssHeight = undefined,
	    // browser's breaking point
	uidIndex = 1,
	    GlobalEditorLock = new _EditorLock();

	var defaults = {
		explicitInitialization: false,
		rowHeight: 25,
		defaultColumnWidth: 80,
		enableAddRow: false,
		leaveSpaceForNewRows: false,
		editable: false,
		autoEdit: false,
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
		cellFlashingCssClass: 'flashing',
		selectedCellCssClass: 'selected',
		multiSelect: true,
		enableTextSelectionOnCells: true,
		dataItemColumnValueExtractor: null,
		fullWidthRows: false,
		multiColumnSort: false,
		defaultFormatter: defaultFormatter,
		forceSyncScrolling: false,
		addNewRowCssClass: 'new-row'
	},
	    columnDefaults = {
		name: '',
		resizable: true,
		sortable: false,
		minWidth: 30,
		rerenderOnResize: false,
		headerCssClass: null,
		defaultSortAsc: true,
		focusable: true,
		selectable: true
	};

	// Example default formatter
	function defaultFormatter(row, cell, value, columnDef, dataContext) {
		if (value == null) {
			return '';
		} else {
			return (value + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		}
	}

	var Grid = (function () {
		function Grid(options) {
			_classCallCheck(this, Grid);

			// Check the container exists
			this._container = typeof options.el === 'string' ? document.querySelector(options.el) : options.el;
			if (!this._container) {
				throw new Error('SparkGrid requires a valid container (options.el, ' + options.el + ') does not exist in the DOM.');
			}

			// Check columns are valid
			if (!Array.isArray(options.columns)) {
				throw new Error('SparkGrid requires valid column definitions (options.columns).');
			}

			this._options = _utilMisc.extend({}, defaults, options);
			if (this._options.autoHeight) {
				this._options.leaveSpaceForNewRows = false;
			}

			// scroller
			this._h = null; // real scrollable height
			this._ph = null; // page height
			this._n = null; // number of pages
			this._cj = null; // 'jumpiness' coefficient
			this._th = null;
			this._page = 0; // current page
			this._offset = 0; // current page offset
			this._vScrollDir = 1;

			// private
			this._columns = null;
			this._initialized = false;
			this._uid = 'sparkgrid_' + uidIndex++;
			this._focusSink = null;
			this._focusSink2 = null;
			this._headerScroller = null;
			this._headers = null;
			this._headerRow = null;
			this._headerRowScroller = null;
			this._headerRowSpacer = null;
			this._topPanelScroller = null;
			this._topPanel = null;
			this._viewport = null;
			this._canvas = null;
			this._style = null;
			this._boundAncestors = null;
			this._stylesheet = null;
			this._columnCssRulesL = null;
			this._columnCssRulesR = null;
			this._viewportH = null;
			this._viewportW = null;
			this._canvasWidth = null;
			this._viewportHasHScroll = null;
			this._viewportHasVScroll = null;
			this._tabbingDirection = 1;
			this._activePosX = null;
			this._activeRow = null;
			this._activeCell = null;
			this._activeCellNode = null;
			this._currentEditor = null;
			this._serializedEditorValue = null;
			this._editController = {
				commitCurrentEdit: this._commitCurrentEdit.bind(this),
				cancelCurrentEdit: this._cancelCurrentEdit.bind(this)
			};
			this._rowsCache = {};
			this._renderedRows = 0;
			this._numVisibleRows = null;
			this._prevScrollTop = 0;
			this._scrollTop = 0;
			this._lastRenderedScrollTop = 0;
			this._lastRenderedScrollLeft = 0;
			this._prevScrollLeft = 0;
			this._scrollLeft = 0;

			this._selectionModel = null;
			this._selectedRows = [];

			this._plugins = [];
			this._cellCssClasses = {};

			this._columnsById = {};
			this._sortColumns = [];
			this._columnPosLeft = [];
			this._columnPosRight = [];

			// async call handles
			this._h_editorLoader = null;
			this._h_render = null;
			this._h_postrender = null;
			this._postProcessedRows = {};
			this._postProcessToRow = null;
			this._postProcessFromRow = null;

			// Events
			this.onScroll = new _utilEvents.Event();
			this.onSort = new _utilEvents.Event();
			this.onHeaderMouseEnter = new _utilEvents.Event();
			this.onHeaderMouseLeave = new _utilEvents.Event();
			this.onHeaderContextMenu = new _utilEvents.Event();
			this.onHeaderClick = new _utilEvents.Event();
			this.onHeaderCellRendered = new _utilEvents.Event();
			this.onHeadersRendered = new _utilEvents.Event();
			this.onBeforeHeaderCellDestroy = new _utilEvents.Event();
			this.onHeaderRowCellRendered = new _utilEvents.Event();
			this.onBeforeHeaderRowCellDestroy = new _utilEvents.Event();
			this.onMouseEnter = new _utilEvents.Event();
			this.onMouseLeave = new _utilEvents.Event();
			this.onClick = new _utilEvents.Event();
			this.onDblClick = new _utilEvents.Event();
			this.onContextMenu = new _utilEvents.Event();
			this.onKeyDown = new _utilEvents.Event();
			this.onAddNewRow = new _utilEvents.Event();
			this.onValidationError = new _utilEvents.Event();
			this.onViewportChanged = new _utilEvents.Event();
			this.onColumnsReordered = new _utilEvents.Event();
			this.onColumnsResized = new _utilEvents.Event();
			this.onCellChange = new _utilEvents.Event();
			this.onBeforeEditCell = new _utilEvents.Event();
			this.onBeforeCellEditorDestroy = new _utilEvents.Event();
			this.onBeforeDestroy = new _utilEvents.Event();
			this.onActiveCellChanged = new _utilEvents.Event();
			this.onActiveCellPositionChanged = new _utilEvents.Event();
			this.onDragInit = new _utilEvents.Event();
			this.onDragStart = new _utilEvents.Event();
			this.onDrag = new _utilEvents.Event();
			this.onDragEnd = new _utilEvents.Event();
			this.onSelectedRowsChanged = new _utilEvents.Event();
			this.onCellCssStylesChanged = new _utilEvents.Event();

			// perf counters
			this._counter_rows_rendered = 0;
			this._counter_rows_removed = 0;

			// These two variables work around a bug with inertial scrolling in Webkit/Blink on Mac.
			// See http://crbug.com/312427.
			this._rowNodeFromLastMouseWheelEvent = null; // this node must not be deleted while inertial scrolling
			this._zombieRowNodeFromLastMouseWheelEvent = null; // node that was hidden instead of getting deleted

			this._data = options.data || [];

			this._updateColumnCache(this._options.columns);
			this._createGrid();
		}

		Grid.prototype._createGrid = function _createGrid() {
			var container = this._container;

			// Add appropriate classes
			container.classList.add(this._uid);
			container.classList.add('spark');

			// Set up a positioning container if needed
			var computedStyle = window.getComputedStyle(container);
			if (!/relative|absolute|fixed/.test(computedStyle.position)) {
				container.style.position = 'relative';
			}

			// Calculate these only once and share between grid instances
			maxSupportedCssHeight = maxSupportedCssHeight || this._getMaxSupportedCssHeight();
			scrollbarDimensions = scrollbarDimensions || this._measureScrollbar();

			container.innerHTML = this._createGridHtml({
				spacerWidth: this._getCanvasWidth() + scrollbarDimensions.width
			});

			// Cache elements
			this._headerScroller = container.querySelector('.spark-header');
			this._headerRowScroller = container.querySelector('.spark-headerrow');
			this._headers = this._headerScroller.querySelector('.spark-header-columns');
			this._headerRow = this._headerRowScroller.querySelector('.spark-headerrow-columns');
			this._viewport = container.querySelector('.spark-viewport');
			this._canvas = this._viewport.querySelector('.spark-canvas');
			this._focusSink = container.querySelector('.spark-focus-sink1');
			this._focusSink2 = container.querySelector('.spark-focus-sink2');
			this._headerRowSpacer = this._headerRowScroller.querySelector('.spark-headerrow-spacer');
			this._topPanelScroller = container.querySelector('.spark-top-panel-scroller');
			this._topPanel = this._topPanelScroller.querySelector('.spark-top-panel');

			if (this._options.autoHeight) {
				this._viewport.style.overflow = 'hidden';
			}

			if (!this._options.showTopPanel) {
				this._topPanelScroller.style.display = 'none';
			}

			if (!this._options.showHeaderRow) {
				this._headerRowScroller.style.display = 'none';
			}

			if (!this._options.explicitInitialization) {
				this.init();
			}
		};

		Grid.prototype._createGridHtml = function _createGridHtml(_ref) {
			var headersWidth = _ref.headersWidth;
			var spacerWidth = _ref.spacerWidth;

			var template = '\n\t\t\t<div tabIndex="0" hideFocus="true" class="spark-focus-sink spark-focus-sink1"></div>\n\t\t\t<div class="spark-header">\n\t\t\t\t<div class="spark-header-columns" style="width:' + headersWidth + 'px"></div>\n\t\t\t</div>\n\t\t\t<div class="spark-headerrow">\n\t\t\t\t<div class="spark-headerrow-columns"></div>\n\t\t\t\t<div class="spark-headerrow-spacer" style="width:' + spacerWidth + 'px"></div>\n\t\t\t</div>\n\t\t\t<div class="spark-top-panel-scroller">\n\t\t\t\t<div class="spark-top-panel"></div>\n\t\t\t</div>\n\t\t\t<div class="spark-viewport">\n\t\t\t\t<div class="spark-canvas"></div>\n\t\t\t</div>\n\t\t\t<div tabIndex="0" hideFocus="true" class="spark-focus-sink spark-focus-sink2"></div>\n\t\t';

			return template;
		};

		Grid.prototype._updateColumnCache = function _updateColumnCache(newColumns) {
			this._columns = _utilMisc.slice(newColumns);

			// Save the columns by ID for reference later
			this._columnsById = {};
			for (var i = 0; i < this._columns.length; i++) {
				var m = this._columns[i] = _utilMisc.extend({
					width: this._options.defaultColumnWidth
				}, columnDefaults, this._columns[i]);

				this._columns[i] = m;
				this._columnsById[m.id] = i;
				if (m.minWidth && m.width < m.minWidth) {
					m.width = m.minWidth;
				}

				if (m.maxWidth && m.width > m.maxWidth) {
					m.width = m.maxWidth;
				}
			}
		};

		Grid.prototype._updateColumnSizeInfo = function _updateColumnSizeInfo() {
			// Pre-calculate cell boundaries.
			this._columnPosLeft = [];
			this._columnPosRight = [];
			var x = 0;
			for (var i = 0, ii = this._columns.length; i < ii; i++) {
				this._columnPosLeft[i] = x;
				this._columnPosRight[i] = x + this._columns[i].width;
				x += this._columns[i].width;
			}
		};

		Grid.prototype._measureScrollbar = function _measureScrollbar() {
			var c = _utilMisc.createEl({
				tag: 'div',
				style: {
					position: 'absolute',
					top: '-10000px',
					left: '-10000px',
					width: '100px',
					height: '100px',
					overflow: 'scroll'
				}
			});
			document.body.appendChild(c);
			var dim = {
				width: _utilMisc.getPx(c, 'height') - c.clientWidth,
				height: _utilMisc.getPx(c, 'height') - c.clientHeight
			};
			c.parentNode.removeChild(c);
			return dim;
		};

		Grid.prototype._getHeadersWidth = function _getHeadersWidth() {
			var headersWidth = 0;
			for (var i = 0, ii = this._columns.length; i < ii; i++) {
				headersWidth += this._columns[i].width;
			}

			headersWidth += scrollbarDimensions.width;
			return Math.max(headersWidth, this._viewportW || 0) + 1000;
		};

		Grid.prototype._getCanvasWidth = function _getCanvasWidth() {
			var availableWidth = this._viewportHasVScroll ? this._viewportW - scrollbarDimensions.width : this._viewportW,
			    rowWidth = 0,
			    i = this._columns.length;

			while (i--) {
				rowWidth += this._columns[i].width;
			}

			return this._options.fullWidthRows ? Math.max(rowWidth, availableWidth) : rowWidth;
		};

		Grid.prototype._updateCanvasWidth = function _updateCanvasWidth(forceColumnWidthsUpdate) {
			var oldCanvasWidth = this._canvasWidth;
			this._canvasWidth = this._getCanvasWidth();

			if (this._canvasWidth !== oldCanvasWidth) {
				_utilMisc.setPx(this._canvas, 'width', this._canvasWidth);
				_utilMisc.setPx(this._headerRow, 'width', this._canvasWidth);
				_utilMisc.setPx(this._headers, 'width', this._getHeadersWidth());
				this._viewportHasHScroll = this._canvasWidth > this._viewportW - scrollbarDimensions.width;
			}

			_utilMisc.setPx(this._headerRowSpacer, 'width', this._canvasWidth + (this._viewportHasVScroll ? scrollbarDimensions.width : 0));

			if (this._canvasWidth !== oldCanvasWidth || forceColumnWidthsUpdate) {
				this._applyColumnWidths();
			}
		};

		Grid.prototype._getMaxSupportedCssHeight = function _getMaxSupportedCssHeight() {
			var supportedHeight = 1000000,
			   

			// FF reports the height back but still renders blank after ~6M px
			testUpTo = navigator.userAgent.toLowerCase().match(/firefox/) ? 6000000 : 1000000000,
			    div = _utilMisc.createEl({
				tag: 'div',
				style: {
					display: 'none'
				}
			});

			document.body.appendChild(div);

			while (true) {
				var test = supportedHeight * 2;
				_utilMisc.setPx(div, 'height', test);
				if (test > testUpTo || div.offsetHeight !== test) {
					break;
				} else {
					supportedHeight = test;
				}
			}

			div.parentNode.removeChild(div);
			return supportedHeight;
		};

		Grid.prototype._bindAncestorScrollEvents = function _bindAncestorScrollEvents() {
			var elem = this._canvas,
			    scrollFn = this._handleActiveCellPositionChange.bind(this);

			while ((elem = elem.parentNode) !== document.body && elem != null) {
				// bind to scroll containers only
				if (elem === this._viewport || elem.scrollWidth !== elem.clientWidth || elem.scrollHeight !== elem.clientHeight) {
					if (!this._boundAncestors) {
						this._boundAncestors = [];
					}

					this._boundAncestors.push(elem);
					elem.addEventListener('scroll', scrollFn);
				}
			}
		};

		Grid.prototype._unbindAncestorScrollEvents = function _unbindAncestorScrollEvents() {
			if (!this._boundAncestors) {
				return;
			}

			var scrollFn = this._handleActiveCellPositionChange.bind(this);
			for (var i = 0, len = this._boundAncestors.length; i < len; i++) {
				this._boundAncestors[i].removeEventListener('scroll', scrollFn);
			}

			this._boundAncestors = null;
		};

		Grid.prototype._createColumnHeaders = function _createColumnHeaders() {
			var _this = this;

			_utilMisc.slice(this._headers.querySelectorAll('.spark-header-column')).forEach(function (el) {
				var columnDef = _this._columns[+el.dataset.columnIndex];
				if (columnDef) {
					_this._trigger('onBeforeHeaderCellDestroy', {
						node: el,
						column: columnDef
					});
				}
			});
			this._headers.innerHTML = '';
			_utilMisc.setPx(this._headers, 'width', this._getHeadersWidth());

			_utilMisc.slice(this._headerRow.querySelectorAll('.spark-headerrow-column')).forEach(function (el) {
				var columnDef = _this._columns[+el.dataset.columnIndex];
				if (columnDef) {
					_this._trigger('onBeforeHeaderRowCellDestroy', {
						node: el,
						column: columnDef
					});
				}
			});
			this._headerRow.innerHTML = '';

			for (var i = 0; i < this._columns.length; i++) {
				var m = this._columns[i],
				    header = _utilMisc.createEl({
					tag: 'div',
					id: '' + this._uid + m.id,
					title: m.toolTip || '',
					className: 'spark-header-column'
				});
				header.innerHTML = '<span class="spark-column-name">' + m.name + '</span>';
				_utilMisc.setPx(header, 'width', m.width);
				header.dataset.columnIndex = i;
				if (m.headerCssClass) {
					header.classList.add(m.headerCssClass);
				}

				this._headers.appendChild(header);

				if (m.sortable) {
					header.classList.add('spark-header-sortable');

					var span = _utilMisc.createEl({
						tag: 'span',
						className: 'spark-sort-indicator'
					});
					header.appendChild(span);
				}

				this._trigger('onHeaderCellRendered', {
					node: header,
					column: m
				});

				if (this._options.showHeaderRow) {
					var headerRowCell = _utilMisc.createEl({
						tag: 'div',
						className: 'spark-headerrow-column l' + i + ' r' + i
					});
					headerRowCell.dataset.columnIndex = i;
					this._headerRow.appendChild(headerRowCell);

					this._trigger('onHeaderRowCellRendered', {
						node: headerRowCell,
						column: m
					});
				}
			}

			this.setSortColumns(this._sortColumns);
			this._setupColumnResize();
			this._trigger('onHeadersRendered');
		};

		Grid.prototype._setupColumnSort = function _setupColumnSort() {
			var _this2 = this;

			this._headers.addEventListener('click', function (e) {
				e.metaKey = e.metaKey || e.ctrlKey;

				if (e.target.classList.contains('spark-resizable-handle')) {
					return;
				}

				var col = _utilMisc.closest(e.target, '.spark-header-column');
				if (!col) {
					return;
				}

				var column = _this2._columns[+col.dataset.columnIndex];
				if (column.sortable) {
					if (!_this2.getEditorLock().commitCurrentEdit()) {
						return;
					}

					var sortOpts = null,
					    i = 0;
					for (; i < _this2._sortColumns.length; i++) {
						if (_this2._sortColumns[i].columnId === column.id) {
							sortOpts = _this2._sortColumns[i];
							sortOpts.sortAsc = !sortOpts.sortAsc;
							break;
						}
					}

					if (e.metaKey && _this2._options.multiColumnSort) {
						if (sortOpts) {
							_this2._sortColumns.splice(i, 1);
						}
					} else {
						if (!e.shiftKey && !e.metaKey || !_this2._options.multiColumnSort) {
							_this2._sortColumns = [];
						}

						if (!sortOpts) {
							sortOpts = { columnId: column.id, sortAsc: column.defaultSortAsc };
							_this2._sortColumns.push(sortOpts);
						} else if (_this2._sortColumns.length === 0) {
							_this2._sortColumns.push(sortOpts);
						}
					}

					_this2.setSortColumns(_this2._sortColumns);

					if (!_this2._options.multiColumnSort) {
						_this2._trigger('onSort', {
							multiColumnSort: false,
							sortCol: column,
							sortAsc: sortOpts.sortAsc
						}, e);
					} else {
						_this2._trigger('onSort', {
							multiColumnSort: true,
							sortCols: _this2._sortColumns.map(function (col) {
								return {
									sortCol: _this2._columns[_this2.getColumnIndex(col.columnId)], sortAsc: col.sortAsc
								};
							})
						}, e);
					}
				}
			});
		};

		Grid.prototype._setupColumnResize = function _setupColumnResize() {
			var _this3 = this;

			var j = undefined,
			    c = undefined,
			    pageX = undefined,
			    columnElements = undefined,
			    minPageX = undefined,
			    maxPageX = undefined,
			    firstResizable = undefined,
			    lastResizable = undefined;
			columnElements = _utilMisc.slice(this._headers.children);
			columnElements.forEach(function (el, i) {
				var handle = el.querySelector('.spark-resizable-handle');
				if (handle) {
					handle.parentNode.removeChild(handle);
				}

				if (_this3._columns[i].resizable) {
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
				if (i < firstResizable || _this3._options.forceFitColumns && i >= lastResizable) {
					return;
				}

				var handle = _utilMisc.createEl({
					tag: 'div',
					className: 'spark-resizable-handle'
				});

				var handleDrag = function handleDrag(e) {
					var actualMinWidth = undefined,
					    d = Math.min(maxPageX, Math.max(minPageX, e.pageX)) - pageX,
					    x = undefined;
					e.preventDefault();
					if (d < 0) {
						// shrink column
						x = d;
						for (j = i; j >= 0; j--) {
							c = _this3._columns[j];
							if (c.resizable) {
								actualMinWidth = c.minWidth;
								if (x && c.previousWidth + x < actualMinWidth) {
									x += c.previousWidth - actualMinWidth;
									c.width = actualMinWidth;
								} else {
									c.width = c.previousWidth + x;
									x = 0;
								}
							}
						}

						if (_this3._options.forceFitColumns) {
							x = -d;
							for (j = i + 1; j < columnElements.length; j++) {
								c = _this3._columns[j];
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
							c = _this3._columns[j];
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

						if (_this3._options.forceFitColumns) {
							x = -d;
							for (j = i + 1; j < columnElements.length; j++) {
								c = _this3._columns[j];
								if (c.resizable) {
									actualMinWidth = c.minWidth;
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

					_this3._applyColumnHeaderWidths();
					if (_this3._options.syncColumnCellResize) {
						_this3._applyColumnWidths();
					}
				};

				var handleMouseUp = function handleMouseUp(e) {
					document.body.removeEventListener('mouseup', handleMouseUp);
					document.body.removeEventListener('mousemove', handleDrag);
					e.target.parentNode.classList.remove('spark-header-column-active');

					var resizedColumns = [];
					for (j = 0; j < columnElements.length; j++) {
						c = _this3._columns[j];
						var newWidth = columnElements[j].clientWidth;

						if (c.previousWidth !== newWidth) {
							resizedColumns.push(c);
							if (c.rerenderOnResize) {
								_this3.invalidateAllRows();
							}
						}
					}

					_this3._updateCanvasWidth(true);
					_this3.render();
					_this3._trigger('onColumnsResized', resizedColumns);
				};

				var handleMousedown = function handleMousedown(e) {
					var shrinkLeewayOnRight = null,
					    stretchLeewayOnRight = null;

					if (!_this3.getEditorLock().commitCurrentEdit()) {
						return false;
					}

					pageX = e.pageX;
					e.preventDefault();
					e.currentTarget.parentNode.classList.add('spark-header-column-active');

					// lock each column's width option to current width
					columnElements.forEach(function (e, i) {
						_this3._columns[i].previousWidth = e.offsetWidth;
					});
					if (_this3._options.forceFitColumns) {
						shrinkLeewayOnRight = 0;
						stretchLeewayOnRight = 0;

						// this._columns on right affect maxPageX/minPageX
						for (j = i + 1; j < columnElements.length; j++) {
							c = _this3._columns[j];
							if (c.resizable) {
								if (stretchLeewayOnRight !== null) {
									if (c.maxWidth) {
										stretchLeewayOnRight += c.maxWidth - c.previousWidth;
									} else {
										stretchLeewayOnRight = null;
									}
								}

								shrinkLeewayOnRight += c.previousWidth - c.minWidth;
							}
						}
					}

					var shrinkLeewayOnLeft = 0,
					    stretchLeewayOnLeft = 0;
					for (j = 0; j <= i; j++) {
						// columns on left only affect minPageX
						c = _this3._columns[j];
						if (c.resizable) {
							if (stretchLeewayOnLeft !== null) {
								if (c.maxWidth) {
									stretchLeewayOnLeft += c.maxWidth - c.previousWidth;
								} else {
									stretchLeewayOnLeft = null;
								}
							}

							shrinkLeewayOnLeft += c.previousWidth - c.minWidth;
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

					document.body.addEventListener('mousemove', handleDrag);
					document.body.addEventListener('mouseup', handleMouseUp);
				};

				handle.addEventListener('mousedown', handleMousedown);
				el.appendChild(handle);
			});
		};

		Grid.prototype._createCssRules = function _createCssRules() {
			this._style = _utilMisc.createEl({
				tag: 'style',
				rel: 'stylesheet'
			});
			document.body.appendChild(this._style);
			var rowHeight = this._options.rowHeight,
			    rules = ['.' + this._uid + ' .spark-header-column { left: 1000px; }', '.' + this._uid + ' .spark-top-panel { height:' + this._options.topPanelHeight + 'px; }', '.' + this._uid + ' .spark-headerrow-columns { height:' + this._options.headerRowHeight + 'px; }', '.' + this._uid + ' .spark-row { height:' + rowHeight + 'px; }', '.' + this._uid + ' .spark-cell { height:' + rowHeight + 'px; }'];

			for (var i = 0; i < this._columns.length; i++) {
				rules.push('.' + this._uid + ' .l' + i + ' { }');
				rules.push('.' + this._uid + ' .r' + i + ' { }');
			}

			if (this._style.styleSheet) {
				// IE
				this._style.styleSheet.cssText = rules.join(' ');
			} else {
				this._style.appendChild(document.createTextNode(rules.join(' ')));
			}
		};

		Grid.prototype._getColumnCssRules = function _getColumnCssRules(idx) {
			if (!this._stylesheet) {
				var sheets = document.styleSheets;
				for (var i = 0; i < sheets.length; i++) {
					if ((sheets[i].ownerNode || sheets[i].owningElement) === this._style) {
						this._stylesheet = sheets[i];
						break;
					}
				}

				if (!this._stylesheet) {
					throw new Error('Cannot find stylesheet.');
				}

				// find and cache column CSS rules
				this._columnCssRulesL = [];
				this._columnCssRulesR = [];

				var cssRules = this._stylesheet.cssRules || this._stylesheet.rules,
				    columnIdx = undefined;
				for (var i = 0; i < cssRules.length; i++) {
					var selector = cssRules[i].selectorText,
					    matchesL = /\.l\d+/.exec(selector),
					    matchesR = /\.r\d+/.exec(selector);

					if (matchesL) {
						columnIdx = parseInt(matchesL[0].substr(2, matchesL[0].length - 2), 10);
						this._columnCssRulesL[columnIdx] = cssRules[i];
					} else if (matchesR) {
						columnIdx = parseInt(matchesR[0].substr(2, matchesR[0].length - 2), 10);
						this._columnCssRulesR[columnIdx] = cssRules[i];
					}
				}
			}

			return {
				left: this._columnCssRulesL[idx],
				right: this._columnCssRulesR[idx]
			};
		};

		Grid.prototype._removeCssRules = function _removeCssRules() {
			_utilMisc.removeEl(this._style);
			this._stylesheet = null;
		};

		Grid.prototype._applyColumnHeaderWidths = function _applyColumnHeaderWidths() {
			if (!this._initialized) {
				return;
			}

			for (var i = 0, hds = this._headers.children, ii = hds.length; i < ii; i++) {
				var h = hds[i];
				if (h.offsetWidth !== this._columns[i].width) {
					h.style.width = this._columns[i].width + 'px';
				}
			}

			this._updateColumnSizeInfo();
		};

		Grid.prototype._applyColumnWidths = function _applyColumnWidths() {
			var x = 0;
			for (var i = 0; i < this._columns.length; i++) {
				var w = this._columns[i].width,
				    rule = this._getColumnCssRules(i);

				rule.left.style.left = x + 'px';
				rule.right.style.width = w + 'px';

				x += w;
			}
		};

		Grid.prototype._handleSelectedRangesChanged = function _handleSelectedRangesChanged(_ref2) {
			var ranges = _ref2.data;
			var e = _ref2.e;

			this._selectedRows = [];
			var hash = {};
			for (var i = 0; i < ranges.length; i++) {
				for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
					if (!hash[j]) {
						// prevent duplicates
						this._selectedRows.push(j);
						hash[j] = {};
					}

					for (var k = ranges[i].fromCell; k <= ranges[i].toCell; k++) {
						if (this.canCellBeSelected(j, k)) {
							hash[j][this._columns[k].id] = this._options.selectedCellCssClass;
						}
					}
				}
			}

			this.setCellCssStyles(this._options.selectedCellCssClass, hash);

			this._trigger('onSelectedRowsChanged', { rows: this.getSelectedRows() }, e);
		};

		Grid.prototype._trigger = function _trigger(evt, args, e) {
			args = args || {};
			args.grid = this;
			return this[evt].notify(args, e, this);
		};

		Grid.prototype._getDataLengthIncludingAddNew = function _getDataLengthIncludingAddNew() {
			return this.getDataLength() + (this._options.enableAddRow ? 1 : 0);
		};

		Grid.prototype._getRowTop = function _getRowTop(row) {
			return this._options.rowHeight * row - this._offset;
		};

		Grid.prototype._getRowFromPosition = function _getRowFromPosition(y) {
			return Math.floor((y + this._offset) / this._options.rowHeight);
		};

		Grid.prototype._scrollTo = function _scrollTo(y) {
			y = Math.max(y, 0);
			y = Math.min(y, this._th - this._viewportH + (this._viewportHasHScroll ? scrollbarDimensions.height : 0));

			var oldOffset = this._offset;

			this._page = Math.min(this._n - 1, Math.floor(y / this._ph));
			this._offset = Math.round(this._page * this._cj);
			var newScrollTop = y - this._offset;

			if (this._offset !== oldOffset) {
				var range = this.getViewport(newScrollTop);
				this._cleanupRows(range);
				this._updateRowPositions();
			}

			if (this._prevScrollTop !== newScrollTop) {
				this._vScrollDir = this._prevScrollTop + oldOffset < newScrollTop + this._offset ? 1 : -1;
				this._viewport.scrollTop = this._lastRenderedScrollTop = this._scrollTop = this._prevScrollTop = newScrollTop;

				this._trigger('onViewportChanged', {});
			}
		};

		Grid.prototype._getFormatter = function _getFormatter(row, column, rowMetadata) {
			// look up by id, then index
			var columnOverrides = rowMetadata && rowMetadata.columns && (rowMetadata.columns[column.id] || rowMetadata.columns[this.getColumnIndex(column.id)]);

			return columnOverrides && columnOverrides.formatter || rowMetadata && rowMetadata.formatter || column.formatter || this._options.formatterFactory && this._options.formatterFactory._getFormatter(column) || this._options.defaultFormatter;
		};

		Grid.prototype._getEditor = function _getEditor(row, cell) {
			var column = this._columns[cell],
			    rowMetadata = this._data.getItemMetadata && this._data.getItemMetadata(row),
			    columnMetadata = rowMetadata && rowMetadata.columns;

			if (columnMetadata && columnMetadata[column.id] && columnMetadata[column.id].editor !== undefined) {
				return columnMetadata[column.id].editor;
			}

			if (columnMetadata && columnMetadata[cell] && columnMetadata[cell].editor !== undefined) {
				return columnMetadata[cell].editor;
			}

			return column.editor || this._options.editorFactory && this._options.editorFactory._getEditor(column);
		};

		Grid.prototype._getDataItemValueForColumn = function _getDataItemValueForColumn(item, columnDef) {
			if (this._options.dataItemColumnValueExtractor) {
				return this._options.dataItemColumnValueExtractor(item, columnDef);
			}

			return item[columnDef.field];
		};

		Grid.prototype._appendRowHtml = function _appendRowHtml(stringArray, row, range, dataLength) {
			var d = this.getDataItem(row),
			    dataLoading = row < dataLength && !d,
			    rowCss = 'spark-row' + (dataLoading ? ' loading' : '') + (row === this._activeRow ? ' active' : '') + (row % 2 === 1 ? ' odd' : ' even'),
			    metadata = this._data.getItemMetadata && this._data.getItemMetadata(row);

			if (!d) {
				rowCss += ' ' + this._options.addNewRowCssClass;
			}

			if (metadata && metadata.cssClasses) {
				rowCss += ' ' + metadata.cssClasses;
			}

			stringArray.push('<div class="' + rowCss + '" style="top:' + this._getRowTop(row) + 'px">');

			for (var i = 0, ii = this._columns.length; i < ii; i++) {
				var m = this._columns[i],
				    colspan = 1;

				if (metadata && metadata.columns) {
					var columnData = metadata.columns[m.id] || metadata.columns[i];
					colspan = columnData && columnData.colspan || 1;
					if (colspan === '*') {
						colspan = ii - i;
					}
				}

				// Do not render cells outside of the viewport.
				if (this._columnPosRight[Math.min(ii - 1, i + colspan - 1)] > range.leftPx) {
					if (this._columnPosLeft[i] > range.rightPx) {
						// All columns to the right are outside the range.
						break;
					}

					this._appendCellHtml(stringArray, row, i, colspan, d, metadata);
				}

				if (colspan > 1) {
					i += colspan - 1;
				}
			}

			stringArray.push('</div>');
		};

		Grid.prototype._appendCellHtml = function _appendCellHtml(stringArray, row, cell, colspan, item, metadata) {
			var m = this._columns[cell],
			    cellCss = 'spark-cell l' + cell + ' r' + Math.min(this._columns.length - 1, cell + colspan - 1) + (m.cssClass ? ' ' + m.cssClass : '');
			if (row === this._activeRow && cell === this._activeCell) {
				cellCss += ' active';
			}

			// TODO:  merge them together in the setter
			for (var key in this._cellCssClasses) {
				if (this._cellCssClasses[key][row] && this._cellCssClasses[key][row][m.id]) {
					cellCss += ' ' + this._cellCssClasses[key][row][m.id];
				}
			}

			stringArray.push('<div class="' + cellCss + '">');

			// if there is a corresponding row (if not, this is the Add New row or this data hasn't been loaded yet)
			if (item) {
				var value = this._getDataItemValueForColumn(item, m);
				stringArray.push(this._getFormatter(row, m, metadata)(row, cell, value, m, item));
			}

			stringArray.push('</div>');

			this._rowsCache[row].cellRenderQueue.push(cell);
			this._rowsCache[row].cellColSpans[cell] = colspan;
		};

		Grid.prototype._cleanupRows = function _cleanupRows(rangeToKeep) {
			for (var i in this._rowsCache) {
				if ((i = parseInt(i, 10)) !== this._activeRow && (i < rangeToKeep.top || i > rangeToKeep.bottom)) {
					this._removeRowFromCache(i);
				}
			}
		};

		Grid.prototype._removeRowFromCache = function _removeRowFromCache(row) {
			var cacheEntry = this._rowsCache[row];
			if (!cacheEntry) {
				return;
			}

			if (this._rowNodeFromLastMouseWheelEvent === cacheEntry.rowNode) {
				cacheEntry.rowNode.style.display = 'none';
				this._zombieRowNodeFromLastMouseWheelEvent = this._rowNodeFromLastMouseWheelEvent;
			} else {
				this._canvas.removeChild(cacheEntry.rowNode);
			}

			delete this._rowsCache[row];
			delete this._postProcessedRows[row];
			this._renderedRows--;
			this._counter_rows_removed++;
		};

		Grid.prototype._getViewportHeight = function _getViewportHeight() {
			var container = this._container;

			return container.clientHeight - this._headerScroller.offsetHeight - (this._options.showTopPanel ? this._options.topPanelHeight : 0) - (this._options.showHeaderRow ? this._options.headerRowHeight : 0);
		};

		Grid.prototype._ensureCellNodesInRowsCache = function _ensureCellNodesInRowsCache(row) {
			var cacheEntry = this._rowsCache[row];
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
		};

		Grid.prototype._cleanUpCells = function _cleanUpCells(range, row) {
			var totalCellsRemoved = 0,
			    cacheEntry = this._rowsCache[row];

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
				if (this._columnPosLeft[i] > range.rightPx || this._columnPosRight[Math.min(this._columns.length - 1, i + colspan - 1)] < range.leftPx) {
					if (!(row === this._activeRow && i === this._activeCell)) {
						cellsToRemove.push(i);
					}
				}
			}

			var cellToRemove = undefined;
			while ((cellToRemove = cellsToRemove.pop()) != null) {
				cacheEntry.rowNode.removeChild(cacheEntry.cellNodesByColumnIdx[cellToRemove]);
				delete cacheEntry.cellColSpans[cellToRemove];
				delete cacheEntry.cellNodesByColumnIdx[cellToRemove];
				if (this._postProcessedRows[row]) {
					delete this._postProcessedRows[row][cellToRemove];
				}

				totalCellsRemoved++;
			}
		};

		Grid.prototype._cleanUpAndRenderCells = function _cleanUpAndRenderCells(range) {
			var cacheEntry = undefined,
			    stringArray = [],
			    processedRows = [],
			    cellsAdded = undefined,
			    totalCellsAdded = 0,
			    colspan = undefined;

			for (var row = range.top, btm = range.bottom; row <= btm; row++) {
				cacheEntry = this._rowsCache[row];
				if (!cacheEntry) {
					continue;
				}

				// cellRenderQueue populated in renderRows() needs to be cleared first
				this._ensureCellNodesInRowsCache(row);

				this._cleanUpCells(range, row);

				// Render missing cells.
				cellsAdded = 0;

				var metadata = this._data.getItemMetadata && this._data.getItemMetadata(row),
				    d = this.getDataItem(row);
				metadata = metadata && metadata.columns;

				// TODO:  shorten this loop (index? heuristics? binary search?)
				for (var i = 0, ii = this._columns.length; i < ii; i++) {
					// Cells to the right are outside the range.
					if (this._columnPosLeft[i] > range.rightPx) {
						break;
					}

					// Already rendered.
					if ((colspan = cacheEntry.cellColSpans[i]) != null) {
						i += colspan > 1 ? colspan - 1 : 0;
						continue;
					}

					colspan = 1;
					if (metadata) {
						var columnData = metadata[this._columns[i].id] || metadata[i];
						colspan = columnData && columnData.colspan || 1;
						if (colspan === '*') {
							colspan = ii - i;
						}
					}

					if (this._columnPosRight[Math.min(ii - 1, i + colspan - 1)] > range.leftPx) {
						this._appendCellHtml(stringArray, row, i, colspan, d);
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

			var x = document.createElement('div');
			x.innerHTML = stringArray.join('');

			var processedRow = undefined;
			while ((processedRow = processedRows.pop()) != null) {
				cacheEntry = this._rowsCache[processedRow];
				var columnIdx = undefined;
				while ((columnIdx = cacheEntry.cellRenderQueue.pop()) != null) {
					var node = x.lastChild;
					cacheEntry.rowNode.appendChild(node);
					cacheEntry.cellNodesByColumnIdx[columnIdx] = node;
				}
			}
		};

		Grid.prototype._renderRows = function _renderRows(range) {
			var parentNode = this._canvas,
			    stringArray = [],
			    rows = [],
			    needToReselectCell = false,
			    dataLength = this.getDataLength();

			for (var i = range.top, ii = range.bottom; i <= ii; i++) {
				if (this._rowsCache[i]) {
					continue;
				}

				this._renderedRows++;
				rows.push(i);

				// Create an entry right away so that appendRowHtml() can
				// start populatating it.
				this._rowsCache[i] = {
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

				this._appendRowHtml(stringArray, i, range, dataLength);
				if (this._activeCellNode && this._activeRow === i) {
					needToReselectCell = true;
				}

				this._counter_rows_rendered++;
			}

			if (!rows.length) {
				return;
			}

			var x = document.createElement('div');
			x.innerHTML = stringArray.join('');

			for (var i = 0, ii = rows.length; i < ii; i++) {
				this._rowsCache[rows[i]].rowNode = parentNode.appendChild(x.firstChild);
			}

			if (needToReselectCell) {
				this._activeCellNode = this.getCellNode(this._activeRow, this._activeCell);
			}
		};

		Grid.prototype._startPostProcessing = function _startPostProcessing() {
			if (!this._options.enableAsyncPostRender) {
				return;
			}

			clearTimeout(this._h_postrender);
			this._h_postrender = setTimeout(this._asyncPostProcessRows.bind(this), this._options.asyncPostRenderDelay);
		};

		Grid.prototype._invalidatePostProcessingResults = function _invalidatePostProcessingResults(row) {
			delete this._postProcessedRows[row];
			this._postProcessFromRow = Math.min(this._postProcessFromRow, row);
			this._postProcessToRow = Math.max(this._postProcessToRow, row);
			this._startPostProcessing();
		};

		Grid.prototype._updateRowPositions = function _updateRowPositions() {
			for (var row in this._rowsCache) {
				this._rowsCache[row].rowNode.style.top = this._getRowTop(row) + 'px';
			}
		};

		Grid.prototype._handleHeaderRowScroll = function _handleHeaderRowScroll() {
			var scrollLeft = this._headerRowScroller.scrollLeft;
			if (scrollLeft !== this._viewport.scrollLeft) {
				this._viewport.scrollLeft = scrollLeft;
			}
		};

		Grid.prototype._handleScroll = function _handleScroll() {
			this._scrollTop = this._viewport.scrollTop;
			this._scrollLeft = this._viewport.scrollLeft;

			var vScrollDist = Math.abs(this._scrollTop - this._prevScrollTop),
			    hScrollDist = Math.abs(this._scrollLeft - this._prevScrollLeft);

			if (hScrollDist) {
				this._prevScrollLeft = this._scrollLeft;
				this._headerScroller.scrollLeft = this._scrollLeft;
				this._topPanelScroller.scrollLeft = this._scrollLeft;
				this._headerRowScroller.scrollLeft = this._scrollLeft;
			}

			if (vScrollDist) {
				this._vScrollDir = this._prevScrollTop < this._scrollTop ? 1 : -1;
				this._prevScrollTop = this._scrollTop;

				// switch virtual pages if needed
				if (vScrollDist < this._viewportH) {
					this._scrollTo(this._scrollTop + this._offset);
				} else {
					var oldOffset = this._offset;
					if (this._h === this._viewportH) {
						this._page = 0;
					} else {
						this._page = Math.min(this._n - 1, Math.floor(this._scrollTop * ((this._th - this._viewportH) / (this._h - this._viewportH)) * (1 / this._ph)));
					}

					this._offset = Math.round(this._page * this._cj);
					if (oldOffset !== this._offset) {
						this.invalidateAllRows();
					}
				}
			}

			if (hScrollDist || vScrollDist) {
				if (this._h_render) {
					clearTimeout(this._h_render);
				}

				if (Math.abs(this._lastRenderedScrollTop - this._scrollTop) > 20 || Math.abs(this._lastRenderedScrollLeft - this._scrollLeft) > 20) {
					if (this._options.forceSyncScrolling || Math.abs(this._lastRenderedScrollTop - this._scrollTop) < this._viewportH && Math.abs(this._lastRenderedScrollLeft - this._scrollLeft) < this._viewportW) {
						this.render();
					} else {
						this._h_render = setTimeout(this.render.bind(this), 10);
					}

					this._trigger('onViewportChanged', {});
				}
			}

			this._trigger('onScroll', { scrollLeft: this._scrollLeft, scrollTop: this._scrollTop });
		};

		Grid.prototype._asyncPostProcessRows = function _asyncPostProcessRows() {
			var dataLength = this.getDataLength();
			while (this._postProcessFromRow <= this._postProcessToRow) {
				var row = this._vScrollDir >= 0 ? this._postProcessFromRow++ : this._postProcessToRow--,
				    cacheEntry = this._rowsCache[row];

				if (!cacheEntry || row >= dataLength) {
					continue;
				}

				if (!this._postProcessedRows[row]) {
					this._postProcessedRows[row] = {};
				}

				this._ensureCellNodesInRowsCache(row);
				for (var columnIdx in cacheEntry.cellNodesByColumnIdx) {
					if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(columnIdx)) {
						continue;
					}

					columnIdx = columnIdx | 0;

					var m = this._columns[columnIdx];
					if (m.asyncPostRender && !this._postProcessedRows[row][columnIdx]) {
						var node = cacheEntry.cellNodesByColumnIdx[columnIdx];
						if (node) {
							m.asyncPostRender(node, row, this.getDataItem(row), m);
						}

						this._postProcessedRows[row][columnIdx] = true;
					}
				}

				this._h_postrender = setTimeout(this._asyncPostProcessRows.bind(this), this._options.asyncPostRenderDelay);
				return;
			}
		};

		Grid.prototype._updateCellCssStylesOnRenderedRows = function _updateCellCssStylesOnRenderedRows(addedHash, removedHash) {
			var node = undefined,
			    columnId = undefined,
			    addedRowHash = undefined,
			    removedRowHash = undefined;
			for (var row in this._rowsCache) {
				removedRowHash = removedHash && removedHash[row];
				addedRowHash = addedHash && addedHash[row];

				if (removedRowHash) {
					for (columnId in removedRowHash) {
						if (!addedRowHash || removedRowHash[columnId] !== addedRowHash[columnId]) {
							node = this.getCellNode(row, this.getColumnIndex(columnId));
							if (node) {
								node.classList.remove(removedRowHash[columnId]);
							}
						}
					}
				}

				if (addedRowHash) {
					for (columnId in addedRowHash) {
						if (!removedRowHash || removedRowHash[columnId] !== addedRowHash[columnId]) {
							node = this.getCellNode(row, this.getColumnIndex(columnId));
							if (node) {
								node.classList.add(addedRowHash[columnId]);
							}
						}
					}
				}
			}
		};

		Grid.prototype._handleMouseWheel = function _handleMouseWheel(e) {
			var rowNode = _utilMisc.closest(e.target, '.spark-row');
			if (rowNode !== this._rowNodeFromLastMouseWheelEvent) {
				if (this._zombieRowNodeFromLastMouseWheelEvent && this._zombieRowNodeFromLastMouseWheelEvent !== rowNode) {
					this._canvas.removeChild(this._zombieRowNodeFromLastMouseWheelEvent);
					this._zombieRowNodeFromLastMouseWheelEvent = null;
				}

				this._rowNodeFromLastMouseWheelEvent = rowNode;
			}
		};

		Grid.prototype._handleDragInit = function _handleDragInit(e, dd) {
			var cell = this.getCellFromEvent(e);
			if (!cell || !this._cellExists(cell.row, cell.cell)) {
				return false;
			}

			var retval = this._trigger('onDragInit', dd, e);
			if (e.isImmediatePropagationStopped()) {
				return retval;
			}

			// if nobody claims to be handling drag'n'drop by stopping immediate propagation,
			// cancel out of it
			return false;
		};

		Grid.prototype._handleDragStart = function _handleDragStart(e, dd) {
			var cell = this.getCellFromEvent(e);
			if (!cell || !this._cellExists(cell.row, cell.cell)) {
				return false;
			}

			var retval = this._trigger('onDragStart', dd, e);
			if (e.isImmediatePropagationStopped()) {
				return retval;
			}

			return false;
		};

		Grid.prototype._handleDrag = function _handleDrag(e, dd) {
			return this._trigger('onDrag', dd, e);
		};

		Grid.prototype._handleDragEnd = function _handleDragEnd(e, dd) {
			this._trigger('onDragEnd', dd, e);
		};

		Grid.prototype._handleKeyDown = function _handleKeyDown(e) {
			this._trigger('onKeyDown', { row: this._activeRow, cell: this._activeCell }, e);
			var handled = false /*e.isImmediatePropagationStopped()*/;

			if (!handled) {
				if (!e.shiftKey && !e.altKey && !e.ctrlKey) {
					if (e.which === 27) {
						if (!this.getEditorLock().isActive()) {
							return; // no editing mode to cancel, allow bubbling and default processing (exit without cancelling the event)
						}

						this._cancelEditAndSetFocus();
					} else if (e.which === 34) {
						this.navigatePageDown();
						handled = true;
					} else if (e.which === 33) {
						this.navigatePageUp();
						handled = true;
					} else if (e.which === 37) {
						handled = this.navigateLeft();
					} else if (e.which === 39) {
						handled = this.navigateRight();
					} else if (e.which === 38) {
						handled = this.navigateUp();
					} else if (e.which === 40) {
						handled = this.navigateDown();
					} else if (e.which === 9) {
						handled = this.navigateNext();
					} else if (e.which === 13) {
						if (this._options.editable) {
							if (this._currentEditor) {
								// adding new row
								if (this._activeRow === this.getDataLength()) {
									this.navigateDown();
								} else {
									this._commitEditAndSetFocus();
								}
							} else {
								if (this.getEditorLock().commitCurrentEdit()) {
									this.editActiveCell();
								}
							}
						}

						handled = true;
					}
				} else if (e.which === 9 && e.shiftKey && !e.ctrlKey && !e.altKey) {
					handled = this.navigatePrev();
				}
			}

			if (handled) {
				// the event has been handled so don't let parent element (bubbling/propagation) or browser (default) handle it
				e.stopPropagation();
				e.preventDefault();
				try {
					e.keyCode = 0; // prevent default behaviour for special keys in IE browsers (F3, F5, etc.)
				}

				// ignore exceptions - setting the original event's keycode throws access denied exception for 'Ctrl'
				// (hitting control key only, nothing else), 'Shift' (maybe others)
				catch (error) {}
			}
		};

		Grid.prototype._handleClick = function _handleClick(e) {
			if (!this._currentEditor) {
				// if this click resulted in some cell child node getting focus,
				// don't steal it back - keyboard events will still bubble up
				// IE9+ seems to default DIVs to tabIndex=0 instead of -1, so check for cell clicks directly.
				if (e.target !== document.activeElement || e.target.classList.contains('spark-cell')) {
					this.focus();
				}
			}

			var cell = this.getCellFromEvent(e);
			if (!cell || this._currentEditor !== null && this._activeRow === cell.row && this._activeCell === cell.cell) {
				return;
			}

			if (!this._trigger('onClick', { row: cell.row, cell: cell.cell }, e)) {
				return;
			}

			if ((this._activeCell !== cell.cell || this._activeRow !== cell.row) && this.canCellBeActive(cell.row, cell.cell)) {
				if (!this.getEditorLock().isActive() || this.getEditorLock().commitCurrentEdit()) {
					this.scrollRowIntoView(cell.row, false);
					this._setActiveCellInternal(this.getCellNode(cell.row, cell.cell));
				}
			}
		};

		Grid.prototype._handleContextMenu = function _handleContextMenu(e) {
			var cell = _utilMisc.closest(e.target, '.spark-cell');
			if (!cell) {
				return;
			}

			// are we editing this cell?
			if (this._activeCellNode === cell && this._currentEditor !== null) {
				return;
			}

			this._trigger('onContextMenu', {}, e);
		};

		Grid.prototype._handleDblClick = function _handleDblClick(e) {
			var cell = this.getCellFromEvent(e);
			if (!cell || this._currentEditor !== null && this._activeRow === cell.row && this._activeCell === cell.cell) {
				return;
			}

			this._trigger('onDblClick', { row: cell.row, cell: cell.cell }, e);

			if (this._options.editable) {
				this.gotoCell(cell.row, cell.cell, true);
			}
		};

		Grid.prototype._handleHeaderMouseEnter = function _handleHeaderMouseEnter(e) {
			this._trigger('onHeaderMouseEnter', {
				column: e.target.dataset.column
			}, e);
		};

		Grid.prototype._handleHeaderMouseLeave = function _handleHeaderMouseLeave(e) {
			this._trigger('onHeaderMouseLeave', {
				column: e.target.dataset.column
			}, e);
		};

		Grid.prototype._handleHeaderContextMenu = function _handleHeaderContextMenu(e) {
			var header = _utilMisc.closest(e.target, '.spark-header-column'),
			    column = header && this._columns[+header.dataset.columnIndex];
			this._trigger('onHeaderContextMenu', { column: column }, e);
		};

		Grid.prototype._handleHeaderClick = function _handleHeaderClick(e) {
			var header = _utilMisc.closest(e.target, '.spark-header-column'),
			    column = header && this._columns[+header.dataset.columnIndex];
			if (column) {
				this._trigger('onHeaderClick', { column: column }, e);
			}
		};

		Grid.prototype._handleMouseEnter = function _handleMouseEnter(e) {
			this._trigger('onMouseEnter', {}, e);
		};

		Grid.prototype._handleMouseLeave = function _handleMouseLeave(e) {
			this._trigger('onMouseLeave', {}, e);
		};

		Grid.prototype._cellExists = function _cellExists(row, cell) {
			return !(row < 0 || row >= this.getDataLength() || cell < 0 || cell >= this._columns.length);
		};

		Grid.prototype._getCellFromNode = function _getCellFromNode(cellNode) {
			// read column number from .l<columnNumber> CSS class
			var cls = /l\d+/.exec(cellNode.className);
			if (!cls) {
				throw new Error('getCellFromNode: cannot get cell - ' + cellNode.className);
			}

			return parseInt(cls[0].substr(1, cls[0].length - 1), 10);
		};

		Grid.prototype._getRowFromNode = function _getRowFromNode(rowNode) {
			for (var row in this._rowsCache) {
				if (this._rowsCache[row].rowNode === rowNode) {
					return row | 0;
				}
			}

			return null;
		};

		Grid.prototype._setActiveCellInternal = function _setActiveCellInternal(newCell, opt_editMode) {
			var _this4 = this;

			if (this._activeCellNode !== null) {
				this._makeActiveCellNormal();
				this._activeCellNode.classList.remove('active');
				if (this._rowsCache[this._activeRow]) {
					this._rowsCache[this._activeRow].rowNode.classList.remove('active');
				}
			}

			var activeCellChanged = this._activeCellNode !== newCell;
			this._activeCellNode = newCell;

			if (this._activeCellNode != null) {
				this._activeRow = this._getRowFromNode(this._activeCellNode.parentNode);
				this._activeCell = this._activePosX = this._getCellFromNode(this._activeCellNode);

				if (opt_editMode == null) {
					opt_editMode = this._activeRow === this.getDataLength() || this._options.autoEdit;
				}

				this._activeCellNode.classList.add('active');
				this._rowsCache[this._activeRow].rowNode.classList.add('active');

				if (this._options.editable && opt_editMode && this._isCellEditable(this._activeRow, this._activeCell)) {
					clearTimeout(this._h_editorLoader);

					if (this._options.asyncEditorLoading) {
						this._h_editorLoader = setTimeout(function () {
							_this4.editActiveCell();
						}, this._options.asyncEditorLoadDelay);
					} else {
						this.editActiveCell();
					}
				}
			} else {
				this._activeRow = this._activeCell = null;
			}

			if (activeCellChanged) {
				this._trigger('onActiveCellChanged', this.getActiveCell());
			}
		};

		Grid.prototype._clearTextSelection = function _clearTextSelection() {
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
		};

		Grid.prototype._isCellEditable = function _isCellEditable(row, cell) {
			var dataLength = this.getDataLength();

			// is the data for this row loaded?
			if (row < dataLength && !this.getDataItem(row)) {
				return false;
			}

			// are we in the Add New row?  can we create new from this cell?
			if (this._columns[cell].cannotTriggerInsert && row >= dataLength) {
				return false;
			}

			// does this cell have an editor?
			return !!this._getEditor(row, cell);
		};

		Grid.prototype._makeActiveCellNormal = function _makeActiveCellNormal() {
			if (!this._currentEditor) {
				return;
			}

			this._trigger('onBeforeCellEditorDestroy', { editor: this._currentEditor });
			this._currentEditor.destroy();
			this._currentEditor = null;

			if (this._activeCellNode) {
				var d = this.getDataItem(this._activeRow);
				this._activeCellNode.classList.remove('editable', 'invalid');
				if (d) {
					var column = this._columns[this._activeCell],
					    formatter = this._getFormatter(this._activeRow, column);
					this._activeCellNode.innerHTML = formatter(this._activeRow, this._activeCell, this._getDataItemValueForColumn(d, column), column, d);
					this._invalidatePostProcessingResults(this._activeRow);
				}
			}

			// if there previously was text selected on a page (such as selected text in the edit cell just removed),
			// IE can't set focus to anything else correctly
			if (navigator.userAgent.toLowerCase().match(/msie/)) {
				this._clearTextSelection();
			}

			this.getEditorLock().deactivate(this._editController);
		};

		Grid.prototype._commitEditAndSetFocus = function _commitEditAndSetFocus() {
			// if the commit fails, it would do so due to a validation error
			// if so, do not steal the focus from the editor
			if (this.getEditorLock().commitCurrentEdit()) {
				this.focus();
				if (this._options.autoEdit) {
					this.navigateDown();
				}
			}
		};

		Grid.prototype._cancelEditAndSetFocus = function _cancelEditAndSetFocus() {
			if (this.getEditorLock().cancelCurrentEdit()) {
				this.focus();
			}
		};

		Grid.prototype._absBox = function _absBox(elem) {
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
			while ((elem = elem.parentNode) !== document.body) {
				if (box.visible && elem.scrollHeight !== elem.offsetHeight && elem.style.overflowY !== 'visible') {
					box.visible = box.bottom > elem.scrollTop && box.top < elem.scrollTop + elem.clientHeight;
				}

				if (box.visible && elem.scrollWidth !== elem.offsetWidth && elem.style.overflowX !== 'visible') {
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
		};

		Grid.prototype._handleActiveCellPositionChange = function _handleActiveCellPositionChange() {
			if (!this._activeCellNode) {
				return;
			}

			this._trigger('onActiveCellPositionChanged', {});

			if (this._currentEditor) {
				var cellBox = this.getActiveCellPosition();
				if (this._currentEditor.show && this._currentEditor.hide) {
					if (!cellBox.visible) {
						this._currentEditor.hide();
					} else {
						this._currentEditor.show();
					}
				}

				if (this._currentEditor.position) {
					this._currentEditor.position(cellBox);
				}
			}
		};

		Grid.prototype._scrollPage = function _scrollPage(dir) {
			var deltaRows = dir * this._numVisibleRows;
			this._scrollTo((this._getRowFromPosition(this._scrollTop) + deltaRows) * this._options.rowHeight);
			this.render();

			if (this._options.enableCellNavigation && this._activeRow != null) {
				var row = this._activeRow + deltaRows,
				    dataLengthIncludingAddNew = this._getDataLengthIncludingAddNew();
				if (row >= dataLengthIncludingAddNew) {
					row = dataLengthIncludingAddNew - 1;
				}

				if (row < 0) {
					row = 0;
				}

				var cell = 0,
				    prevCell = null,
				    prevActivePosX = this._activePosX;
				while (cell <= this._activePosX) {
					if (this.canCellBeActive(row, cell)) {
						prevCell = cell;
					}

					cell += this._getColspan(row, cell);
				}

				if (prevCell !== null) {
					this._setActiveCellInternal(this.getCellNode(row, prevCell));
					this._activePosX = prevActivePosX;
				} else {
					this.resetActiveCell();
				}
			}
		};

		Grid.prototype._getColspan = function _getColspan(row, cell) {
			var metadata = this._data.getItemMetadata && this._data.getItemMetadata(row);
			if (!metadata || !metadata.columns) {
				return 1;
			}

			var columnData = metadata.columns[this._columns[cell].id] || metadata.columns[cell],
			    colspan = columnData && columnData.colspan;
			if (colspan === '*') {
				colspan = this._columns.length - cell;
			} else {
				colspan = colspan || 1;
			}

			return colspan;
		};

		Grid.prototype._findFirstFocusableCell = function _findFirstFocusableCell(row) {
			var cell = 0;
			while (cell < this._columns.length) {
				if (this.canCellBeActive(row, cell)) {
					return cell;
				}

				cell += this._getColspan(row, cell);
			}

			return null;
		};

		Grid.prototype._findLastFocusableCell = function _findLastFocusableCell(row) {
			var cell = 0,
			    lastFocusableCell = null;
			while (cell < this._columns.length) {
				if (this.canCellBeActive(row, cell)) {
					lastFocusableCell = cell;
				}

				cell += this._getColspan(row, cell);
			}

			return lastFocusableCell;
		};

		Grid.prototype._gotoRight = function _gotoRight(row, cell, posX) {
			if (cell >= this._columns.length) {
				return null;
			}

			do {
				cell += this._getColspan(row, cell);
			} while (cell < this._columns.length && !this.canCellBeActive(row, cell));

			if (cell < this._columns.length) {
				return {
					row: row,
					cell: cell,
					posX: posX
				};
			}

			return null;
		};

		Grid.prototype._gotoLeft = function _gotoLeft(row, cell, posX) {
			if (cell <= 0) {
				return null;
			}

			var firstFocusableCell = this._findFirstFocusableCell(row);
			if (firstFocusableCell === null || firstFocusableCell >= cell) {
				return null;
			}

			var prev = {
				row: row,
				cell: firstFocusableCell,
				posX: firstFocusableCell
			},
			    pos = undefined;
			while (true) {
				pos = this._gotoRight(prev.row, prev.cell, prev.posX);
				if (!pos) {
					return null;
				}

				if (pos.cell >= cell) {
					return prev;
				}

				prev = pos;
			}
		};

		Grid.prototype._gotoDown = function _gotoDown(row, cell, posX) {
			var prevCell = undefined,
			    dataLengthIncludingAddNew = this._getDataLengthIncludingAddNew();
			while (true) {
				if (++row >= dataLengthIncludingAddNew) {
					return null;
				}

				prevCell = cell = 0;
				while (cell <= posX) {
					prevCell = cell;
					cell += this._getColspan(row, cell);
				}

				if (this.canCellBeActive(row, prevCell)) {
					return {
						row: row,
						cell: prevCell,
						posX: posX
					};
				}
			}
		};

		Grid.prototype._gotoUp = function _gotoUp(row, cell, posX) {
			var prevCell = undefined;
			while (true) {
				if (--row < 0) {
					return null;
				}

				prevCell = cell = 0;
				while (cell <= posX) {
					prevCell = cell;
					cell += this._getColspan(row, cell);
				}

				if (this.canCellBeActive(row, prevCell)) {
					return {
						row: row,
						cell: prevCell,
						posX: posX
					};
				}
			}
		};

		Grid.prototype._gotoNext = function _gotoNext(row, cell, posX) {
			if (row == null && cell == null) {
				row = cell = posX = 0;
				if (this.canCellBeActive(row, cell)) {
					return {
						row: row,
						cell: cell,
						posX: cell
					};
				}
			}

			var pos = this._gotoRight(row, cell, posX);
			if (pos) {
				return pos;
			}

			var firstFocusableCell = null,
			    dataLengthIncludingAddNew = this._getDataLengthIncludingAddNew();
			while (++row < dataLengthIncludingAddNew) {
				firstFocusableCell = this._findFirstFocusableCell(row);
				if (firstFocusableCell !== null) {
					return {
						row: row,
						cell: firstFocusableCell,
						posX: firstFocusableCell
					};
				}
			}

			return null;
		};

		Grid.prototype._gotoPrev = function _gotoPrev(row, cell, posX) {
			if (row == null && cell == null) {
				row = this._getDataLengthIncludingAddNew() - 1;
				cell = posX = this._columns.length - 1;
				if (this.canCellBeActive(row, cell)) {
					return {
						row: row,
						cell: cell,
						posX: cell
					};
				}
			}

			var pos = undefined;
			while (!pos) {
				pos = this._gotoLeft(row, cell, posX);
				if (pos) {
					break;
				}

				if (--row < 0) {
					return null;
				}

				cell = 0;
				var lastSelectableCell = this._findLastFocusableCell(row);
				if (lastSelectableCell !== null) {
					pos = {
						row: row,
						cell: lastSelectableCell,
						posX: lastSelectableCell
					};
				}
			}

			return pos;
		};

		Grid.prototype._navigate = function _navigate(dir) {
			if (!this._options.enableCellNavigation) {
				return false;
			}

			if (!this._activeCellNode && dir !== 'prev' && dir !== 'next') {
				return false;
			}

			if (!this.getEditorLock().commitCurrentEdit()) {
				return true;
			}

			this.focus();

			var tabbingDirections = {
				up: -1,
				down: 1,
				left: -1,
				right: 1,
				prev: -1,
				next: 1
			};
			this._tabbingDirection = tabbingDirections[dir];

			var stepFunctions = {
				up: this._gotoUp.bind(this),
				down: this._gotoDown.bind(this),
				left: this._gotoLeft.bind(this),
				right: this._gotoRight.bind(this),
				prev: this._gotoPrev.bind(this),
				next: this._gotoNext.bind(this)
			},
			    stepFn = stepFunctions[dir],
			    pos = stepFn(this._activeRow, this._activeCell, this._activePosX);
			if (pos) {
				var isAddNewRow = pos.row === this.getDataLength();
				this.scrollCellIntoView(pos.row, pos.cell, !isAddNewRow);
				this._setActiveCellInternal(this.getCellNode(pos.row, pos.cell));
				this._activePosX = pos.posX;
				return true;
			} else {
				this._setActiveCellInternal(this.getCellNode(this._activeRow, this._activeCell));
				return false;
			}
		};

		Grid.prototype._commitCurrentEdit = function _commitCurrentEdit() {
			var _this5 = this;

			var item = this.getDataItem(this._activeRow),
			    column = this._columns[this._activeCell],
			    me = this;

			if (this._currentEditor) {
				if (this._currentEditor.isValueChanged()) {
					var validationResults = this._currentEditor.validate();

					if (validationResults.valid) {
						if (this._activeRow < this.getDataLength()) {
							(function () {
								var value = _this5._currentEditor.serializeValue(),
								    editCommand = {
									row: _this5._activeRow,
									cell: _this5._activeCell,
									editor: _this5._currentEditor,
									serializedValue: _this5._currentEditor.serializeValue(),
									prevSerializedValue: _this5._serializedEditorValue,
									execute: function execute() {
										this.editor.applyValue(item, this.serializedValue);
										me.updateRow(this.row);
										me._trigger('onCellChange', {
											row: this._activeRow,
											cell: this._activeCell,
											item: item,
											value: value,
											prevValue: this._serializedEditorValue,
											column: column
										});
									},
									undo: function undo() {
										this.editor.applyValue(item, this.prevSerializedValue);
										me.updateRow(this.row);
										me._trigger('onCellChange', {
											row: this._activeRow,
											cell: this._activeCell,
											item: item,
											value: value,
											prevValue: this._serializedEditorValue,
											column: column
										});
									}
								};

								if (_this5._options.editCommandHandler) {
									_this5._makeActiveCellNormal();
									_this5._options.editCommandHandler(item, column, editCommand);
								} else {
									editCommand.execute();
									_this5._makeActiveCellNormal();
								}
							})();
						} else {
							var newItem = {};
							this._currentEditor.applyValue(newItem, this._currentEditor.serializeValue());
							this._makeActiveCellNormal();
							this._trigger('onAddNewRow', { item: newItem, column: column });
						}

						// check whether the lock has been re-acquired by event handlers
						return !this.getEditorLock().isActive();
					} else {
						// Re-add the CSS class to trigger transitions, if any.
						this._activeCellNode.classList.remove('invalid');
						/*jshint -W030 */
						this._activeCellNode.clientWidth; // force layout
						/*jshint +W030 */
						this._activeCellNode.classList.add('invalid');

						this._trigger('onValidationError', {
							editor: this._currentEditor,
							cellNode: this._activeCellNode,
							validationResults: validationResults,
							row: this._activeRow,
							cell: this._activeCell,
							column: column
						});

						this._currentEditor.focus();
						return false;
					}
				}

				this._makeActiveCellNormal();
			}

			return true;
		};

		Grid.prototype._cancelCurrentEdit = function _cancelCurrentEdit() {
			this._makeActiveCellNormal();
			return true;
		};

		Grid.prototype._rowsToRanges = function _rowsToRanges(rows) {
			var ranges = [],
			    lastCell = this._columns.length - 1;
			for (var i = 0; i < rows.length; i++) {
				ranges.push(new _Range(rows[i], 0, rows[i], lastCell));
			}

			return ranges;
		};

		/**
   * Add the grid to DOM and initialize all data
   * @method init
   */

		Grid.prototype.init = function init() {
			var container = this._container,
			    canvas = this._canvas;

			// Block users from annoying mistake
			if (this._initialized) {
				throw new Error('Grid is already initialized');
			}

			this._initialized = true;

			var computedStyle = window.getComputedStyle(container);
			this._viewportW = parseFloat(computedStyle.width);

			if (!this._options.enableTextSelectionOnCells) {
				// disable text selection in grid cells except in input and textarea elements
				// (this is IE-specific, because selectstart event will only fire in IE)
				this._viewport.addEventListener('selectstart.ui', function (event) {
					return !! ~'input,textarea'.indexOf(event.target.tagName.toLowerCase());
				});
			}

			this._updateColumnSizeInfo();
			this._createColumnHeaders();
			this._setupColumnSort();
			this._createCssRules();
			this.resizeCanvas();
			this._bindAncestorScrollEvents();

			container.addEventListener('resize.sparkgrid', this.resizeCanvas.bind(this));
			this._viewport.addEventListener('scroll', this._handleScroll.bind(this));
			this._viewport.addEventListener('click', this._handleClick.bind(this));
			this._headerScroller.addEventListener('contextmenu', this._handleHeaderContextMenu.bind(this));
			this._headerScroller.addEventListener('click', this._handleHeaderClick.bind(this));
			_utilMisc.delegate(this._headerScroller, 'mouseover', '.spark-header-column', this._handleHeaderMouseEnter.bind(this));
			_utilMisc.delegate(this._headerScroller, 'mouseout', '.spark-header-column', this._handleHeaderMouseLeave.bind(this));
			this._headerRowScroller.addEventListener('scroll', this._handleHeaderRowScroll.bind(this));

			this._focusSink.addEventListener('keydown', this._handleKeyDown.bind(this));
			this._focusSink2.addEventListener('keydown', this._handleKeyDown.bind(this));

			canvas.addEventListener('keydown', this._handleKeyDown.bind(this));
			canvas.addEventListener('dblclick', this._handleDblClick.bind(this));
			canvas.addEventListener('contextmenu', this._handleContextMenu.bind(this));
			canvas.addEventListener('draginit', this._handleDragInit.bind(this));
			canvas.addEventListener('dragstart', this._handleDragStart.bind(this)); // {distance: 3}
			canvas.addEventListener('drag', this._handleDrag.bind(this));
			canvas.addEventListener('dragend', this._handleDragEnd.bind(this));

			_utilMisc.delegate(canvas, 'mouseover', '.spark-cell', this._handleMouseEnter.bind(this));
			_utilMisc.delegate(canvas, 'mouseout', '.spark-cell', this._handleMouseLeave.bind(this));

			// Work around http://crbug.com/312427.
			if (navigator.userAgent.toLowerCase().match(/webkit/) && navigator.userAgent.toLowerCase().match(/macintosh/)) {
				canvas.addEventListener('mousewheel', this._handleMouseWheel.bind(this));
			}
		};

		/**
   * Register a plugin to add additional functionality to the grid
   * @method registerPlugin
   * @param {Object} plugin
   */

		Grid.prototype.registerPlugin = function registerPlugin(plugin) {
			this._plugins.unshift(plugin);
			plugin.init(this);
		};

		/**
   * Remove plugin functionality from the grid
   * @method unregisterPlugin
   * @param {Object} plugin
   */

		Grid.prototype.unregisterPlugin = function unregisterPlugin(plugin) {
			var index = this._plugins.indexOf(plugin);
			if (~index) {
				if (this._plugins[index].destroy) {
					this._plugins[index].destroy();
				}

				this._plugins.splice(index, 1);
			}
		};

		/**
   * Get columns visible on grid
   * @method getColumns
   * @returns {Array}
   */

		Grid.prototype.getColumns = function getColumns() {
			return this._columns;
		};

		/**
   * Override existing columns with new columns
   * @method setColumns
   * @param {Array} columns
   */

		Grid.prototype.setColumns = function setColumns(columns) {
			this._updateColumnCache(columns);
			this._updateColumnSizeInfo();

			if (this._initialized) {
				this.invalidateAllRows();
				this._createColumnHeaders();
				this._removeCssRules();
				this._createCssRules();
				this.resizeCanvas();
				this._applyColumnWidths();
				this._handleScroll();
			}
		};

		/**
   * Get the index of a column ID
   * @param {string} id
   * @returns {number}
   */

		Grid.prototype.getColumnIndex = function getColumnIndex(id) {
			return this._columnsById[id];
		};

		/**
   * Update a column header with title and tooltip
   * @param {string} columnId
   * @param {string} title
   * @param {string} toolTip
   */

		Grid.prototype.updateColumnHeader = function updateColumnHeader(columnId, title, toolTip) {
			if (!this._initialized) {
				return;
			}
			var idx = this.getColumnIndex(columnId);
			if (idx == null) {
				return;
			}

			var columnDef = this._columns[idx],
			    header = this._headers.children[idx];

			if (header) {
				if (title !== undefined) {
					this._columns[idx].name = title;
				}
				if (toolTip !== undefined) {
					this._columns[idx].toolTip = toolTip;
				}

				this._trigger('onBeforeHeaderCellDestroy', {
					node: header[0],
					column: columnDef
				});

				header.setAttribute('title', toolTip || '');
				header.children[0].innerHTML = title;

				this._trigger('onHeaderCellRendered', {
					node: header,
					column: columnDef
				});
			}
		};

		/**
   * Set the sort by column and sort direction
   * @method setSortColumn
   * @param {string} columnId
   * @param {boolean} ascending
   */

		Grid.prototype.setSortColumn = function setSortColumn(columnId, ascending) {
			this.setSortColumns([{
				columnId: columnId,
				sortAsc: ascending
			}]);
		};

		/**
   * Set multiple sort columns
   * @method setSortColumns
   * @param {Array} cols
   */

		Grid.prototype.setSortColumns = function setSortColumns(cols) {
			var i = undefined,
			    len = undefined,
			    j = undefined,
			    el = undefined,
			    sEl = undefined,
			    sortEls = undefined,
			    sortInds = undefined,
			    indEl = undefined;
			this._sortColumns = cols;

			var headerColumnEls = _utilMisc.slice(this._headers.children);

			i = 0;
			len = headerColumnEls.length;
			for (; i < len; i++) {
				el = headerColumnEls[i];
				el.classList.remove('spark-header-column-sorted');
				sortEls = _utilMisc.slice(el.querySelectorAll('.spark-sort-indicator'));

				j = 0;
				len = sortEls.length;
				for (; j < len; j++) {
					sEl = sortEls[j];
					sEl.classList.remove('spark-sort-indicator-asc', 'spark-sort-indicator-desc');
				}
			}

			i = 0;
			len = this._sortColumns.length;
			for (; i < len; i++) {
				var col = this._sortColumns[i];
				if (col.sortAsc == null) {
					col.sortAsc = true;
				}

				var columnIndex = this.getColumnIndex(col.columnId);
				if (columnIndex != null) {
					headerColumnEls[columnIndex].classList.add('spark-header-column-sorted');
					sortInds = headerColumnEls[columnIndex].querySelectorAll('.spark-sort-indicator');

					j = 0;
					len = sortInds.length;
					for (; j < len; j++) {
						indEl = sortInds[j];
						indEl.classList.add(col.sortAsc ? 'spark-sort-indicator-asc' : 'spark-sort-indicator-desc');
					}
				}
			}
		};

		/**
   * Get the sort columns
   * @method getSortColumns
   * @returns {Array}
   */

		Grid.prototype.getSortColumns = function getSortColumns() {
			return this._sortColumns;
		};

		/**
   * Autosize columns to fill the available width
   * @method autosizeColumns
   */

		Grid.prototype.autosizeColumns = function autosizeColumns() {
			var i = undefined,
			    c = undefined,
			    widths = [],
			    shrinkLeeway = 0,
			    total = 0,
			    prevTotal = undefined,
			    availWidth = this._viewportHasVScroll ? this._viewportW - scrollbarDimensions.width : this._viewportW;

			for (i = 0; i < this._columns.length; i++) {
				c = this._columns[i];
				widths.push(c.width);
				total += c.width;
				if (c.resizable) {
					shrinkLeeway += c.width - c.minWidth;
				}
			}

			// shrink
			prevTotal = total;
			while (total > availWidth && shrinkLeeway) {
				var shrinkProportion = (total - availWidth) / shrinkLeeway;
				for (i = 0; i < this._columns.length && total > availWidth; i++) {
					c = this._columns[i];
					var width = widths[i];
					if (!c.resizable || width <= c.minWidth) {
						continue;
					}

					var absMinWidth = c.minWidth,
					    shrinkSize = Math.floor(shrinkProportion * (width - absMinWidth)) || 1;
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
				for (i = 0; i < this._columns.length && total < availWidth; i++) {
					c = this._columns[i];
					var currentWidth = widths[i],
					    growSize = undefined;

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
			for (i = 0; i < this._columns.length; i++) {
				if (this._columns[i].rerenderOnResize && this._columns[i].width !== widths[i]) {
					reRender = true;
				}

				this._columns[i].width = widths[i];
			}

			this._applyColumnHeaderWidths();
			this._updateCanvasWidth(true);
			if (reRender) {
				this.invalidateAllRows();
				this.render();
			}
		};

		/**
   * Get all options
   * @method getOptions
   * @returns {Object}
   */

		Grid.prototype.getOptions = function getOptions() {
			return this._options;
		};

		/**
   * Update grid options
   * @method setOptions
   * @param {Object} options
   */

		Grid.prototype.setOptions = function setOptions(options) {
			if (!this.getEditorLock().commitCurrentEdit()) {
				return;
			}

			this._makeActiveCellNormal();

			if (this._options.enableAddRow !== this._options.enableAddRow) {
				this.invalidateRow(this.getDataLength());
			}

			this._options = _utilMisc.extend(this._options, options);

			this._viewport.style.overflowY = this._options.autoHeight ? 'hidden' : 'auto';
			this.render();
		};

		/**
   * Get the data
   * @method getData
   * @returns {Object}
   */

		Grid.prototype.getData = function getData() {
			return this._data;
		};

		/**
   * Get the length of the data
   * @method getDataLength
   * @returns {number}
   */

		Grid.prototype.getDataLength = function getDataLength() {
			if (this._data.getLength) {
				return this._data.getLength();
			} else {
				return this._data.length;
			}
		};

		/**
   * Get data item by index
   * @method getDataItem
   * @param {number} index
   * @returns {Object}
   */

		Grid.prototype.getDataItem = function getDataItem(index) {
			if (this._data.getItem) {
				return this._data.getItem(index);
			} else {
				return this._data[index];
			}
		};

		/**
   * Overwrite data
   * @method setData
   * @param {Object} newData
   * @param {boolean} scrollToTop
   */

		Grid.prototype.setData = function setData(newData, scrollToTop) {
			this._data = newData;
			this.invalidateAllRows();
			this.updateRowCount();
			if (scrollToTop) {
				this._scrollTo(0);
			}
		};

		/**
   * Get selection model plugin
   * @method getSelectionModel
   * @returns {Object}
   */

		Grid.prototype.getSelectionModel = function getSelectionModel() {
			return this._selectionModel;
		};

		/**
   * Set selection model plugin for row & cell selection
   * @method setSelectionModel
   * @param {Object} model
   */

		Grid.prototype.setSelectionModel = function setSelectionModel(model) {
			if (!this._boundHandleSelectedRangesChanged) {
				this._boundHandleSelectedRangesChanged = this._handleSelectedRangesChanged.bind(this);
			}

			if (this._selectionModel) {
				this._selectionModel.onSelectedRangesChanged.unsubscribe(this._boundHandleSelectedRangesChanged);
				if (this._selectionModel.destroy) {
					this._selectionModel.destroy();
				}
			}

			this._selectionModel = model;
			if (this._selectionModel) {
				this._selectionModel.init(this);
				this._selectionModel.onSelectedRangesChanged.subscribe(this._boundHandleSelectedRangesChanged);
			}
		};

		/**
   * Get the selected rows in the grid
   * @returns {Array<number>}
   */

		Grid.prototype.getSelectedRows = function getSelectedRows() {
			if (!this._selectionModel) {
				throw new Error('Selection model is not set');
			}

			return this._selectedRows;
		};

		/**
   * Set the selected rows in the grid
   * @param {Array<number>} rows
   */

		Grid.prototype.setSelectedRows = function setSelectedRows(rows) {
			if (!this._selectionModel) {
				throw new Error('Selection model is not set');
			}

			this._selectionModel.setSelectedRanges(this._rowsToRanges(rows));
		};

		/**
   * Get the main grid element
   * @method getContainerNode
   * @returns {HTMLElement}
   */

		Grid.prototype.getContainerNode = function getContainerNode() {
			return this._container;
		};

		/**
   * Render the grid. Normally called after some invalidation.
   * @method render
   */

		Grid.prototype.render = function render() {
			if (!this._initialized) {
				return;
			}

			var vRange = this.getViewport(),
			    rRange = this.getRenderedRange();

			// remove rows no longer in the viewport
			this._cleanupRows(rRange);

			// add new rows & missing cells in existing rows
			if (this._lastRenderedScrollLeft !== this._scrollLeft) {
				this._cleanUpAndRenderCells(rRange);
			}

			// render missing rows
			this._renderRows(rRange);

			this._postProcessFromRow = vRange.top;
			this._postProcessToRow = Math.min(this._getDataLengthIncludingAddNew() - 1, vRange.bottom);
			this._startPostProcessing();

			this._lastRenderedScrollTop = this._scrollTop;
			this._lastRenderedScrollLeft = this._scrollLeft;
			this._h_render = null;
		};

		/**
   * Invalidate all rows and rerender the grid
   * @method invalidate
   */

		Grid.prototype.invalidate = function invalidate() {
			this.updateRowCount();
			this.invalidateAllRows();
			this.render();
		};

		/**
   * Invalidate single row
   * @param {number} row
   */

		Grid.prototype.invalidateRow = function invalidateRow(row) {
			return this.invalidateRows([row]);
		};

		/**
   * Invalidate specific rows
   * @method invalidateAllRows
   * @param {Array} rows
   */

		Grid.prototype.invalidateRows = function invalidateRows(rows) {
			if (!Array.isArray(rows)) {
				rows = [rows];
			}

			this._vScrollDir = 0;
			for (var i = 0, rl = rows.length; i < rl; i++) {
				if (this._currentEditor && this._activeRow === rows[i]) {
					this._makeActiveCellNormal();
				}

				if (this._rowsCache[rows[i]]) {
					this._removeRowFromCache(rows[i]);
				}
			}
		};

		/**
   * Invalidate all rows in the grid
   * @method invalidateAllRows
   */

		Grid.prototype.invalidateAllRows = function invalidateAllRows() {
			if (this._currentEditor) {
				this._makeActiveCellNormal();
			}

			for (var row in this._rowsCache) {
				this._removeRowFromCache(row);
			}
		};

		/**
   * Update a specific cell by row and column
   * @method updateCell
   * @param {number} row
   * @param {number} cell
   */

		Grid.prototype.updateCell = function updateCell(row, cell) {
			var cellNode = this.getCellNode(row, cell);
			if (!cellNode) {
				return;
			}

			var m = this._columns[cell],
			    d = this.getDataItem(row);
			if (this._currentEditor && this._activeRow === row && this._activeCell === cell) {
				this._currentEditor.loadValue(d);
			} else {
				cellNode.innerHTML = d ? this._getFormatter(row, m)(row, cell, this._getDataItemValueForColumn(d, m), m, d) : '';
				this._invalidatePostProcessingResults(row);
			}
		};

		/**
   * Update a row by row number
   * @method updateRow
   * @param {number} row
   */

		Grid.prototype.updateRow = function updateRow(row) {
			var cacheEntry = this._rowsCache[row];
			if (!cacheEntry) {
				return;
			}

			this._ensureCellNodesInRowsCache(row);

			var d = this.getDataItem(row);

			for (var columnIdx in cacheEntry.cellNodesByColumnIdx) {
				if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(columnIdx)) {
					continue;
				}

				columnIdx = columnIdx | 0;
				var m = this._columns[columnIdx],
				    node = cacheEntry.cellNodesByColumnIdx[columnIdx];

				if (row === this._activeRow && columnIdx === this._activeCell && this._currentEditor) {
					this._currentEditor.loadValue(d);
				} else if (d) {
					node.innerHTML = this._getFormatter(row, m)(row, columnIdx, this._getDataItemValueForColumn(d, m), m, d);
				} else {
					node.innerHTML = '';
				}
			}

			this._invalidatePostProcessingResults(row);
		};

		/**
   * Get the visible cell information based on viewport
   * @method getViewport
   * @param {number} viewportTop
   * @param {number} viewportLeft
   * @returns {{top: number, bottom: number, leftPx: number, rightPx: number}}
   */

		Grid.prototype.getViewport = function getViewport() {
			var viewportTop = arguments[0] === undefined ? this._scrollTop : arguments[0];
			var viewportLeft = arguments[1] === undefined ? this._scrollLeft : arguments[1];

			return {
				top: this._getRowFromPosition(viewportTop),
				bottom: this._getRowFromPosition(viewportTop + this._viewportH) + 1,
				leftPx: viewportLeft,
				rightPx: viewportLeft + this._viewportW
			};
		};

		/**
   * Get the rendered range. Visible range plus any buffer
   * @method getRenderedRange
   * @param {number} viewportTop
   * @param {number} viewportLeft
   * @returns {{top: number, bottom: number, leftPx: number, rightPx: number}}
   */

		Grid.prototype.getRenderedRange = function getRenderedRange(viewportTop, viewportLeft) {
			var range = this.getViewport(viewportTop, viewportLeft),
			    buffer = Math.round(this._viewportH / this._options.rowHeight),
			    minBuffer = 3;

			if (this._vScrollDir === -1) {
				range.top -= buffer;
				range.bottom += minBuffer;
			} else if (this._vScrollDir === 1) {
				range.top -= minBuffer;
				range.bottom += buffer;
			} else {
				range.top -= minBuffer;
				range.bottom += minBuffer;
			}

			range.top = Math.max(0, range.top);
			range.bottom = Math.min(this._getDataLengthIncludingAddNew() - 1, range.bottom);

			range.leftPx -= this._viewportW;
			range.rightPx += this._viewportW;

			range.leftPx = Math.max(0, range.leftPx);
			range.rightPx = Math.min(this._canvasWidth, range.rightPx);

			return range;
		};

		/**
   * Resize canvas. Normally done when the grid is resized
   * @method resizeCanvas
   */

		Grid.prototype.resizeCanvas = function resizeCanvas() {
			if (!this._initialized) {
				return;
			}

			if (this._options.autoHeight) {
				this._viewportH = this._options.rowHeight * this._getDataLengthIncludingAddNew();
			} else {
				this._viewportH = this._getViewportHeight();
			}

			this._numVisibleRows = Math.ceil(this._viewportH / this._options.rowHeight);
			this._viewportW = this._container.clientWidth;
			if (!this._options.autoHeight) {
				_utilMisc.setPx(this._viewport, 'height', this._viewportH);
			}

			if (this._options.forceFitColumns) {
				this.autosizeColumns();
			}

			this.updateRowCount();
			this._handleScroll();

			// Since the width has changed, force the render() to reevaluate virtually rendered cells.
			this._lastRenderedScrollLeft = -1;
			this.render();
		};

		/**
   * Update the row count when the data length changes
   * @method updateRowCount
   */

		Grid.prototype.updateRowCount = function updateRowCount() {
			if (!this._initialized) {
				return;
			}

			var dataLengthIncludingAddNew = this._getDataLengthIncludingAddNew(),
			    numberOfRows = dataLengthIncludingAddNew + (this._options.leaveSpaceForNewRows ? this._numVisibleRows - 1 : 0),
			    oldViewportHasVScroll = this._viewportHasVScroll;

			// with autoHeight, we do not need to accommodate the vertical scroll bar
			this._viewportHasVScroll = !this._options.autoHeight && numberOfRows * this._options.rowHeight > this._viewportH;

			this._makeActiveCellNormal();

			// remove the rows that are now outside of the data range
			// this helps avoid redundant calls to .removeRow() when the size of the data decreased by thousands of rows
			var l = dataLengthIncludingAddNew - 1;
			for (var i in this._rowsCache) {
				if (i >= l) {
					this._removeRowFromCache(i);
				}
			}

			if (this._activeCellNode && this._activeRow > l) {
				this.resetActiveCell();
			}

			var oldH = this._h;
			this._th = Math.max(this._options.rowHeight * numberOfRows, this._viewportH - scrollbarDimensions.height);
			if (this._th < maxSupportedCssHeight) {
				// just one page
				this._h = this._ph = this._th;
				this._n = 1;
				this._cj = 0;
			} else {
				// break into pages
				this._h = maxSupportedCssHeight;
				this._ph = this._h / 100;
				this._n = Math.floor(this._th / this._ph);
				this._cj = (this._th - this._h) / (this._n - 1);
			}

			if (this._h !== oldH) {
				_utilMisc.setPx(this._canvas, 'height', this._h);
				this._scrollTop = this._viewport.scrollTop;
			}

			var oldScrollTopInRange = this._scrollTop + this._offset <= this._th - this._viewportH;

			if (this._th === 0 || this._scrollTop === 0) {
				this._page = this._offset = 0;
			} else if (oldScrollTopInRange) {
				// maintain virtual position
				this._scrollTo(this._scrollTop + this._offset);
			} else {
				// scroll to bottom
				this._scrollTo(this._th - this._viewportH);
			}

			if (this._h !== oldH && this._options.autoHeight) {
				this.resizeCanvas();
			}

			if (this._options.forceFitColumns && oldViewportHasVScroll !== this._viewportHasVScroll) {
				this.autosizeColumns();
			}

			this._updateCanvasWidth(false);
		};

		/**
   * Sroll a row into view
   * @param {number} row
   * @param {boolean} doPaging Go to the next page if necessary
   */

		Grid.prototype.scrollRowIntoView = function scrollRowIntoView(row, doPaging) {
			var rowAtTop = row * this._options.rowHeight,
			    rowAtBottom = (row + 1) * this._options.rowHeight - this._viewportH + (this._viewportHasHScroll ? scrollbarDimensions.height : 0);

			// need to page down?
			if ((row + 1) * this._options.rowHeight > this._scrollTop + this._viewportH + this._offset) {
				this._scrollTo(doPaging ? rowAtTop : rowAtBottom);
				this.render();
			}

			// or page up?
			else if (row * this._options.rowHeight < this._scrollTop + this._offset) {
				this._scrollTo(doPaging ? rowAtBottom : rowAtTop);
				this.render();
			}
		};

		/**
   * Scroll a row to the top of the grid
   * @param {number} row
   */

		Grid.prototype.scrollRowToTop = function scrollRowToTop(row) {
			this._scrollTo(row * this._options.rowHeight);
			this.render();
		};

		/**
   * Scroll a specific cell info view and render
   * @param {number} row
   * @param {number} cell
   * @param {boolean} doPaging
   */

		Grid.prototype.scrollCellIntoView = function scrollCellIntoView(row, cell, doPaging) {
			this.scrollRowIntoView(row, doPaging);

			var colspan = this._getColspan(row, cell),
			    left = this._columnPosLeft[cell],
			    right = this._columnPosRight[cell + (colspan > 1 ? colspan - 1 : 0)],
			    scrollRight = this._scrollLeft + this._viewportW;

			if (left < this._scrollLeft) {
				this._viewport.scrollLeft = left;
				this._handleScroll();
				this.render();
			} else if (right > scrollRight) {
				this._viewport.scrollLeft = Math.min(left, right - this._viewport.clientWidth);
				this._handleScroll();
				this.render();
			}
		};

		/**
   * Get the grid canvas
   * @method getCanvasEl
   * @returns {HTMLElement}
   */

		Grid.prototype.getCanvasNode = function getCanvasNode() {
			return this._canvas;
		};

		/**
   * Focus the grid
   */

		Grid.prototype.focus = function focus() {
			if (this._tabbingDirection === -1) {
				this._focusSink.focus();
			} else {
				this._focusSink2.focus();
			}
		};

		/**
   * Get the cell at a specific x,y coordinate
   * @param {number} x
   * @param {number} y
   * @returns {{row: *, cell: number}}
   */

		Grid.prototype.getCellFromPoint = function getCellFromPoint(x, y) {
			var row = this._getRowFromPosition(y),
			    cell = 0,
			    w = 0;
			for (var i = 0; i < this._columns.length && w < x; i++) {
				w += this._columns[i].width;
				cell++;
			}

			if (cell < 0) {
				cell = 0;
			}

			return { row: row, cell: cell - 1 };
		};

		/**
   * Get the cell associate with an event
   * @param {Event} e
   * @returns {Object}
   */

		Grid.prototype.getCellFromEvent = function getCellFromEvent(e) {
			var cell = _utilMisc.closest(e.target, '.spark-cell');
			if (!cell) {
				return null;
			}

			var row = this._getRowFromNode(cell.parentNode);
			cell = this._getCellFromNode(cell);

			if (row == null || cell == null) {
				return null;
			} else {
				return {
					row: row,
					cell: cell
				};
			}
		};

		/**
   * Get the active cell element
   * @returns {null|{ row: number, cell: number }}
   */

		Grid.prototype.getActiveCell = function getActiveCell() {
			if (!this._activeCellNode) {
				return null;
			} else {
				return { row: this._activeRow, cell: this._activeCell };
			}
		};

		/**
   * Set the active cell by row and cell number
   * @param {number} row
   * @param {number} cell
   */

		Grid.prototype.setActiveCell = function setActiveCell(row, cell) {
			if (!this._initialized) {
				return;
			}

			if (row > this.getDataLength() || row < 0 || cell >= this._columns.length || cell < 0) {
				return;
			}

			if (!this._options.enableCellNavigation) {
				return;
			}

			this.scrollCellIntoView(row, cell, false);
			this._setActiveCellInternal(this.getCellNode(row, cell), false);
		};

		/**
   * Get the active cell HTMLElement
   * @returns {null|HTMLELement}
   */

		Grid.prototype.getActiveCellNode = function getActiveCellNode() {
			return this._activeCellNode;
		};

		/**
   * Get the coordinates of the active cell
   * @returns {*}
   */

		Grid.prototype.getActiveCellPosition = function getActiveCellPosition() {
			return this._absBox(this._activeCellNode);
		};

		/**
   * Reset/Clear the active cell
   */

		Grid.prototype.resetActiveCell = function resetActiveCell() {
			this._setActiveCellInternal(null, false);
		};

		/**
   * Edit the active cell with a specific editor class
   * @param {Editor} Editor
   */

		Grid.prototype.editActiveCell = function editActiveCell(Editor) {
			if (!this._activeCellNode) {
				return;
			}

			if (!this._options.editable) {
				throw new Error('Grid : makeActiveCellEditable : should never get called when options.editable is false');
			}

			// cancel pending async call if there is one
			clearTimeout(this._h_editorLoader);

			if (!this._isCellEditable(this._activeRow, this._activeCell)) {
				return;
			}

			var columnDef = this._columns[this._activeCell],
			    item = this.getDataItem(this._activeRow);

			if (!this._trigger('onBeforeEditCell', { row: this._activeRow, cell: this._activeCell, item: item, column: columnDef })) {
				this.focus();
				return;
			}

			this.getEditorLock().activate(this._editController);
			this._activeCellNode.classList.add('editable');

			// don't clear the cell if a custom editor is passed through
			if (!Editor) {
				this._activeCellNode.innerHTML = '';
			}

			var EditorClass = Editor || this._getEditor(this._activeRow, this._activeCell);

			this._currentEditor = new EditorClass({
				grid: this,
				gridPosition: this._absBox(this._container),
				position: this._absBox(this._activeCellNode),
				container: this._activeCellNode,
				column: columnDef,
				item: item || {},
				commitChanges: this._commitEditAndSetFocus.bind(this),
				cancelChanges: this._cancelEditAndSetFocus.bind(this)
			});

			if (item) {
				this._currentEditor.loadValue(item);
			}

			this._serializedEditorValue = this._currentEditor.serializeValue();

			if (this._currentEditor.position) {
				this._handleActiveCellPositionChange();
			}
		};

		/**
   * Get the current editor if there is one
   * @returns {null|Editor|*}
   */

		Grid.prototype.getCellEditor = function getCellEditor() {
			return this._currentEditor;
		};

		/**
   * Get the cell node at a row and cell number
   * @param {number} row
   * @param {number} cell
   * @returns {null|HTMLElement}
   */

		Grid.prototype.getCellNode = function getCellNode(row, cell) {
			if (this._rowsCache[row]) {
				this._ensureCellNodesInRowsCache(row);
				return this._rowsCache[row].cellNodesByColumnIdx[cell];
			}

			return null;
		};

		/**
   * Get the node from row and cell
   * @param {number} row
   * @param {number} cell
   * @returns {{
   * 	top: number,
   * 	left: number,
   * 	bottom: number,
   * 	right: number
   * }}
   */

		Grid.prototype.getCellNodeBox = function getCellNodeBox(row, cell) {
			if (!this._cellExists(row, cell)) {
				return null;
			}

			var y1 = this._getRowTop(row),
			    y2 = y1 + this._options.rowHeight - 1,
			    x1 = 0;
			for (var i = 0; i < cell; i++) {
				x1 += this._columns[i].width;
			}

			var x2 = x1 + this._columns[cell].width;

			return {
				top: y1,
				left: x1,
				bottom: y2,
				right: x2
			};
		};

		/**
   * Can the row and celll number be selected
   * @param {number} row
   * @param {number} cell
   * @returns {boolean}
   */

		Grid.prototype.canCellBeSelected = function canCellBeSelected(row, cell) {
			if (row >= this.getDataLength() || row < 0 || cell >= this._columns.length || cell < 0) {
				return false;
			}

			var rowMetadata = this._data.getItemMetadata && this._data.getItemMetadata(row);
			if (rowMetadata && typeof rowMetadata.selectable === 'boolean') {
				return rowMetadata.selectable;
			}

			var columnMetadata = rowMetadata && rowMetadata.columns && (rowMetadata.columns[this._columns[cell].id] || rowMetadata.columns[cell]);
			if (columnMetadata && typeof columnMetadata.selectable === 'boolean') {
				return columnMetadata.selectable;
			}

			return this._columns[cell].selectable;
		};

		/**
   * Check if the cell can be active at row and cell number
   * @param {number} row
   * @param {number} cell
   * @returns {boolean}
   */

		Grid.prototype.canCellBeActive = function canCellBeActive(row, cell) {
			if (!this._options.enableCellNavigation || row >= this._getDataLengthIncludingAddNew() || row < 0 || cell >= this._columns.length || cell < 0) {
				return false;
			}

			var rowMetadata = this._data.getItemMetadata && this._data.getItemMetadata(row);
			if (rowMetadata && typeof rowMetadata.focusable === 'boolean') {
				return rowMetadata.focusable;
			}

			var columnMetadata = rowMetadata && rowMetadata.columns;
			if (columnMetadata && columnMetadata[this._columns[cell].id] && typeof columnMetadata[this._columns[cell].id].focusable === 'boolean') {
				return columnMetadata[this._columns[cell].id].focusable;
			}

			if (columnMetadata && columnMetadata[cell] && typeof columnMetadata[cell].focusable === 'boolean') {
				return columnMetadata[cell].focusable;
			}

			return this._columns[cell].focusable;
		};

		/**
   * Navigate to the previous cell
   * @returns {boolean}
   */

		Grid.prototype.navigatePrev = function navigatePrev() {
			return this._navigate('prev');
		};

		/**
   * Navigate to the next cell
   * @returns {boolean}
   */

		Grid.prototype.navigateNext = function navigateNext() {
			return this._navigate('next');
		};

		/**
   * Navigate to the cell above
   * @returns {boolean}
   */

		Grid.prototype.navigateUp = function navigateUp() {
			return this._navigate('up');
		};

		/**
   * Navigate to the cell below
   * @returns {boolean}
   */

		Grid.prototype.navigateDown = function navigateDown() {
			return this._navigate('down');
		};

		/**
   * Navigate to the cell to the left
   * @returns {boolean}
   */

		Grid.prototype.navigateLeft = function navigateLeft() {
			return this._navigate('left');
		};

		/**
   * Navigate to the cell to the right
   * @returns {boolean}
   */

		Grid.prototype.navigateRight = function navigateRight() {
			return this._navigate('right');
		};

		/**
   * Navigate to the previous page
   */

		Grid.prototype.navigatePageUp = function navigatePageUp() {
			this._scrollPage(-1);
		};

		/**
   * Navigate to the next page
   */

		Grid.prototype.navigatePageDown = function navigatePageDown() {
			this._scrollPage(1);
		};

		/**
   * Go to cell and make it active, optionally edit the cell
   * @param {number} row
   * @param {number} cell
   * @param {boolean} forceEdit
   */

		Grid.prototype.gotoCell = function gotoCell(row, cell, forceEdit) {
			if (!this._initialized) {
				return;
			}

			if (!this.canCellBeActive(row, cell)) {
				return;
			}

			if (!this.getEditorLock().commitCurrentEdit()) {
				return;
			}

			this.scrollCellIntoView(row, cell, false);

			var newCell = this.getCellNode(row, cell);

			// if selecting the 'add new' row, start editing right away
			this._setActiveCellInternal(newCell, forceEdit || row === this.getDataLength() || this._options.autoEdit);

			// if no editor was created, set the focus back on the grid
			if (!this._currentEditor) {
				this.focus();
			}
		};

		/**
   * Get the top panel DOM element
   * @method getTopPanel
   * @returns {HTMLElement}
   */

		Grid.prototype.getTopPanel = function getTopPanel() {
			return this._topPanel;
		};

		/**
   * Show or hide the top panel
   * @method setTopPanelVisibility
   * @param {boolean} visible
   */

		Grid.prototype.setTopPanelVisibility = function setTopPanelVisibility(visible) {
			if (this._options.showTopPanel !== visible) {
				this._options.showTopPanel = visible;
				if (visible) {
					this._topPanelScroller.style.display = '';
					this.resizeCanvas();
				} else {
					this._topPanelScroller.style.display = 'none';
					this.resizeCanvas();
				}
			}
		};

		/**
   * Show or hide the header row
   * @method setHeaderRowVisibility
   * @param {boolean} visible
   */

		Grid.prototype.setHeaderRowVisibility = function setHeaderRowVisibility(visible) {
			if (this._options.showHeaderRow !== visible) {
				this._options.showHeaderRow = visible;
				if (visible) {
					this._headerRowScroller.style.display = '';
					this.resizeCanvas();
				} else {
					this._headerRowScroller.style.display = 'none';
					this.resizeCanvas();
				}
			}
		};

		/**
   * Get the header row DOM element
   * @method getHeaderRow
   * @returns {HTMLElement}
   */

		Grid.prototype.getHeaderRow = function getHeaderRow() {
			return this._headerRow;
		};

		/**
   * Get the header row by column ID
   * @method getHeaderRowColumn
   * @param {string} columnId
   * @returns {HTMLElement}
   */

		Grid.prototype.getHeaderRowColumn = function getHeaderRowColumn(columnId) {
			var index = this.getColumnIndex(columnId);
			return this._headerRow.children[index];
		};

		/**
   * Get the coordinates of the grid
   * @returns {*}
   */

		Grid.prototype.getGridPosition = function getGridPosition() {
			return this._absBox(this._container);
		};

		/**
   * Add css class to a group of cells
   * @method addCellCssStyles
   * @param {string} key Unique key to group and possibly later delete the styles
   * @param hash Hash of rows to cells { <row_num>: { <column_id> : <css_class> } }
   */

		Grid.prototype.addCellCssStyles = function addCellCssStyles(key, hash) {
			if (this._cellCssClasses[key]) {
				throw new Error('addCellCssStyles: cell CSS hash with key `' + key + '` already exists.');
			}

			this._cellCssClasses[key] = hash;
			this._updateCellCssStylesOnRenderedRows(hash, null);

			this._trigger('onCellCssStylesChanged', { key: key, hash: hash });
		};

		/**
   * Update css class to a group of cells
   * @method setCellCssStyles
   * @param {string} key Unique key to group and possibly later delete the styles
   * @param hash Hash of rows to cells { <row_num>: { <column_id> : <css_class> } }
   */

		Grid.prototype.setCellCssStyles = function setCellCssStyles(key, hash) {
			var prevHash = this._cellCssClasses[key];

			this._cellCssClasses[key] = hash;
			this._updateCellCssStylesOnRenderedRows(hash, prevHash);

			this._trigger('onCellCssStylesChanged', { key: key, hash: hash });
		};

		/**
   * Remove css class from a group of cell
   * @method removeCellCssStyles
   * @param {string} key Unique key to remove CSS class
   */

		Grid.prototype.removeCellCssStyles = function removeCellCssStyles(key) {
			if (!this._cellCssClasses[key]) {
				return;
			}

			this._updateCellCssStylesOnRenderedRows(null, this._cellCssClasses[key]);
			delete this._cellCssClasses[key];

			this._trigger('onCellCssStylesChanged', { key: key, hash: null });
		};

		/**
   * Get the CSS styles associated with a specific key
   * @method getCssStyles
   * @param {string} key Unique key associated with CSS classes
   * @returns {Object}
   */

		Grid.prototype.getCellCssStyles = function getCellCssStyles(key) {
			return this._cellCssClasses[key];
		};

		/**
   * Get the header HTMLElement
   * @returns {null|Element}
   */

		Grid.prototype.getHeader = function getHeader() {
			return this._headers;
		};

		/**
   * The unique ID associated with the grid. Used for CSS
   * @returns {string}
   */

		Grid.prototype.getUid = function getUid() {
			return this._uid;
		};

		/**
   * Destroy the grid. Remove the HTML element and remove events
   * @method destroy
   */

		Grid.prototype.destroy = function destroy() {
			this.getEditorLock().cancelCurrentEdit();

			this._trigger('onBeforeDestroy', {});

			var i = this._plugins.length;
			while (i--) {
				this.unregisterPlugin(this._plugins[i]);
			}

			this._unbindAncestorScrollEvents();
			this._removeCssRules();

			//canvas.unbind('draginit dragstart dragend drag');
			this._container.innerHTML = '';
			this._container.classList.remove(this._uid, 'sparkgrid');
		};

		/**
   * Get the editor lock, semaphore for all grid editors
   * @method getEditorLock
   * @returns {Object}
   */

		Grid.prototype.getEditorLock = function getEditorLock() {
			return this._options.editorLock;
		};

		/**
   * Get the edit controller. Manages canceling and committing grid editing
   * @method getEditController
   * @returns {Object}
   */

		Grid.prototype.getEditController = function getEditController() {
			return this._editController;
		};

		return Grid;
	})();

	/**
  * Singleton editor lock for allowing only one cell on any grid to be editable
  */
	Grid.GlobalEditorLock = GlobalEditorLock;

	module.exports = Grid;
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc', '../grouping/Group', '../grouping/GroupTotals', '../util/events', '../plugins/GroupItemMetadataProvider'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'), require('../grouping/Group'), require('../grouping/GroupTotals'), require('../util/events'), require('../plugins/GroupItemMetadataProvider'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.Group, global.GroupTotals, global.events, global.GroupItemMetadataProvider);
		global.DataView = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _groupingGroup, _groupingGroupTotals, _utilEvents, _pluginsGroupItemMetadataProvider) {
	'use strict';

	function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Group = _interopRequire(_groupingGroup);

	var _GroupTotals = _interopRequire(_groupingGroupTotals);

	var _GroupItemMetadataProvider = _interopRequire(_pluginsGroupItemMetadataProvider);

	var defaults = {
		groupItemMetadataProvider: null
	};

	var groupingInfoDefaults = {
		getter: null,
		formatter: null,
		comparer: function comparer(a, b) {
			if (a.value === b.value) {
				return 0;
			}

			return a.value > b.value ? 1 : -1;
		},
		predefinedValues: [],
		aggregators: [],
		aggregateEmpty: false,
		aggregateCollapsed: false,
		aggregateChildGroups: false,
		collapsed: false,
		displayTotalsRow: true,
		lazyTotalsCalculation: false
	};

	var DataView = (function () {
		function DataView(options) {
			_classCallCheck(this, DataView);

			// Private
			this._grid = null;
			this._idProperty = 'id'; // property holding a unique row id
			this._items = []; // data by index
			this._rows = []; // data by row
			this._idxById = {}; // indexes by id
			this._rowsById = null; // rows by id; lazy-calculated
			this._filter = null; // filter function
			this._updated = null; // updated item ids
			this._sortAsc = true;
			this._sortComparer = null;
			this._filterArgs = null;
			this._filteredItems = [];
			this._suspend = false;

			// Grouping
			this._groupingInfos = [];
			this._groups = [];
			this._toggledGroupsByLevel = [];
			this._groupingDelimiter = ':|:';

			// Paging
			this._tempPageNum = null;
			this._pageSize = 0;
			this._pageNum = 0;
			this._totalRows = 0;

			// events
			this.onRowCountChanged = new _utilEvents.Event();
			this.onRowsChanged = new _utilEvents.Event();
			this.onPagingInfoChanged = new _utilEvents.Event();
			this.onRefresh = new _utilEvents.Event();

			this._options = _utilMisc.extend({}, defaults, options);
		}

		DataView.prototype._updateIdxById = function _updateIdxById(startingIndex) {
			startingIndex = startingIndex || 0;
			for (var i = startingIndex, l = this._items.length; i < l; i++) {
				var id = this._items[i][this._idProperty];
				if (id === undefined) {
					throw new Error('Each data element must implement a unique `id` property');
				}

				this._idxById[id] = i;
			}
		};

		DataView.prototype._ensureIdUniqueness = function _ensureIdUniqueness() {
			for (var i = 0, l = this._items.length; i < l; i++) {
				var id = this._items[i][this._idProperty];
				if (id === undefined || this._idxById[id] !== i) {
					throw new Error('Each data element must implement a unique `id` property');
				}
			}
		};

		DataView.prototype._ensureRowsByIdCache = function _ensureRowsByIdCache() {
			if (!this._rowsById) {
				this._rowsById = {};
				for (var i = 0, l = this._rows.length; i < l; i++) {
					this._rowsById[this._rows[i][this._idProperty]] = i;
				}
			}
		};

		DataView.prototype._extractGroups = function _extractGroups(rows, parentGroup) {
			var group = undefined,
			    val = undefined,
			    groups = [],
			    groupsByVal = {},
			    r = undefined,
			    level = parentGroup ? parentGroup.level + 1 : 0,
			    gi = this._groupingInfos[level];

			for (var i = 0, l = gi.predefinedValues.length; i < l; i++) {
				val = gi.predefinedValues[i];
				group = groupsByVal[val];
				if (!group) {
					group = new _Group();
					group.value = val;
					group.level = level;
					group.groupingKey = (parentGroup ? parentGroup.groupingKey + this._groupingDelimiter : '') + val;
					groups[groups.length] = group;
					groupsByVal[val] = group;
				}
			}

			for (var i = 0, l = rows.length; i < l; i++) {
				r = rows[i];
				val = gi.getterIsAFn ? gi.getter(r) : r[gi.getter];
				group = groupsByVal[val];
				if (!group) {
					group = new _Group();
					group.value = val;
					group.level = level;
					group.groupingKey = (parentGroup ? parentGroup.groupingKey + this._groupingDelimiter : '') + val;
					groups[groups.length] = group;
					groupsByVal[val] = group;
				}

				group.rows[group.count++] = r;
			}

			if (level < this._groupingInfos.length - 1) {
				for (var i = 0; i < groups.length; i++) {
					group = groups[i];
					group.groups = this._extractGroups(group.rows, group);
				}
			}

			groups.sort(this._groupingInfos[level].comparer);

			return groups;
		};

		DataView.prototype._calculateTotals = function _calculateTotals(totals) {
			var group = totals.group,
			    gi = this._groupingInfos[group.level],
			    isLeafLevel = group.level === this._groupingInfos.length,
			    agg = undefined,
			    idx = gi.aggregators.length;

			if (!isLeafLevel && gi.aggregateChildGroups) {
				// make sure all the subgroups are calculated
				var i = group.groups.length;
				while (i--) {
					if (!group.groups[i].initialized) {
						this._calculateTotals(group.groups[i]);
					}
				}
			}

			while (idx--) {
				agg = gi.aggregators[idx];
				agg.init();
				if (!isLeafLevel && gi.aggregateChildGroups) {
					agg.accumulate.call(agg, group.groups);
				} else {
					agg.accumulate.call(agg, group.rows);
				}

				agg.storeResult(totals);
			}

			totals.initialized = true;
		};

		DataView.prototype._addGroupTotals = function _addGroupTotals(group) {
			var gi = this._groupingInfos[group.level],
			    totals = new _GroupTotals();

			totals.group = group;
			group.totals = totals;
			if (!gi.lazyTotalsCalculation) {
				this._calculateTotals(totals);
			}
		};

		DataView.prototype._addTotals = function _addTotals(groups, level) {
			level = level || 0;
			var gi = this._groupingInfos[level],
			    groupCollapsed = gi.collapsed,
			    toggledGroups = this._toggledGroupsByLevel[level],
			    idx = groups.length,
			    g = undefined;

			while (idx--) {
				g = groups[idx];

				if (g.collapsed && !gi.aggregateCollapsed) {
					continue;
				}

				// Do a depth-first aggregation so that parent group aggregators can access subgroup totals.
				if (g.groups) {
					this._addTotals(g.groups, level + 1);
				}

				if (gi.aggregators.length && (gi.aggregateEmpty || g.rows.length || g.groups && g.groups.length)) {
					this._addGroupTotals(g);
				}

				g.collapsed = groupCollapsed ^ toggledGroups[g.groupingKey];
				g.title = gi.formatter ? gi.formatter(g) : g.value;
			}
		};

		DataView.prototype._toggleGroup = function _toggleGroup(level, groupingKey, collapse) {
			this._toggledGroupsByLevel[level][groupingKey] = this._groupingInfos[level].collapsed ^ collapse;
			this.refresh();
		};

		DataView.prototype._toggleAllGroups = function _toggleAllGroups(level, collapse) {
			if (level == null) {
				for (var i = 0; i < this._groupingInfos.length; i++) {
					this._toggledGroupsByLevel[i] = {};
					this._groupingInfos[i].collapsed = collapse;
				}
			} else {
				this._toggledGroupsByLevel[level] = {};
				this._groupingInfos[level].collapsed = collapse;
			}

			this.refresh();
		};

		DataView.prototype._flattenGroupedRows = function _flattenGroupedRows(groups, level) {
			level = level || 0;

			var gi = this._groupingInfos[level];
			var groupedRows = [],
			    rows = undefined,
			    gl = 0,
			    g = undefined;

			for (var i = 0, l = groups.length; i < l; i++) {
				g = groups[i];
				groupedRows[gl++] = g;

				if (!g.collapsed) {
					rows = g.groups ? this._flattenGroupedRows(g.groups, level + 1) : g.rows;
					for (var j = 0, jj = rows.length; j < jj; j++) {
						groupedRows[gl++] = rows[j];
					}
				}

				if (g.totals && gi.displayTotalsRow && (!g.collapsed || gi.aggregateCollapsed)) {
					groupedRows[gl++] = g.totals;
				}
			}

			return groupedRows;
		};

		DataView.prototype._wrappedFilter = function _wrappedFilter(items, args) {
			var filteredItems = [];

			for (var i = 0, len = items.length; i < len; i++) {
				if (this._filter(items[i], args)) {
					filteredItems[i] = items[i];
				}
			}

			return filteredItems;
		};

		DataView.prototype._getFilteredAndPagedItems = function _getFilteredAndPagedItems(items) {
			if (this._filter) {
				this._filteredItems = this._wrappedFilter(items, this._filterArgs);
			} else {
				// special case:  if not filtering and not paging, the resulting
				// rows collection needs to be a copy so that changes due to sort
				// can be caught
				this._filteredItems = this._pageSize ? items : items.concat();
			}

			// get the current page
			var paged = undefined;
			if (this._pageSize) {
				if (this._filteredItems.length < this._pageNum * this._pageSize) {
					this._pageNum = Math.floor(this._filteredItems.length / this._pageSize);
				}

				paged = this._filteredItems.slice(this._pageSize * this._pageNum, this._pageSize * this._pageNum + this._pageSize);
			} else {
				paged = this._filteredItems;
			}

			return {
				totalRows: this._filteredItems.length,
				rows: paged
			};
		};

		DataView.prototype._getRowDiffs = function _getRowDiffs(rows, newRows) {
			var item = undefined,
			    r = undefined,
			    eitherIsNonData = undefined,
			    diff = [],
			    from = 0,
			    to = newRows.length;

			for (var i = from, rl = rows.length; i < to; i++) {
				if (i >= rl) {
					diff[diff.length] = i;
				} else {
					item = newRows[i];
					r = rows[i];

					if (this._groupingInfos.length && (eitherIsNonData = item.__nonDataRow || r.__nonDataRow) && item.__group !== r.__group || item.__group && !item.equals(r) || eitherIsNonData && (item.__groupTotals || r.__groupTotals) || item[this._idProperty] !== r[this._idProperty] || this._updated && this._updated[item[this._idProperty]]) {
						diff[diff.length] = i;
					}
				}
			}

			return diff;
		};

		DataView.prototype._recalc = function _recalc(items) {
			this._rowsById = null;

			var filteredItems = this._getFilteredAndPagedItems(items);
			this._totalRows = filteredItems.totalRows;
			var newRows = filteredItems.rows;

			this._groups = [];
			if (this._groupingInfos.length) {
				this._groups = this._extractGroups(newRows);
				if (this._groups.length) {
					this._addTotals(this._groups);
					newRows = this._flattenGroupedRows(this._groups);
				}
			}

			var diff = this._getRowDiffs(this._rows, newRows);

			this._rows = newRows;

			return diff;
		};

		DataView.prototype._mapRowsToIds = function _mapRowsToIds(rowArray) {
			var ids = [];
			for (var i = 0, l = rowArray.length; i < l; i++) {
				if (rowArray[i] < this._rows.length) {
					ids[ids.length] = this._rows[rowArray[i]][this._idProperty];
				}
			}

			return ids;
		};

		DataView.prototype._mapIdsToRows = function _mapIdsToRows(idArray) {
			var rows = [];
			this._ensureRowsByIdCache();
			for (var i = 0, l = idArray.length; i < l; i++) {
				var row = this._rowsById[idArray[i]];
				if (row != null) {
					rows[rows.length] = row;
				}
			}

			return rows;
		};

		/**
   * Initialize the view with the grid. This is called by the grid
   * @param {Grid} grid
   */

		DataView.prototype.init = function init(grid) {

			// wire up model events to drive the grid
			this.onRowCountChanged.subscribe(function () {
				grid.updateRowCount();
			});

			this.onRowsChanged.subscribe(function (info) {
				var args = info.data;
				grid.invalidateRows(args.rows);
				grid.render();
			});

			this.onPagingInfoChanged.subscribe(function (info) {
				var pagingInfo = info.data;
				var isLastPage = pagingInfo.pageNum === pagingInfo.totalPages - 1;
				var enableAddRow = isLastPage || pagingInfo.pageSize === 0;
				var options = grid.getOptions();

				if (options.enableAddRow !== enableAddRow) {
					grid.setOptions({ enableAddRow: enableAddRow });
				}
			});
		};

		/**
   * Call before multiple view updates to avoid multiple refreshes
   */

		DataView.prototype.beginUpdate = function beginUpdate() {
			this._suspend = true;
		};

		/**
   * Call after multiple updates to refresh view with all changes
   */

		DataView.prototype.endUpdate = function endUpdate() {
			this._suspend = false;
			this.refresh();
		};

		/**
   * Set page size and/or page number
   * @param {Object} options
   * @param {number} options.pageNum
   * @param {number} options.pageSize
   */

		DataView.prototype.setPagingOptions = function setPagingOptions(_ref) {
			var pageSize = _ref.pageSize;
			var pageNum = _ref.pageNum;

			if (pageSize !== undefined) {
				this._pageSize = pageSize;
			}

			if (pageNum !== undefined) {
				this._tempPageNum = pageNum;
			}

			this.refresh();
		};

		/**
   * Get page details about the current view
   * @returns {{pageSize: number, pageNum: number, totalRows: number, totalPages: number}}
   */

		DataView.prototype.getPagingInfo = function getPagingInfo() {
			var totalPages = this._pageSize ? Math.max(1, Math.ceil(this._totalRows / this._pageSize)) : 1;
			return {
				pageSize: this._pageSize,
				pageNum: this._pageNum,
				totalRows: this._totalRows,
				totalPages: totalPages
			};
		};

		/**
   * Get all the items without filters
   * @returns {Array}
   */

		DataView.prototype.getItems = function getItems() {
			return this._items;
		};

		/**
   * Set the data
   * @param {Array} data
   * @param {string} [objectIdProperty]
   */

		DataView.prototype.setItems = function setItems(data, objectIdProperty) {
			if (objectIdProperty !== undefined) {
				this._idProperty = objectIdProperty;
			}

			this._items = this._filteredItems = data;
			this._idxById = {};
			this._updateIdxById();
			this._ensureIdUniqueness();
			this.refresh();
		};

		DataView.prototype.setFilter = function setFilter(filterFn) {
			this._filter = filterFn;
			this.refresh();
		};

		/**
   * Sort the grid with a custom compare function
   * @param {function} compareFn
   * @param {boolean} ascending
   */

		DataView.prototype.sort = function sort(compareFn, ascending) {
			this._sortAsc = ascending;
			this._sortComparer = compareFn;
			if (ascending === false) {
				this._items.reverse();
			}

			this._items.sort(compareFn);
			if (ascending === false) {
				this._items.reverse();
			}

			this._idxById = {};
			this._updateIdxById();
			this.refresh();
		};

		/**
   * Sort the view with existing filter args and function
   */

		DataView.prototype.reSort = function reSort() {
			if (this._sortComparer) {
				this.sort(this._sortComparer, this._sortAsc);
			}
		};

		/**
   * Get grouping info
   * @returns {Array}
   */

		DataView.prototype.getGrouping = function getGrouping() {
			return this._groupingInfos;
		};

		/**
   * Set grouping info
   * @param {Array} groupingInfo
   */

		DataView.prototype.setGrouping = function setGrouping(groupingInfo) {
			if (!this._options.groupItemMetadataProvider) {
				this._options.groupItemMetadataProvider = new _GroupItemMetadataProvider();
			}

			this._groups = [];
			this._toggledGroupsByLevel = [];
			groupingInfo = groupingInfo || [];
			this._groupingInfos = groupingInfo instanceof Array ? groupingInfo : [groupingInfo];

			for (var i = 0; i < this._groupingInfos.length; i++) {
				var gi = this._groupingInfos[i] = _utilMisc.extend({}, groupingInfoDefaults, this._groupingInfos[i]);
				gi.getterIsAFn = typeof gi.getter === 'function';

				this._toggledGroupsByLevel[i] = {};
			}

			this.refresh();
		};

		/**
   * Collapse all groups at a level
   * @param {string} level
   */

		DataView.prototype.collapseAllGroups = function collapseAllGroups(level) {
			this._toggleAllGroups(level, true);
		};

		/**
   * Expand all groups at level
   * @param {string} level
   */

		DataView.prototype.expandAllGroups = function expandAllGroups(level) {
			this._toggleAllGroups(level, false);
		};

		/**
   * Collapse single group
   * @param {string} level
   * @param {string} groupingKey
   */

		DataView.prototype.collapseGroup = function collapseGroup(level, groupingKey) {
			this._toggleGroup(level, groupingKey, true);
		};

		/**
   * Expand single group
   * @param {string} level
   * @param {string} groupingKey
   */

		DataView.prototype.expandGroup = function expandGroup(level, groupingKey) {
			this._toggleGroup(level, groupingKey, false);
		};

		/**
   * Get all groups
   * @returns {Array}
   */

		DataView.prototype.getGroups = function getGroups() {
			return this._groups;
		};

		/**
   * Get index by id
   * @param {string} id
   * @returns {number}
   */

		DataView.prototype.getIdxById = function getIdxById(id) {
			return this._idxById[id];
		};

		/**
   * Get row by Id
   * @param {string} id
   * @returns {*}
   */

		DataView.prototype.getRowById = function getRowById(id) {
			this._ensureRowsByIdCache();
			return this._rowsById[id];
		};

		/**
   * Get item by id
   * @param {string} id
   * @returns {Object}
   */

		DataView.prototype.getItemById = function getItemById(id) {
			return this._items[this._idxById[id]];
		};

		/**
   * Get item by index
   * @param {number} index
   * @returns {Object}
   */

		DataView.prototype.getItemByIdx = function getItemByIdx(index) {
			return this._items[index];
		};

		/**
   * Get rows by an array of IDs
   * @param {Array<string>} idArray
   * @returns {Array<Object>}
   */

		DataView.prototype.mapIdsToRows = function mapIdsToRows(idArray) {
			var rows = [];
			this._ensureRowsByIdCache();
			for (var i = 0, l = idArray.length; i < l; i++) {
				var row = this._rowsById[idArray[i]];
				if (row !== null) {
					rows.push(row);
				}
			}

			return rows;
		};

		/**
   * Get ids by an array of row objects
   * @param {Array<Object>} rowArray
   * @returns {Array<string>}
   */

		DataView.prototype.mapRowsToIds = function mapRowsToIds(rowArray) {
			var ids = [];
			for (var i = 0, l = rowArray.length; i < l; i++) {
				if (rowArray[i] < this._rows.length) {
					ids[ids.length] = this._rows[rowArray[i]][this._idProperty];
				}
			}

			return ids;
		};

		/**
   * Set the view filter
   * @param {Object} args Object with field as property and filter value
   */

		DataView.prototype.setFilterArgs = function setFilterArgs(args) {
			this._filterArgs = args;
		};

		/**
   * Refresh the view after data change
   */

		DataView.prototype.refresh = function refresh() {
			if (this._suspend) {
				return;
			}

			var countBefore = this._rows.length,
			    totalRowsBefore = this._totalRows,
			    diff = this._recalc(this._items, this._filter); // pass as direct refs to avoid closure perf hit

			if (this._tempPageNum) {
				this._pageNum = this._pageSize ? Math.min(this._tempPageNum, Math.max(0, Math.ceil(this._totalRows / this._pageSize) - 1)) : 0;
			}

			// if the current page is no longer valid, go to last page and recalc
			// we suffer a performance penalty here, but the main loop (recalc) remains highly optimized
			if (this._pageSize && this._totalRows < this._pageNum * this._pageSize) {
				this._pageNum = Math.max(0, Math.ceil(this._totalRows / this._pageSize) - 1);
				diff = this._recalc(this._items, this._filter);
			}

			this._updated = null;

			if (totalRowsBefore !== this._totalRows) {
				this.onPagingInfoChanged.notify(this.getPagingInfo(), null, this);
			}

			if (countBefore !== this._rows.length) {
				this.onRowCountChanged.notify({ previous: countBefore, current: this._rows.length }, null, this);
			}

			if (diff.length > 0) {
				this.onRowsChanged.notify({ rows: diff }, null, this);
			}

			this.onRefresh.notify(null, null, this);
		};

		/**
   * Update an item by id
   * @param {string} id
   * @param {Object} item
   */

		DataView.prototype.updateItem = function updateItem(id, item) {
			if (this._idxById[id] === undefined || id !== item[this._idProperty]) {
				throw new Error('Invalid or non-matching id');
			}

			this._items[this._idxById[id]] = item;
			if (!this._updated) {
				this._updated = {};
			}

			this._updated[id] = true;
			this.refresh();
		};

		/**
   * Insert an item at an index
   * @param {number} index
   * @param {Object} item
   */

		DataView.prototype.insertItem = function insertItem(index, item) {
			this._items.splice(index, 0, item);
			this._updateIdxById(index);
			this.refresh();
		};

		/**
   * Add an item
   * @param {Object} item
   */

		DataView.prototype.addItem = function addItem(item) {
			this._items.push(item);
			this._updateIdxById(this._items.length - 1);
			this.refresh();
		};

		/**
   * Delete an item from the view
   * @param {string} id
   */

		DataView.prototype.deleteItem = function deleteItem(id) {
			var idx = this._idxById[id];
			if (idx === undefined) {
				throw new Error('Invalid id');
			}

			delete this._idxById[id];
			this._items.splice(idx, 1);
			this._updateIdxById(idx);
			this.refresh();
		};

		/**
   * Destroy the view
   */

		DataView.prototype.destroy = function destroy() {};

		/**
   * Get the number of items in the view
   * @returns {Number}
   */

		DataView.prototype.getLength = function getLength() {
			return this._rows.length;
		};

		/**
   * Get an item by index
   * @param index
   * @returns {Object}
   */

		DataView.prototype.getItem = function getItem(index) {
			var item = this._rows[index];

			// if this is a group row, make sure totals are calculated and update the title
			if (item && item.__group && item.totals && !item.totals.initialized) {
				var gi = this._groupingInfos[item.level];
				if (!gi.displayTotalsRow) {
					this._calculateTotals(item.totals);
					item.title = gi.formatter ? gi.formatter(item) : item.value;
				}
			}

			// if this is a totals row, make sure it's calculated
			else if (item && item.__groupTotals && !item.initialized) {
				this._calculateTotals(item);
			}

			return item;
		};

		/**
   * Get metadata by index
   * @param index
   * @returns {{columns: Array, formatter: function, formatterFactory: function}}
   */

		DataView.prototype.getItemMetadata = function getItemMetadata(index) {
			var item = this._rows[index];
			if (item === undefined) {
				return null;
			}

			// overrides for grouping rows
			if (item.__group) {
				return this._options.groupItemMetadataProvider.getGroupRowMetadata(item);
			}

			// overrides for totals rows
			if (item.__groupTotals) {
				return this._options.groupItemMetadataProvider.getTotalsRowMetadata(item);
			}

			return null;
		};

		/**
   * Get items after filter function
   * @returns {Array}
   */

		DataView.prototype.getFilteredItems = function getFilteredItems() {
			return this._filteredItems;
		};

		/**
   * Sync the data view with a grid
   * @param {Grid} grid
   * @param {boolean} preserveHidden
   * @param {boolean} preserveHiddenOnSelectionChange
   * @returns {Event}
   */

		DataView.prototype.syncGridSelection = function syncGridSelection(grid, preserveHidden) {
			var _this = this;

			var preserveHiddenOnSelectionChange = arguments[2] === undefined ? false : arguments[2];

			var inHandler = undefined,
			    selectedRowIds = this._mapRowsToIds(grid.getSelectedRows()),
			    onSelectedRowIdsChanged = new _utilEvents.Event();

			var setSelectedRowIds = function setSelectedRowIds(rowIds) {
				if (selectedRowIds.join(',') === rowIds.join(',')) {
					return;
				}

				selectedRowIds = rowIds;

				onSelectedRowIdsChanged.notify({
					grid: grid,
					ids: selectedRowIds
				}, new _utilEvents.EventControl(), _this);
			};

			var update = function update() {
				if (selectedRowIds.length > 0) {
					inHandler = true;
					var selectedRows = _this._mapIdsToRows(selectedRowIds);
					if (!preserveHidden) {
						setSelectedRowIds(_this._mapRowsToIds(selectedRows));
					}

					grid.setSelectedRows(selectedRows);
					inHandler = false;
				}
			};

			grid.onSelectedRowsChanged.subscribe(function () {
				if (inHandler) {
					return;
				}

				var newSelectedRowIds = _this._mapRowsToIds(grid.getSelectedRows());
				if (!preserveHiddenOnSelectionChange || !grid.getOptions().multiSelect) {
					setSelectedRowIds(newSelectedRowIds);
				} else {
					// keep the ones that are hidden
					var existing = selectedRowIds.filter(function (id) {
						return _this.getRowById(id) === undefined;
					});

					// add the newly selected ones
					setSelectedRowIds(existing.concat(newSelectedRowIds));
				}
			});

			this.onRowsChanged.subscribe(update);

			this.onRowCountChanged.subscribe(update);

			return onSelectedRowIdsChanged;
		};

		/**
   * Sync data view styles with a grid
   * @param {Grid} grid
   * @param {string} key
   */

		DataView.prototype.syncGridCellCssStyles = function syncGridCellCssStyles(grid, key) {
			var _this2 = this;

			var hashById = undefined,
			    inHandler = undefined;

			var storeCellCssStyles = function storeCellCssStyles(hash) {
				hashById = {};
				for (var row in hash) {
					var id = _this2._rows[row][_this2._idProperty];
					hashById[id] = hash[row];
				}
			};

			// since this method can be called after the cell styles have been set,
			// get the existing ones right away
			storeCellCssStyles(grid.getCellCssStyles(key));

			var update = function update() {
				if (hashById) {
					inHandler = true;
					_this2._ensureRowsByIdCache();
					var newHash = {};
					for (var id in hashById) {
						var row = _this2._rowsById[id];
						if (row !== undefined) {
							newHash[row] = hashById[id];
						}
					}

					grid.setCellCssStyles(key, newHash);
					inHandler = false;
				}
			};

			grid.onCellCssStylesChanged.subscribe(function (info) {
				var args = info.data;
				if (inHandler) {
					return;
				}

				if (key !== args.key) {
					return;
				}

				if (args.hash) {
					storeCellCssStyles(args.hash);
				}
			});

			this.onRowsChanged.subscribe(update);
			this.onRowCountChanged.subscribe(update);
		};

		return DataView;
	})();

	module.exports = DataView;
});

// no good way to compare totals since they are arbitrary DTOs
// deep object comparison is pretty expensive
// always considering them 'dirty' seems easier for the time being
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
		global.EditorLock = mod.exports;
	}
})(this, function (exports, module) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	/***
  * A locking helper to track the active edit controller and ensure that only a single controller
  * can be active at a time.  This prevents a whole class of state and validation synchronization
  * issues.  An edit controller (such as SlickGrid) can query if an active edit is in progress
  * and attempt a commit or cancel before proceeding.
  * @class EditorLock
  * @constructor
  */

	var EditorLock = (function () {
		function EditorLock() {
			_classCallCheck(this, EditorLock);

			this._activeEditController = null;
		}

		/***
   * Returns true if a specified edit controller is active (has the edit lock).
   * If the parameter is not specified, returns true if any edit controller is active.
   * @method isActive
   * @param editController {EditController}
   * @return {Boolean}
   */

		EditorLock.prototype.isActive = function isActive(editController) {
			return editController ? this._activeEditController === editController : this._activeEditController !== null;
		};

		/***
   * Sets the specified edit controller as the active edit controller (acquire edit lock).
   * If another edit controller is already active, and exception will be thrown.
   * @method activate
   * @param editController {EditController} edit controller acquiring the lock
   */

		EditorLock.prototype.activate = function activate(editController) {
			if (editController === this._activeEditController) {
				// already activated?
				return;
			}

			if (this._activeEditController !== null) {
				throw new Error('SlickGrid.EditorLock.activate: an editController is still active, can\'t activate another editController');
			}

			if (!editController.commitCurrentEdit) {
				throw new Error('SlickGrid.EditorLock.activate: editController must implement .commitCurrentEdit()');
			}

			if (!editController.cancelCurrentEdit) {
				throw new Error('SlickGrid.EditorLock.activate: editController must implement .cancelCurrentEdit()');
			}

			this._activeEditController = editController;
		};

		/***
   * Unsets the specified edit controller as the active edit controller (release edit lock).
   * If the specified edit controller is not the active one, an exception will be thrown.
   * @method deactivate
   * @param editController {EditController} edit controller releasing the lock
   */

		EditorLock.prototype.deactivate = function deactivate(editController) {
			if (this._activeEditController !== editController) {
				throw new Error('SlickGrid.EditorLock.deactivate: specified editController is not the currently active one');
			}

			this._activeEditController = null;
		};

		/***
   * Attempts to commit the current edit by calling 'commitCurrentEdit' method on the active edit
   * controller and returns whether the commit attempt was successful (commit may fail due to validation
   * errors, etc.).  Edit controller's 'commitCurrentEdit' must return true if the commit has succeeded
   * and false otherwise.  If no edit controller is active, returns true.
   * @method commitCurrentEdit
   * @return {Boolean}
   */

		EditorLock.prototype.commitCurrentEdit = function commitCurrentEdit() {
			return this._activeEditController ? this._activeEditController.commitCurrentEdit() : true;
		};

		/***
   * Attempts to cancel the current edit by calling 'cancelCurrentEdit' method on the active edit
   * controller and returns whether the edit was successfully cancelled.  If no edit controller is
   * active, returns true.
   * @method cancelCurrentEdit
   * @return {Boolean}
   */

		EditorLock.prototype.cancelCurrentEdit = function cancelCurrentEdit() {
			return this._activeEditController ? this._activeEditController.cancelCurrentEdit() : true;
		};

		return EditorLock;
	})();

	module.exports = EditorLock;
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', '../util/misc', '../util/events'], factory);
	} else if (typeof exports !== 'undefined') {
		factory(exports, require('../util/misc'), require('../util/events'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, global.misc, global.events);
		global.editors = mod.exports;
	}
})(this, function (exports, _utilMisc, _utilEvents) {
	'use strict';

	exports.__esModule = true;

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var Text = (function () {
		function Text(options) {
			_classCallCheck(this, Text);

			this._defaultValue = null;
			this._options = options;
			this._inputEl = _utilMisc.createEl({
				tag: 'input',
				type: this._options.type || 'text',
				className: 'editor-text'
			});
			this._inputEl.addEventListener('keydown', function (e) {
				if (e.keyCode === _utilEvents.KEYCODES.LEFT || e.keyCode === _utilEvents.KEYCODES.RIGHT) {
					e.stopPropagation();
				}
			});
			this._inputEl.focus();
			this._inputEl.setSelectionRange(0, this._inputEl.value.length);
			this._options.container.appendChild(this._inputEl);
		}

		Text.prototype.destroy = function destroy() {
			_utilMisc.removeEl(this._inputEl);
		};

		Text.prototype.focus = function focus() {
			this._inputEl.focus();
		};

		Text.prototype.getValue = function getValue() {
			return this._inputEl.value;
		};

		Text.prototype.setValue = function setValue(val) {
			this._inputEl.value = val;
		};

		Text.prototype.loadValue = function loadValue(item) {
			this._defaultValue = item[this._options.column.field] || '';
			this._inputEl.value = this._defaultValue;
			this._inputEl.defaultValue = this._defaultValue;
			this._inputEl.setSelectionRange(0, this._inputEl.value.length);
		};

		Text.prototype.serializeValue = function serializeValue() {
			return this._inputEl.value;
		};

		Text.prototype.applyValue = function applyValue(item, state) {
			item[this._options.column.field] = state;
		};

		Text.prototype.isValueChanged = function isValueChanged() {
			return !(this._inputEl.value === '' && this._defaultValue == null) && this._inputEl.value !== this._defaultValue;
		};

		Text.prototype.validate = function validate() {
			if (this._options.column.validator) {
				var validationResults = this._options.column.validator(this._inputEl.value);
				if (!validationResults.valid) {
					return validationResults;
				}
			}

			return {
				valid: true,
				msg: null
			};
		};

		return Text;
	})();

	var Number = (function (_Text) {
		function Number(options) {
			_classCallCheck(this, Number);

			_Text.call(this, _utilMisc.extend({ type: 'number' }, options));
		}

		_inherits(Number, _Text);

		Number.prototype.validate = function validate() {
			if (isNaN(this._inputEl.value)) {
				return {
					valid: false,
					msg: 'Please enter a valid number'
				};
			}

			return {
				valid: true,
				msg: null
			};
		};

		Number.prototype.serializeValue = function serializeValue() {
			return parseFloat(this.inputEl.value) || 0;
		};

		return Number;
	})(Text);

	var YesNoSelect = (function () {
		function YesNoSelect(options) {
			_classCallCheck(this, YesNoSelect);

			this._defaultValue = null;
			this._options = options;
			this._selectEl = _utilMisc.createEl({
				tag: 'select',
				tabIndex: '0',
				className: 'editor-yesno'
			});
			this._selectEl.innerHTML = '<OPTION value="yes">Yes</OPTION><OPTION value="no">No</OPTION>';
			this._options.container.appendChild(this._selectEl);
			this._selectEl.focus();
		}

		YesNoSelect.prototype.destroy = function destroy() {
			_utilMisc.removeEl(this._selectEl);
		};

		YesNoSelect.prototype.focus = function focus() {
			this._selectEl.focus();
		};

		YesNoSelect.prototype.loadValue = function loadValue(item) {
			this._defaultValue = item[this._options.column.field];
			this._selectEl.value = this._defaultValue ? 'yes' : 'no';
			this._selectEl.select();
		};

		YesNoSelect.prototype.serializeValue = function serializeValue() {
			return this._selectEl.value === 'yes';
		};

		YesNoSelect.prototype.applyValue = function applyValue(item, state) {
			item[this._options.column.field] = state;
		};

		YesNoSelect.prototype.isValueChanged = function isValueChanged() {
			return this._selectEl.value !== this._defaultValue;
		};

		YesNoSelect.prototype.validate = function validate() {
			return {
				valid: true,
				msg: null
			};
		};

		return YesNoSelect;
	})();

	var Checkbox = (function () {
		function Checkbox(options) {
			_classCallCheck(this, Checkbox);

			this._defaultValue = null;
			this._select = _utilMisc.createEl({
				tag: 'input',
				type: 'checkbox',
				checked: true,
				className: 'editor-checkbox',
				hideFocus: true
			});
			this._options = options;
			this._select.focus();
			options.container.appendChild(this._select);
		}

		Checkbox.prototype.destroy = function destroy() {
			_utilMisc.removeEl(this._select);
		};

		Checkbox.prototype.focus = function focus() {
			this._select.focus();
		};

		Checkbox.prototype.loadValue = function loadValue(item) {
			this._select.checked = !!item[this._options.column.field];
		};

		Checkbox.prototype.serializeValue = function serializeValue() {
			return this._select.checked;
		};

		Checkbox.prototype.applyValue = function applyValue(item, state) {
			item[this._options.column.field] = state;
		};

		Checkbox.prototype.isValueChanged = function isValueChanged() {
			return this.serializeValue() !== this._defaultValue;
		};

		Checkbox.prototype.validate = function validate() {
			return {
				valid: true,
				msg: null
			};
		};

		return Checkbox;
	})();

	/*
  * An example of a 'detached' editor.
  * The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
  * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
  */

	var LongText = (function () {
		function LongText(options) {
			_classCallCheck(this, LongText);

			this._defaaultValue = null;
			this._container = options.container || document.body;
			this._wrapper = _utilMisc.createEl({
				tag: 'div',
				style: {
					zIndex: 10000,
					position: 'absolute',
					background: '#fff',
					padding: '5px',
					border: '3px solid gray',
					borderRadius: '10px'
				}
			});
			this._container.appendChild(this._wrapper);

			this._input = _utilMisc.createEl({
				tag: 'textarea',
				rows: 5,
				style: {
					background: '#fff',
					width: '250px',
					height: '80px',
					border: 0,
					outline: 0
				}
			});

			this._wrapper.innerHTML = '<DIV style="text-align:right"><BUTTON>Save</BUTTON><BUTTON>Cancel</BUTTON></DIV>';
			this._wrapper.appendChild(this._input);

			var buttons = this._wrapper.querySelectorAll('button');
			buttons[0].addEventListener('click', this.save.bind(this));
			buttons[1].addEventListener('click', this.cancel.bind(this));
			this._input.addEventListener('keydown', this.handleKeyDown.bind(this));

			this.position(options.position);
			this._input.focus();
			this._input.select();
		}

		LongText.prototype.handleKeyDown = function handleKeyDown(e) {
			if (e.which === _utilEvents.KEYCODES.ENTER && e.ctrlKey) {
				this.save();
			} else if (e.which === _utilEvents.KEYCODES.ESCAPE) {
				e.preventDefault();
				this.cancel();
			} else if (e.which === _utilEvents.KEYCODES.TAB && e.shiftKey) {
				e.preventDefault();
				this._options.grid.navigatePrev();
			} else if (e.which === _utilEvents.KEYCODES.TAB) {
				e.preventDefault();
				this._options.grid.navigateNext();
			}
		};

		LongText.prototype.save = function save() {
			this._options.commitChanges();
		};

		LongText.prototype.cancel = function cancel() {
			this._input.value = this._defaultValue;
			this._options.cancelChanges();
		};

		LongText.prototype.hide = function hide() {
			this._wrapper.style.display = 'none';
		};

		LongText.prototype.show = function show() {
			this._wrapper.style.display = '';
		};

		LongText.prototype.position = function position(position) {
			_utilMisc.setStyle(this._wrapper, {
				top: position.top - 5 + 'px',
				left: position.left - 5 + 'px'
			});
		};

		LongText.prototype.destroy = function destroy() {
			_utilMisc.removeEl(this._wrapper);
		};

		LongText.prototype.focus = function focus() {
			this._input.focus();
		};

		LongText.prototype.loadValue = function loadValue(item) {
			this._input.value = this._defaultValue = item[this._options.column.field];
			this._input.select();
		};

		LongText.prototype.serializeValue = function serializeValue() {
			return this._input.value;
		};

		LongText.prototype.applyValue = function applyValue(item, state) {
			item[this._options.column.field] = state;
		};

		LongText.prototype.isValueChanged = function isValueChanged() {
			return !(this._input.value === '' && this._defaultValue == null) && this._input.value !== this._defaultValue;
		};

		LongText.prototype.validate = function validate() {
			return {
				valid: true,
				msg: null
			};
		};

		return LongText;
	})();

	exports.Text = Text;
	exports.Number = Number;
	exports.YesNoSelect = YesNoSelect;
	exports.Checkbox = Checkbox;
	exports.LongText = LongText;
});
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

	function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

	var _NonDataItem3 = _interopRequire(_NonDataItem2);

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

		_inherits(GroupTotals, _NonDataItem);

		return GroupTotals;
	})(_NonDataItem3);

	module.exports = GroupTotals;
});
(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "module"], factory);
  } else if (typeof exports !== "undefined" && typeof module !== "undefined") {
    factory(exports, module);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, mod);
    global.NonDataItem = mod.exports;
  }
})(this, function (exports, module) {
  "use strict";

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  /***
   * A base class that all special / non-data rows (like Group and GroupTotals) derive from.
   * @class NonDataItem
   * @constructor
   */

  var NonDataItem = function NonDataItem() {
    _classCallCheck(this, NonDataItem);

    this.__nonDataRow = true;
  };

  module.exports = NonDataItem;
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports'], factory);
	} else if (typeof exports !== 'undefined') {
		factory(exports);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports);
		global.aggregators = mod.exports;
	}
})(this, function (exports) {
	'use strict';

	exports.__esModule = true;

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var Avg = (function () {
		function Avg(field) {
			_classCallCheck(this, Avg);

			this.field_ = field;
		}

		Avg.prototype.init = function init() {
			this.count_ = 0;
			this.nonNullCount_ = 0;
			this.sum_ = 0;
		};

		Avg.prototype.accumulate = function accumulate(item) {
			var val = item[this.field_];
			this.count_++;
			if (val != null && val !== '' && isNaN(val)) {
				this.nonNullCount_++;
				this.sum_ += parseFloat(val);
			}
		};

		Avg.prototype.storeResult = function storeResult(groupTotals) {
			if (!groupTotals.avg) {
				groupTotals.avg = {};
			}

			if (this.nonNullCount_ !== 0) {
				groupTotals.avg[this.field_] = this.sum_ / this.nonNullCount_;
			}
		};

		return Avg;
	})();

	var Min = (function () {
		function Min(field) {
			_classCallCheck(this, Min);

			this.field_ = field;
		}

		Min.prototype.init = function init() {
			this.min_ = null;
		};

		Min.prototype.accumulate = function accumulate(item) {
			var val = item[this.field_];
			if (val != null && val !== '' && isNaN(val)) {
				if (this.min_ == null || val < this.min_) {
					this.min_ = val;
				}
			}
		};

		Min.prototype.storeResult = function storeResult(groupTotals) {
			if (!groupTotals.min) {
				groupTotals.min = {};
			}

			groupTotals.min[this.field_] = this.min_;
		};

		return Min;
	})();

	var Max = (function () {
		function Max(field) {
			_classCallCheck(this, Max);

			this.field_ = field;
		}

		Max.prototype.init = function init() {
			this.max_ = null;
		};

		Max.prototype.accumulate = function accumulate(item) {
			var val = item[this.field_];
			if (val != null && val !== '' && isNaN(val)) {
				if (this.max_ == null || val > this.max_) {
					this.max_ = val;
				}
			}
		};

		Max.prototype.storeResult = function storeResult(groupTotals) {
			if (!groupTotals.max) {
				groupTotals.max = {};
			}

			groupTotals.max[this.field_] = this.max_;
		};

		return Max;
	})();

	var Sum = (function () {
		function Sum(field) {
			_classCallCheck(this, Sum);

			this.field_ = field;
		}

		Sum.prototype.init = function init() {
			this.sum_ = null;
		};

		Sum.prototype.accumulate = function accumulate(item) {
			var val = item[this.field_];
			if (val != null && val !== '' && isNaN(val)) {
				this.sum_ += parseFloat(val);
			}
		};

		Sum.prototype.storeResult = function storeResult(groupTotals) {
			if (!groupTotals.sum) {
				groupTotals.sum = {};
			}

			groupTotals.sum[this.field_] = this.sum_;
		};

		return Sum;
	})();

	exports.Avg = Avg;
	exports.Min = Min;
	exports.Max = Max;
	exports.Sum = Sum;
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc);
		global.AutoTooltips = mod.exports;
	}
})(this, function (exports, module, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var defaults = {
		enableForCells: true,
		enableForHeaderCells: false,
		maxToolTipLength: null
	};

	/**
  * AutoTooltips plugin to show/hide tooltips when columns are too narrow to fit content.
  * @constructor
  * @param {boolean} [options.enableForCells=true]        - Enable tooltip for grid cells
  * @param {boolean} [options.enableForHeaderCells=false] - Enable tooltip for header cells
  * @param {number}  [options.maxToolTipLength=null]      - The maximum length for a tooltip
  */

	var AutoTooltips = (function () {
		function AutoTooltips(options) {
			_classCallCheck(this, AutoTooltips);

			this._options = _utilMisc.extend({}, defaults, options);
			this._grid = null;
		}

		/**
   * Initialize plugin.
   */

		AutoTooltips.prototype.init = function init(grid) {
			var _this = this;

			this._grid = grid;

			if (this._options.enableForCells) {
				this._boundHandleMouseEnter = function (info) {
					var e = info.event,
					    cell = _this._grid.getCellFromEvent(e);
					if (cell) {
						var node = _this._grid.getCellNode(cell.row, cell.cell),
						    text = undefined;
						if (node.clientWidth < node.scrollWidth) {
							text = node.textContent.trim();
							if (_this._options.maxToolTipLength && text.length > _this._options.maxToolTipLength) {
								text = text.substr(0, _this._options.maxToolTipLength - 3) + '...';
							}
						} else {
							text = '';
						}

						node.title = text;
					}
				};
				this._grid.onMouseEnter.subscribe(this._boundHandleMouseEnter);
			}

			if (this._options.enableForHeaderCells) {
				this._boundHandleHeaderMouseEnter = function (info) {
					var e = info.e,
					    data = info.data,
					    column = data.column,
					    node = _utilMisc.closest(e.target, '.slick-header-column');
					if (!column.toolTip) {
						node.title = node.clientWidth < node.scrollWidth ? column.name : '';
					}
				};
				this._grid.onHeaderMouseEnter.subscribe(this._boundHandleHeaderMouseEnter());
			}
		};

		/**
   * Destroy plugin.
   */

		AutoTooltips.prototype.destroy = function destroy() {
			if (this._options.enableForCells) {
				this._grid.onMouseEnter.unsubscribe(this._boundHandleMouseEnter);
			}

			if (this._options.enableForHeaderCells) {
				this._grid.onHeaderMouseEnter.unsubscribe(this._boundHandleHeaderMouseEnter());
			}
		};

		return AutoTooltips;
	})();

	module.exports = AutoTooltips;
});
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
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc);
		global.CellRangeDecorator = mod.exports;
	}
})(this, function (exports, module, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	/***
  * Displays an overlay on top of a given cell range.
  *
  * TODO:
  * Currently, it blocks mouse events to DOM nodes behind it.
  * Use FF and WebKit-specific "pointer-events" CSS style, or some kind of event forwarding.
  * Could also construct the borders separately using 4 individual DIVs.
  *
  * @param {Grid} grid
  * @param {Object} options
  */

	var CellRangeDecorator = (function () {
		function CellRangeDecorator(options) {
			_classCallCheck(this, CellRangeDecorator);

			var defaults = {
				selectionCssClass: 'slick-range-decorator',
				selectionCss: {
					zIndex: '9999',
					border: '2px dashed red'
				}
			};

			this._el = null;
			this._options = _utilMisc.deepExtend({}, defaults, options);
		}

		CellRangeDecorator.prototype.init = function init(grid) {
			this._grid = grid;
		};

		CellRangeDecorator.prototype.show = function show(range) {
			if (!this._el) {
				this._el = _utilMisc.createEl({
					style: _utilMisc.extend({}, this._options.selectionCss, {
						position: 'absolute'
					}),
					className: this._options.selectionCssClass
				});

				this._grid.getCanvaseNode().appendChild(this._el);
			}

			var from = this._grid.getCellNodeBox(range.fromRow, range.fromCell),
			    to = this._grid.getCellNodeBox(range.toRow, range.toCell);

			this._el.css({
				top: from.top - 1,
				left: from.left - 1,
				height: to.bottom - from.top - 2,
				width: to.right - from.left - 2
			});

			return this._el;
		};

		CellRangeDecorator.prototype.hide = function hide() {
			if (this._el) {
				this._el.remove();
				this._el = null;
			}
		};

		return CellRangeDecorator;
	})();

	module.exports = CellRangeDecorator;
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc', '../util/events', '../selection/Range', './CellRangeDecorator'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'), require('../util/events'), require('../selection/Range'), require('./CellRangeDecorator'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.events, global.Range, global.CellRangeDecorator);
		global.CellRangeSelector = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _utilEvents, _selectionRange, _CellRangeDecorator) {
	'use strict';

	function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Range = _interopRequire(_selectionRange);

	var _CellRangeDecorator2 = _interopRequire(_CellRangeDecorator);

	var CellRangeSelector = (function () {
		function CellRangeSelector(options) {
			_classCallCheck(this, CellRangeSelector);

			var defaults = {
				selectionCss: {
					border: '2px dashed blue'
				}
			};

			this._grid = null;
			this._canvas = null;
			this._dragging = null;
			this._decorator = null;
			this._handler = new _utilEvents.EventHandler();
			this._options = _utilMisc.deepExtend({}, defaults, options);
			this.onBeforeCellRangeSelected = new _utilEvents.Event();
			this.onCellRangeSelected = new _utilEvents.Event();
		}

		CellRangeSelector.prototype.init = function init(grid) {
			this._decorator = new _CellRangeDecorator2(this._options);
			this._decorator.init(grid);
			this._grid = grid;
			this._canvas = this._grid.getCanvasNode();
			this._handler.subscribe(this._grid.onDragInit, this._handleDragInit.bind(this)).subscribe(this._grid.onDragStart, this._handleDragStart.bind(this)).subscribe(this._grid.onDrag, this._handleDrag.bind(this)).subscribe(this._grid.onDragEnd, this._handleDragEnd.bind(this));
		};

		CellRangeSelector.prototype.destroy = function destroy() {
			this._handler.unsubscribeAll();
		};

		CellRangeSelector.prototype._handleDragInit = function _handleDragInit(e, dd) {
			// prevent the grid from cancelling drag'n'drop by default
			e.stopImmediatePropagation();
		};

		CellRangeSelector.prototype._handleDragStart = function _handleDragStart(e, dd) {
			var cell = this._grid.getCellFromEvent(e);
			if (this.onBeforeCellRangeSelected.notify(cell) !== false) {
				if (this._grid.canCellBeSelected(cell.row, cell.cell)) {
					this._dragging = true;
					e.stopImmediatePropagation();
				}
			}

			if (!this._dragging) {
				return;
			}

			this._grid.focus();

			var start = this._grid.getCellFromPoint(dd.startX - this._canvas.offsetLeft, dd.startY - this._canvas.offsetTop);

			dd.range = { start: start, end: {} };

			return this._decorator.show(new _Range(start.row, start.cell));
		};

		CellRangeSelector.prototype._handleDrag = function _handleDrag(e, dd) {
			if (!this._dragging) {
				return;
			}

			e.stopImmediatePropagation();

			var end = this._grid.getCellFromPoint(e.pageX - this._canvas.offsetleft, e.pageY - this._canvas.offsetTop);

			if (!this._grid.canCellBeSelected(end.row, end.cell)) {
				return;
			}

			dd.range.end = end;
			this._decorator.show(new _Range(dd.range.start.row, dd.range.start.cell, end.row, end.cell));
		};

		CellRangeSelector.prototype._handleDragEnd = function _handleDragEnd(e, dd) {
			if (!this._dragging) {
				return;
			}

			this._dragging = false;
			e.stopImmediatePropagation();

			_utilMisc.hide(this._decorator);
			this.onCellRangeSelected.notify({
				range: new _Range(dd.range.start.row, dd.range.start.cell, dd.range.end.row, dd.range.end.cell)
			});
		};

		return CellRangeSelector;
	})();

	module.exports = _CellRangeDecorator2;
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc', '../util/events', '../selection/Range', './CellRangeSelector'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'), require('../util/events'), require('../selection/Range'), require('./CellRangeSelector'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.events, global.Range, global.CellRangeSelector);
		global.CellSelectionModel = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _utilEvents, _selectionRange, _CellRangeSelector) {
	'use strict';

	function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Range = _interopRequire(_selectionRange);

	var _CellRangeSelector2 = _interopRequire(_CellRangeSelector);

	var CellSelectionModel = (function () {
		function CellSelectionModel(options) {
			_classCallCheck(this, CellSelectionModel);

			var defaults = {
				selectActiveCell: true
			};

			this._grid = null;
			this._canvas = null;
			this._ranges = [];
			this._selector = new _CellRangeSelector2({
				selectionCss: {
					border: '2px solid black'
				}
			});
			this._options = _utilMisc.extend({}, defaults, options);
		}

		CellSelectionModel.prototype.init = function init(grid) {
			this._grid = grid;
			this._canvas = this._grid.getCanvasNode();

			this._boundHandleActiveCellChange = this._handleActiveCellChange.bind(this);
			this._boundHandleKeyDown = this._handleKeyDown.bind(this);
			this._boundHandleCellRangeSelected = this._handleCellRangeSelected.bind(this);
			this._boundHandleBeforeCellRangeSelected = this._handleBeforeCellRangeSelected.bind(this);

			this._grid.onActiveCellChanged.subscribe(this._boundHandleActiveCellChange);
			this._grid.onKeyDown.subscribe(this._boundHandleKeyDown);
			this._selector.onCellRangeSelected.subscribe(this._boundHandleCellRangeSelected);
			this._selector.onBeforeCellRangeSelected.subscribe(this._boundHandleBeforeCellRangeSelected);

			this._grid.registerPlugin(this._selector);
		};

		CellSelectionModel.prototype.destroy = function destroy() {
			this._grid.onActiveCellChanged.unsubscribe(this._boundHandleActiveCellChange);
			this._grid.onKeyDown.unsubscribe(this._boundHandleKeyDown);
			this._selector.onCellRangeSelected.unsubscribe(this._boundHandleCellRangeSelected);
			this._selector.onBeforeCellRangeSelected.unsubscribe(this._boundHandleBeforeCellRangeSelected);

			this._grid.unregisterPlugin(this._selector);
		};

		CellSelectionModel.prototype.removeInvalidRanges = function removeInvalidRanges(ranges) {
			var result = [];

			for (var i = 0; i < ranges.length; i++) {
				var r = ranges[i];
				if (this._grid.canCellBeSelected(r.fromRow, r.fromCell) && this._grid.canCellBeSelected(r.toRow, r.toCell)) {
					result.push(r);
				}
			}

			return result;
		};

		CellSelectionModel.prototype.setSelectedRanges = function setSelectedRanges(ranges) {
			this._ranges = this.removeInvalidRanges(ranges);
			this.onSelectedRangesChanged.notify(ranges);
		};

		CellSelectionModel.prototype.getSelectedRanges = function getSelectedRanges() {
			return this._ranges;
		};

		CellSelectionModel.prototype._handleBeforeCellRangeSelected = function _handleBeforeCellRangeSelected(info) {
			var e = info.event;
			if (this._grid.getEditorLock().isActive()) {
				e.stopPropagation();
			}
		};

		CellSelectionModel.prototype._handleCellRangeSelected = function _handleCellRangeSelected(info) {
			var data = info.data;
			this.setSelectedRanges([data.range]);
		};

		CellSelectionModel.prototype._handleActiveCellChange = function _handleActiveCellChange(info) {
			var e = info.event;
			if (this._options.selectActiveCell && e.data.row != null && e.data.cell != null) {
				this.setSelectedRanges([new _Range(e.data.row, e.data.cell)]);
			}
		};

		CellSelectionModel.prototype._handleKeyDown = function _handleKeyDown(info) {
			var e = info.event;
			/***
    * Кey codes
    * 37 left
    * 38 up
    * 39 right
    * 40 down
    */
			var active = this._grid.getActiveCell();

			if (active && e.shiftKey && !e.ctrlKey && !e.altKey && (e.which === _utilEvents.KEYCODES.LEFT || e.which === _utilEvents.KEYCODES.UP || e.which === _utilEvents.KEYCODES.RIGHT || e.which === _utilEvents.KEYCODES.DOWN)) {

				var ranges = this.getSelectedRanges();
				if (!ranges.length) ranges.push(new _Range(active.row, active.cell));

				// keyboard can work with last range only
				var last = ranges.pop();

				// can't handle selection out of active cell
				if (!last.contains(active.row, active.cell)) last = new _Range(active.row, active.cell);

				var dRow = last.toRow - last.fromRow,
				    dCell = last.toCell - last.fromCell,
				   

				// walking direction
				dirRow = active.row === last.fromRow ? 1 : -1,
				    dirCell = active.cell === last.fromCell ? 1 : -1;

				if (e.which === _utilEvents.KEYCODES.LEFT) {
					dCell -= dirCell;
				} else if (e.which === _utilEvents.KEYCODES.RIGHT) {
					dCell += dirCell;
				} else if (e.which === _utilEvents.KEYCODES.DOWN) {
					dRow -= dirRow;
				} else if (e.which === _utilEvents.KEYCODES.UP) {
					dRow += dirRow;
				}

				// define new selection range
				var new_last = new _Range(active.row, active.cell, active.row + dirRow * dRow, active.cell + dirCell * dCell);
				if (this.removeInvalidRanges([new_last]).length) {
					ranges.push(new_last);
					var viewRow = dirRow > 0 ? new_last.toRow : new_last.fromRow,
					    viewCell = dirCell > 0 ? new_last.toCell : new_last.fromCell;
					this._grid.scrollRowIntoView(viewRow);
					this._grid.scrollCellIntoView(viewRow, viewCell);
				} else {
					ranges.push(last);
				}

				this.setSelectedRanges(ranges);

				e.preventDefault();
				e.stopPropagation();
			}
		};

		return CellSelectionModel;
	})();

	module.exports = _CellRangeSelector2;
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/events', '../util/misc'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/events'), require('../util/misc'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.events, global.misc);
		global.CheckboxSelectColumn = mod.exports;
	}
})(this, function (exports, module, _utilEvents, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var CheckboxSelectColumn = (function () {
		function CheckboxSelectColumn(options) {
			_classCallCheck(this, CheckboxSelectColumn);

			var defaults = {
				columnId: '_checkbox_selector',
				cssClass: null,
				toolTip: 'Select/Deselect All',
				width: 30
			};

			this._options = _utilMisc.extend({}, defaults, options);
			this._grid = null;
			this._handler = new _utilEvents.EventHandler();
			this._selectedRowsLookup = {};
		}

		CheckboxSelectColumn.prototype.init = function init(grid) {
			this._grid = grid;
			this._handler.subscribe(this._grid.onSelectedRowsChanged, this._handleSelectedRowsChanged.bind(this)).subscribe(this._grid.onClick, this._handleClick.bind(this)).subscribe(this._grid.onHeaderClick, this._handleHeaderClick.bind(this)).subscribe(this._grid.onKeyDown, this._handleKeyDown.bind(this));
		};

		CheckboxSelectColumn.prototype.destroy = function destroy() {
			this._handler.unsubscribeAll();
		};

		CheckboxSelectColumn.prototype._handleSelectedRowsChanged = function _handleSelectedRowsChanged() {
			var selectedRows = this._grid.getSelectedRows(),
			    lookup = {};
			for (var i = 0; i < selectedRows.length; i++) {
				var row = selectedRows[i];
				lookup[row] = true;
				this._grid.invalidateRows(row);
			}

			for (var key in this._selectedRowsLookup) {
				this._grid.invalidateRows(key);
			}

			this._selectedRowsLookup = lookup;
			this._grid.render();

			if (selectedRows.length && selectedRows.length === this._grid.getDataLength()) {
				this._grid.updateColumnHeader(this._options.columnId, '<input type="checkbox" checked="checked">', this._options.toolTip);
			} else {
				this._grid.updateColumnHeader(this._options.columnId, '<input type="checkbox">', this._options.toolTip);
			}
		};

		CheckboxSelectColumn.prototype._handleKeyDown = function _handleKeyDown(info) {
			var e = info.event,
			    data = info.data;

			if (e.which === _utilEvents.KEYCODES.SPACE) {
				if (this._grid.getColumns()[data.cell].id === this._options.columnId) {
					// if editing, try to commit
					if (!this._grid.getEditorLock().isActive() || this._grid.getEditorLock().commitCurrentEdit()) {
						this.toggleRowSelection(data.row);
					}

					e.preventDefault();
					e.stopImmediatePropagation();
				}
			}
		};

		CheckboxSelectColumn.prototype._handleClick = function _handleClick(info) {
			var e = info.event,
			    data = info.data;

			// clicking on a row select checkbox
			if (this._grid.getColumns()[data.cell].id === this._options.columnId && (e.target.type || '').toLowerCase() === 'checkbox' && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
				// if editing, try to commit
				if (this._grid.getEditorLock().isActive() && !this._grid.getEditorLock().commitCurrentEdit()) {
					e.preventDefault();
					e.stopImmediatePropagation();
					return;
				}

				this.toggleRowSelection(data.row);
			}
		};

		CheckboxSelectColumn.prototype.toggleRowSelection = function toggleRowSelection(row) {
			if (this._selectedRowsLookup[row]) {
				this._grid.setSelectedRows(this._grid.getSelectedRows().filter(function (n) {
					return n !== row;
				}));
			} else {
				this._grid.setSelectedRows(this._grid.getSelectedRows().concat(row));
			}
		};

		CheckboxSelectColumn.prototype._handleHeaderClick = function _handleHeaderClick(info) {
			var e = info.event,
			    data = info.data;

			if (data.column.id === this._options.columnId && (e.target.type || '').toLowerCase() === 'checkbox') {
				// if editing, try to commit
				if (this._grid.getEditorLock().isActive() && !this._grid.getEditorLock().commitCurrentEdit()) {
					e.preventDefault();
					e.stopImmediatePropagation();
					return;
				}

				if ((e.target.type || '').toLowerCase() === 'checked') {
					var rows = [];
					for (var i = 0; i < this._grid.getDataLength(); i++) {
						rows.push(i);
					}

					this._grid.setSelectedRows(rows);
				} else {
					this._grid.setSelectedRows([]);
				}

				e.stopPropagation();
				e.stopImmediatePropagation();
			}
		};

		CheckboxSelectColumn.prototype.getColumnDefinition = function getColumnDefinition() {
			return {
				id: this._options.columnId,
				name: '<input type="checkbox">',
				toolTip: this._options.toolTip,
				field: 'sel',
				width: this._options.width,
				resizable: false,
				sortable: false,
				cssClass: this._options.cssClass,
				formatter: this.checkboxSelectionFormatter.bind(this)
			};
		};

		CheckboxSelectColumn.prototype.checkboxSelectionFormatter = function checkboxSelectionFormatter(row, cell, value, columnDef, dataContext) {
			if (dataContext) {
				return this._selectedRowsLookup[row] ? '<input type="checkbox" checked="checked">' : '<input type="checkbox">';
			}

			return null;
		};

		return CheckboxSelectColumn;
	})();

	module.exports = CheckboxSelectColumn;
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc);
		global.ColumnPicker = mod.exports;
	}
})(this, function (exports, module, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var ColumnPicker = (function () {
		function ColumnPicker(options) {
			_classCallCheck(this, ColumnPicker);

			var defaults = {
				fadeSpeed: 250
			};
			this._options = _utilMisc.extend({}, defaults, options);
			this._menu = null;
			this._columnCheckboxes = null;
			this._grid = null;
			this._columns = this._options.columns;
		}

		ColumnPicker.prototype.init = function init(grid) {
			var _this = this;

			this._boundUpdateColumnOrder = this._updateColumn.bind(this);
			grid.onHeaderContextMenu.subscribe(this._handleHeaderContextMenu);
			grid.onColumnsReordered.subscribe(this._boundUpdateColumnOrder);

			// Default to current grid columns
			this._columns = this._columns || grid.getColumns();

			this._menu = _utilMisc.createEl({
				tag: 'ul',
				className: 'spark-columnpicker',
				style: {
					display: 'none',
					position: 'absolute',
					zIndex: 20
				}
			});
			document.body.appendChild(this._menu);

			this._menu.addEventListener('mouseleave', function () {
				_utilMisc.hide(_this._menu);
			});

			this._menu.addEventListener('click', this._boundUpdateColumnOrder);
			this._grid = grid;
		};

		ColumnPicker.prototype.destroy = function destroy() {
			this._grid.onHeaderContextMenu.unsubscribe(this._handleHeaderContextMenu);
			this._grid.onColumnsReordered.unsubscribe(this._boundUpdateColumnOrder);
			_utilMisc.removeEl(this._menu);
		};

		ColumnPicker.prototype._handleHeaderContextMenu = function _handleHeaderContextMenu(info) {
			var e = info.event;

			e.preventDefault();

			this._menu.innerHTML = '';
			this.updateColumnOrder();
			this._columnCheckboxes = [];

			for (var i = 0; i < this._columns.length; i++) {
				var _li = _utilMisc.createEl({
					tag: 'li'
				});
				this._menu.appendChild(_li);
				var _input = _utilMisc.createEl({
					tag: 'input',
					type: 'checkbox'
				});
				_input.dataset.column_id = this._columns[i].id;
				this._columnCheckboxes.push(_input);

				if (this._grid.getColumnIndex(this._columns[i].id) != null) {
					_input.checked = true;
				}

				var _label = _utilMisc.createEl({
					tag: 'label',
					textContent: this._columns[i].name
				});

				_label.insertBefore(_input, _label.firstChild);
				_li.appendChild(_label);
			}

			var hr = _utilMisc.createEl({
				tag: 'hr'
			});
			this._menu.appendChild(hr);
			var li = _utilMisc.createEl({
				tag: 'li'
			});
			this._menu.appendChild(li);

			var input = _utilMisc.createEl({
				tag: 'input',
				type: 'checkbox'
			});
			input.dataset.option = 'autoresize';
			var label = _utilMisc.createEl({
				tag: 'label',
				textContent: 'Force fit columns'
			});
			label.insertBefore(input, label.firstChild);
			li.appendChild(label);

			if (this._grid.getOptions().forceFitColumns) {
				input.checked = true;
			}

			li = _utilMisc.createEl({
				tag: 'li'
			});

			this._menu.appendChild(li);
			input = _utilMisc.createEl({
				tag: 'input',
				type: 'checkbox'
			});
			input.dataset.option = 'syncresize';
			label = _utilMisc.createEl({
				tag: 'label',
				textContent: 'Synchronous resize'
			});
			label.insertBefore(input, label.firstChild);
			if (this._grid.getOptions().syncColumnCellResize) {
				input.checked = true;
			}

			_utilMisc.setPx(this._menu, 'top', e.pageY - 10);
			_utilMisc.setPx(this._menu, 'left', e.pageX - 10);
			_utilMisc.show(this._menu);
		};

		ColumnPicker.prototype._updateColumnOrder = function _updateColumnOrder() {
			// Because columns can be reordered, we have to update the `columns`
			// to reflect the new order, however we can't just take `grid.getColumns()`,
			// as it does not include columns currently hidden by the picker.
			// We create a new `columns` structure by leaving currently-hidden
			// columns in their original ordinal position and interleaving the results
			// of the current column sort.
			var current = this._grid.getColumns().slice(0),
			    ordered = new Array(this._columns.length);
			for (var i = 0; i < ordered.length; i++) {
				if (this._grid.getColumnIndex(this._columns[i].id) === undefined) {
					// If the column doesn't return a value from getColumnIndex,
					// it is hidden. Leave it in this position.
					ordered[i] = this._columns[i];
				} else {
					// Otherwise, grab the next visible column.
					ordered[i] = current.shift();
				}
			}

			this._columns = ordered;
		};

		ColumnPicker.prototype._updateColumn = function _updateColumn(e) {
			var _this2 = this;

			if (e.target.dataset.option === 'autoresize') {
				if (e.target.checked) {
					this._grid.setOptions({ forceFitColumns: true });
					this._grid.autosizeColumns();
				} else {
					this._grid.setOptions({ forceFitColumns: false });
				}

				return;
			}

			if (e.target.dataset.option === 'syncresize') {
				if (e.target.checked) {
					this._grid.setOptions({ syncColumnCellResize: true });
				} else {
					this._grid.setOptions({ syncColumnCellResize: false });
				}

				return;
			}

			if (e.target.type === 'checkbox') {
				var _ret = (function () {
					var visibleColumns = [];
					_this2._columnCheckboxes.forEach(function (c, i) {
						if (c.checked) {
							visibleColumns.push(this._columns[i]);
						}
					});

					if (!visibleColumns.length) {
						e.target.checked = true;
						return {
							v: undefined
						};
					}

					_this2._grid.setColumns(visibleColumns);
				})();

				if (typeof _ret === 'object') return _ret.v;
			}
		};

		ColumnPicker.prototype.getAllColumns = function getAllColumns() {
			return this._columns;
		};

		return ColumnPicker;
	})();

	module.exports = ColumnPicker;
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', '../util/misc'], factory);
	} else if (typeof exports !== 'undefined') {
		factory(exports, require('../util/misc'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, global.misc);
		global.CompositeEditor = mod.exports;
	}
})(this, function (exports, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var defaultOptions = {
		validationFailedMsg: 'Some of the fields have failed validation',
		show: null,
		hide: null,
		position: null,
		destroy: null
	},
	    noop = function noop() {};

	function getCompositeEditor(options) {
		var firstInvalidEditor = undefined,
		    containers = options.containers;

		options = _utilMisc.extend({}, defaultOptions, options);

		function getContainerBox(i) {
			var c = containers[i],
			    top = c.offsetTop,
			    left = c.offsetLeft,
			    width = c.offsetWidth,
			    height = c.offsetHeight;

			return {
				top: top,
				left: left,
				bottom: top + height,
				right: left + width,
				width: width,
				height: height,
				visible: true
			};
		}

		var CompositeEditor = (function () {
			function CompositeEditor(options) {
				_classCallCheck(this, CompositeEditor);

				this._columns = options.columns;

				var idx = this._columns.length;

				this._editors = [];
				while (idx--) {
					if (this._columns[idx].editor) {
						var newOptions = _utilMisc.extend({}, options);
						newOptions.container = containers[idx];
						newOptions.column = this._columns[idx];
						newOptions.position = getContainerBox(idx);
						newOptions.commitChanges = noop;
						newOptions.cancelChanges = noop;

						this._editors[idx] = new this._columns[idx].editor(newOptions);
					}
				}
			}

			CompositeEditor.prototype.destroy = function destroy() {
				this._editors.forEach(function (editor) {
					editor.destroy();
				});

				if (options.destroy) {
					options.destroy();
				}
			};

			CompositeEditor.prototype.focus = function focus() {
				// if validation has failed, set the focus to the first invalid editor
				(firstInvalidEditor || this._editors[0]).focus();
			};

			CompositeEditor.prototype.isValueChanged = function isValueChanged() {
				return this._editors.some(function (editor) {
					return editor.isValueChanged();
				});
			};

			CompositeEditor.prototype.serializeValue = function serializeValue() {
				return this._editors.reduce(function (prev, editor, index) {
					prev[index] = editor.serializeValue();
					return prev;
				}, {});
			};

			CompositeEditor.prototype.applyValue = function applyValue(item, state) {
				this._editors.forEach(function (editor, index) {
					editor.applyValue(item, state[index]);
				});
			};

			CompositeEditor.prototype.loadValue = function loadValue(item) {
				this._editors.forEach(function (editor, index) {
					editor.loadValue(item);
				});
			};

			CompositeEditor.prototype.validate = function validate() {
				var errors = [];
				firstInvalidEditor = null;

				this._editors.forEach(function (editor, index) {
					var validationResults = editor.validate();
					if (!validationResults.valid) {
						firstInvalidEditor = editor;
						errors.push({
							index: index,
							editor: editor,
							container: containers[index],
							msg: validationResults.msg
						});
					}
				});

				if (errors.length) {
					return {
						valid: false,
						msg: options.validationFailedMsg,
						errors: errors
					};
				} else {
					return {
						valid: true,
						msg: ''
					};
				}
			};

			CompositeEditor.prototype.hide = function hide() {
				this._editors.forEach(function (editor) {
					if (editor.hide) {
						editor.hide();
					}
				});
				if (options.hide) {
					options.hide();
				}
			};

			CompositeEditor.prototype.show = function show() {
				this._editors.forEach(function (editor) {
					if (editor.show) {
						editor.show();
					}
				});
				if (options.show) {
					options.show();
				}
			};

			CompositeEditor.prototype.position = function position(box) {
				if (options.position) {
					options.position(box);
				}
			};

			return CompositeEditor;
		})();

		return CompositeEditor;
	}
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc', '../grouping/Group', '../util/events'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'), require('../grouping/Group'), require('../util/events'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.Group, global.events);
		global.GroupItemMetadataProvider = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _groupingGroup, _utilEvents) {
	'use strict';

	function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Group = _interopRequire(_groupingGroup);

	var defaults = {
		groupCssClass: 'spark-group',
		groupTitleCssClass: 'spark-group-title',
		totalsCssClass: 'spark-group-totals',
		groupFocusable: true,
		totalsFocusable: false,
		toggleCssClass: 'spark-group-toggle',
		toggleExpandedCssClass: 'spark-icon-remove-circle',
		toggleCollapsedCssClass: 'spark-icon-add-circle',
		enableExpandCollapse: true,
		groupFormatter: defaultGroupCellFormatter,
		totalsFormatter: defaultTotalsCellFormatter
	};

	function defaultGroupCellFormatter(row, cell, value, columnDef, item) {
		if (!this._options.enableExpandCollapse) {
			return item.title;
		}

		var indentation = item.level * 15 + 'px';

		return '<span class="' + this._options.toggleCssClass + ' ' + (item.collapsed ? this._options.toggleCollapsedCssClass : this._options.toggleExpandedCssClass) + '" style="margin-left:' + indentation + '">' + '</span>' + '<span class="' + this._options.groupTitleCssClass + '" level="' + item.level + '">' + item.title + '</span>';
	}

	function defaultTotalsCellFormatter(row, cell, value, columnDef, item) {
		return columnDef.groupTotalsFormatter && columnDef.groupTotalsFormatter(item, columnDef) || '';
	}

	/***
  * Provides item metadata for group (spark.Group) and totals (spark.Totals) rows produced by the DataView.
  * This metadata overrides the default behavior and formatting of those rows so that they appear and function
  * correctly when processed by the grid.
  *
  * This class also acts as a grid plugin providing event handlers to expand & collapse groups.
  * If 'grid.registerPlugin(...)' is not called, expand & collapse will not work.
  *
  * @class GroupItemMetadataProvider
  * @constructor
  * @param options
  */

	var GroupItemMetadataProvider = (function () {
		function GroupItemMetadataProvider(options) {
			_classCallCheck(this, GroupItemMetadataProvider);

			this._options = _utilMisc.extend({}, defaults, options);
			this._grid = null;
		}

		GroupItemMetadataProvider.prototype.init = function init(grid) {
			this._grid = grid;
			this._boundHandleGridClick = this._handleGridClick.bind(this);
			this._boundHandleGridKeyDown = this._handleGridKeyDown.bind(this);
			grid.onClick.subscribe(this._boundHandleGridClick);
			grid.onKeyDown.subscribe(this._boundHandleGridKeyDown);
		};

		GroupItemMetadataProvider.prototype.destroy = function destroy() {
			if (this._grid) {
				this._grid.onClick.unsubscribe(this._boundHandleGridClick);
				this._grid.onKeyDown.unsubscribe(this._boundHandleGridKeyDown);
			}
		};

		GroupItemMetadataProvider.prototype.toggleGroup = function toggleGroup(e, cell) {
			var item = this._grid.getDataItem(cell.row);
			if (item && item instanceof _Group) {
				var range = this._grid.getRenderedRange(),
				    dataView = this._grid.getData();

				dataView.getData().setRefreshHints({
					ignoreDiffsBefore: range.top,
					ignoreDiffsAfter: range.bottom
				});

				if (item.collapsed) {
					dataView.expandGroup(0, item.groupingKey);
				} else {
					dataView.collapseGroup(0, item.groupingKey);
				}

				e.preventDefault();
			}
		};

		GroupItemMetadataProvider.prototype._handleGridClick = function _handleGridClick(info) {
			var data = info.data,
			    e = info.event,
			    item = this._grid.getDataItem(data.row);

			if (item && item instanceof _Group && e.target.classList.contains(this._options.toggleCssClass)) {
				this.toggleGroup(e, data);
			}
		};

		// TODO:  add -/+ handling

		GroupItemMetadataProvider.prototype._handleGridKeyDown = function _handleGridKeyDown(info) {
			var e = info.event;
			if (this._options.enableExpandCollapse && e.which === _utilEvents.KEYCODES.SPACE) {
				var activeCell = this.getActiveCell();
				if (activeCell) {
					this.toggleGroup(e, activeCell);
				}
			}
		};

		GroupItemMetadataProvider.prototype.getGroupRowMetadata = function getGroupRowMetadata() {
			return {
				selectable: false,
				focusable: this._options.groupFocusable,
				cssClasses: this._options.groupCssClass,
				columns: {
					0: {
						colspan: '*',
						formatter: this._options.groupFormatter,
						editor: null
					}
				}
			};
		};

		GroupItemMetadataProvider.prototype.getTotalsRowMetadata = function getTotalsRowMetadata() {
			return {
				selectable: false,
				focusable: this._options.totalsFocusable,
				cssClasses: this._options.totalsCssClass,
				formatter: this._options.totalsFormatter,
				editor: null
			};
		};

		return GroupItemMetadataProvider;
	})();

	module.exports = GroupItemMetadataProvider;
});
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
		global.HeaderButtons = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _utilEvents) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var defaults = {
		buttonCssClass: 'spark-header-button'
	};

	var HeaderButtons = (function () {
		function HeaderButtons(options) {
			_classCallCheck(this, HeaderButtons);

			this._grid = null;
			this._handler = new _utilEvents.EventHandler();
			this._options = _utilMisc.extend({}, defaults, options);
			this.onCommand = new _utilEvents.Event();
		}

		HeaderButtons.prototype.init = function init(grid) {
			this._grid = grid;
			this._boundHandleHeaderCellRendered = this._handleHeaderCellRendered.bind(this);
			this._boundHandleBeforeHeaderCellDestroy = this._handleBeforeHeaderCellDestroy.bind(this);
			this._boundHandleButtonClick = this._handleButtonClick.bind(this);
			this._handler.subscribe(grid.onHeaderCellRendered, this._boundHandleHeaderCellRendered).subscribe(grid.onBeforeHeaderCellDestroy, this._boundHandleBeforeHeaderCellDestroy);

			// Force the grid to re-render the header now that the events are hooked up.
			grid.setColumns(grid.getColumns());
		};

		HeaderButtons.prototype.destroy = function destroy() {
			this._handler.unsubscribeAll();
		};

		HeaderButtons.prototype._handleHeaderCellRendered = function _handleHeaderCellRendered(info) {
			var column = info.data.column;

			if (column.header && column.header.buttons) {
				// Append buttons in reverse order since they are floated to the right.
				var i = column.header.buttons.length;
				while (i--) {
					var button = column.header.buttons[i],
					    btn = _utilMisc.createEl({
						tag: 'div',
						className: this._options.buttonCssClass
					});

					btn.dataset.column = column;
					btn.dataset.button = button;

					if (button.showOnHover) {
						btn.classList.add('spark-header-button-hidden');
					}

					if (button.image) {
						btn.style.backgroundImage = 'url(' + button.image + ')';
					}

					if (button.cssClass) {
						btn.classList.add(button.cssClass);
					}

					if (button.tooltip) {
						btn.title = button.tooltip;
					}

					if (button.command) {
						btn.dataset.command = button.command;
					}

					if (button.handler) {
						btn.addEventListener('click', button.handler);
					}

					btn.addEventListener('click', this._boundHandleButtonClick);
					info.data.node.appendChild(btn);
				}
			}
		};

		HeaderButtons.prototype._handleBeforeHeaderCellDestroy = function _handleBeforeHeaderCellDestroy(info) {
			var column = info.data.column;

			if (column.header && column.header.buttons) {
				// Removing buttons via jQuery will also clean up any event handlers and data.
				// NOTE: If you attach event handlers directly or using a different framework,
				//       you must also clean them up here to avoid memory leaks.
				_utilMisc.slice(info.data.node.querySelectorAll('.' + this._options.buttonCssClass)).forEach(function (btn) {
					_utilMisc.removeEl(btn);
				});
			}
		};

		HeaderButtons.prototype._handleButtonClick = function _handleButtonClick(info) {
			var e = info.event,
			    el = e.target,
			    command = el.dataset.command,
			    columnDef = el.dataset.column,
			    button = el.dataset.button;

			if (command != null) {
				this.onCommand.notify({
					grid: this._grid,
					column: columnDef,
					command: command,
					button: button
				}, e, this);

				// Update the header in case the user updated the button definition in the handler.
				this._grid.updateColumnHeader(columnDef.id);
			}

			// Stop propagation so that it doesn't register as a header click event.
			e.preventDefault();
			e.stopPropagation();
		};

		return HeaderButtons;
	})();

	module.exports = HeaderButtons;
});

/***
 * A plugin to add custom buttons to column headers.
 *
 * USAGE:
 *
 * Add the plugin .js & .css files and register it with the grid.
 *
 * To specify a custom button in a column header, extend the column definition like so:
 *
 *   var columns = [
 *     {
   *       id: 'myColumn',
   *       name: 'My column',
   *
   *       // This is the relevant part
   *       header: {
   *          buttons: [
   *              {
   *                // button options
   *              },
   *              {
   *                // button options
   *              }
   *          ]
   *       }
   *     }
 *   ];
 *
 * Available button options:
 *    cssClass:     CSS class to add to the button.
 *    image:        Relative button image path.
 *    tooltip:      Button tooltip.
 *    showOnHover:  Only show the button on hover.
 *    handler:      Button click handler.
 *    command:      A command identifier to be passed to the onCommand event handlers.
 *
 * The plugin exposes the following events:
 *    onCommand:    Fired on button click for buttons with 'command' specified.
 *        Event args:
 *            grid:     Reference to the grid.
 *            column:   Column definition.
 *            command:  Button command identified.
 *            button:   Button options.  Note that you can change the button options in your
 *                      event handler, and the column header will be automatically updated to
 *                      reflect them.  This is useful if you want to implement something like a
 *                      toggle button.
 *
 *
 * @param options {Object} Options:
 *    buttonCssClass:   a CSS class to use for buttons (default 'slick-header-button')
 * @class Slick.Plugins.HeaderButtons
 * @constructor
 */
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc);
		global.HeaderMenu = mod.exports;
	}
})(this, function (exports, module, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var defaults = {
		buttonCssClass: null,
		buttonImage: null,
		headerActiveClass: 'spark-header-column-active'
	};

	/***
  * A plugin to add drop-down menus to column headers.
  *
  * USAGE:
  *
  * Add the plugin .js & .css files and register it with the grid.
  *
  * To specify a menu in a column header, extend the column definition like so:
  *
  *   var columns = [
  *     {
    *       id: 'myColumn',
    *       name: 'My column',
    *
    *       // This is the relevant part
    *       header: {
    *          menu: {
    *              items: [
    *                {
    *                  // menu item options
    *                },
    *                {
    *                  // menu item options
    *                }
    *              ]
    *          }
    *       }
    *     }
  *   ];
  *
  *
  * Available menu options:
  *    tooltip:      Menu button tooltip.
  *
  *
  * Available menu item options:
  *    title:        Menu item text.
  *    disabled:     Whether the item is disabled.
  *    tooltip:      Item tooltip.
  *    command:      A command identifier to be passed to the onCommand event handlers.
  *    iconCssClass: A CSS class to be added to the menu item icon.
  *    iconImage:    A url to the icon image.
  *
  *
  * The plugin exposes the following events:
  *    onBeforeMenuShow:   Fired before the menu is shown.  You can customize the menu or dismiss it by returning false.
  *        Event args:
  *            grid:     Reference to the grid.
  *            column:   Column definition.
  *            menu:     Menu options.  Note that you can change the menu items here.
  *
  *    onCommand:    Fired on menu item click for buttons with 'command' specified.
  *        Event args:
  *            grid:     Reference to the grid.
  *            column:   Column definition.
  *            command:  Button command identified.
  *            button:   Button options.  Note that you can change the button options in your
  *                      event handler, and the column header will be automatically updated to
  *                      reflect them.  This is useful if you want to implement something like a
  *                      toggle button.
  *
  *
  * @param options {Object} Options:
  *    buttonCssClass:   an extra CSS class to add to the menu button
  *    buttonImage:      a url to the menu button image (default '../images/down.gif')
  * @class Slick.Plugins.HeaderButtons
  * @constructor
  */

	var HeaderMenu = (function () {
		function HeaderMenu(options) {
			_classCallCheck(this, HeaderMenu);

			this._grid = null;
			this._handler = new _utilMisc.EventHandler();
			this._menu = null;
			this._activeHeaderColumn = null;

			this._options = _utilMisc.extend({}, defaults, options);

			this._boundShowMenu = this._showMenu.bind(this);
			this._boundHandleBodyMouseDown = this._handleBodyMouseDown.bind(this);
			this._boundHandleHeaderCellRendered = this._handleHeaderCellRendered.bind(this);
			this._boundHandleMenuItemClick = this._handleMenuItemClick.bind(this);
		}

		HeaderMenu.prototype.init = function init(grid) {
			this._grid = grid;
			this._handler.subscribe(this._grid.onHeaderCellRendered, this._boundHandleHeaderCellRendered).subscribe(this._grid.onBeforeHeaderCellDestroy, this._handleBeforeHeaderCellDestroy);

			// Force the grid to re-render the header now that the events are hooked up.
			this._grid.setColumns(this._grid.getColumns());

			// Hide the menu on outside click.
			document.body.addEventListener('mousedown', this._boundHandleBodyMouseDown);
		};

		HeaderMenu.prototype.destroy = function destroy() {
			this._handler.unsubscribeAll();
			document.body.removeEventListener('mousedown', this._boundHandleBodyMouseDown);
		};

		HeaderMenu.prototype._handleBodyMouseDown = function _handleBodyMouseDown(e) {
			if (this._menu !== e.target && !_utilMisc.closest(e.target, this._menu)) {
				this.hideMenu();
			}
		};

		HeaderMenu.prototype.hideMenu = function hideMenu() {
			if (this._menu) {
				_utilMisc.removeEl(this._menu);
				this._menu = null;
				this._activeHeaderColumn.classList.remove(this._options.headerActiveClass);
			}
		};

		HeaderMenu.prototype._handleHeaderCellRendered = function _handleHeaderCellRendered(info) {
			var column = info.data.column;
			var menu = column.header && column.header.menu;

			if (menu) {
				var el = _utilMisc.createEl({
					tag: 'div',
					className: 'spark-header-menubutton'
				});
				el.dataset.column = column;
				el.dataset.menu = menu;

				if (this._options.buttonCssClass) {
					el.classList.add(this._options.buttonCssClass);
				}

				if (this._options.buttonImage) {
					el.style.backgroundImage = 'url(" + options.buttonImage + ")';
				}

				if (menu.tooltip) {
					el.setAttribute('title', menu.tooltip);
				}

				el.addEventListener('click', this._boundShowMenu);
				info.data.node.appendChild(el);
			}
		};

		HeaderMenu.prototype._handleBeforeHeaderCellDestroy = function _handleBeforeHeaderCellDestroy(info) {
			var column = info.data.column;

			if (column.header && column.header.menu) {
				_utilMisc.removeEl(info.data.node.querySelector('.spark-header-menubutton'));
			}
		};

		HeaderMenu.prototype._showMenu = function _showMenu(e) {
			var menuButton = e.currentTarget,
			    menu = menuButton.dataset.menu,
			    columnDef = menuButton.dataset.column;

			// Let the user modify the menu or cancel altogether,
			// or provide alternative menu implementation.
			if (this.onBeforeMenuShow.notify({
				grid: this._grid,
				column: columnDef,
				menu: menu
			}, e, this) === false) {
				return;
			}

			if (!menu) {
				menu = _utilMisc.createEl({
					tag: 'div',
					className: 'spark-header-menu'
				});
				this._grid.getContainerNode().appendChild(menu);
			}

			menu.innerHTML = '';

			// Construct the menu items.
			for (var i = 0; i < menu.items.length; i++) {
				var item = menu.items[i],
				    li = _utilMisc.createEl({
					tag: 'div',
					className: 'spark-header-menuitem'
				});
				li.dataset.command = item.command || '';
				li.dataset.column = columnDef;
				li.dataset.item = item;
				li.addEventListener('click', this._boundHandleMenuItemClick);
				menu.appendChild(li);

				if (item.disabled) {
					li.classList.add('spark-header-menuitem-disabled');
				}

				if (item.tooltip) {
					li.setAttribute('title', item.tooltip);
				}

				var icon = _utilMisc.createEl({
					tag: 'div',
					className: 'spark-header-menuicon'
				});
				li.appendChild(icon);
				if (item.iconCssClass) {
					icon.classList.add(item.iconCssClass);
				}

				if (item.iconImage) {
					icon.style.backgroundImage = 'url(" + item.iconImage + ")';
				}

				var span = _utilMisc.createEl({
					tag: 'span',
					className: 'spark-header-menucontent',
					textContent: item.title
				});
				li.appendChild(li);
			}

			// Position the menu.
			_utilMisc.setPx(menu, 'top', menuButton.offsetTop + menuButton.offsetHeight);
			_utilMisc.setPx(menu, 'left', menuButton.offsetLeft);

			// Mark the header as active to keep the highlighting.
			this._activeHeaderColumn = _utilMisc.closest(menuButton, '.spark-header-column');
			this._activeHeaderColumn.classList.add(this._options.headerActiveClass);

			// Stop propagation so that it doesn't register as a header click event.
			e.preventDefault();
			e.stopPropagation();
		};

		HeaderMenu.prototype._handleMenuItemClick = function _handleMenuItemClick(e) {
			var menuItem = e.currentTarget,
			    command = menuItem.dataset.command,
			    columnDef = menuItem.dataset.column,
			    item = menuItem.dataset.item;

			if (item.disabled) {
				return;
			}

			this.hideMenu();

			if (command != null && command !== '') {
				this.onCommand.notify({
					grid: this._grid,
					column: columnDef,
					command: command,
					item: item
				}, e, this);
			}

			// Stop propagation so that it doesn't register as a header click event.
			e.preventDefault();
			e.stopPropagation();
		};

		return HeaderMenu;
	})();

	module.exports = HeaderMenu;
});
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

	function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Grid2 = _interopRequire(_Grid);

	var GlobalEditorLock = _Grid2.GlobalEditorLock;

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
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc', '../util/events', '../selection/Range'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'), require('../util/events'), require('../selection/Range'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.events, global.Range);
		global.RowSelectionModel = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _utilEvents, _selectionRange) {
	'use strict';

	function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Range = _interopRequire(_selectionRange);

	var defaults = {
		selectActiveRow: true
	};

	var RowSelectionModel = (function () {
		function RowSelectionModel(options) {
			_classCallCheck(this, RowSelectionModel);

			this._grid = null;
			this._ranges = [];
			this._handler = new _utilEvents.EventHandler();
			this._inHandler = null;
			this._options = _utilMisc.extend({}, defaults, options);

			this.onSelectedRangesChanged = new _utilEvents.Event();
		}

		RowSelectionModel.prototype._handleActiveCellChange = function _handleActiveCellChange(info) {
			var data = info.data;
			if (this._options.selectActiveRow && data.row != null) {
				this.setSelectedRanges([new _Range(data.row, 0, data.row, this._grid.getColumns().length - 1)]);
			}
		};

		RowSelectionModel.prototype._handleKeyDown = function _handleKeyDown(info) {
			var e = info.event,
			    activeRow = this._grid.getActiveCell();
			if (activeRow && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.which === 38 || e.which === 40)) {
				var selectedRows = this.getSelectedRows();
				selectedRows.sort(function (x, y) {
					return x - y;
				});

				if (!selectedRows.length) {
					selectedRows = [activeRow.row];
				}

				var _top = selectedRows[0],
				    bottom = selectedRows[selectedRows.length - 1],
				    active = undefined;

				if (e.which === 40) {
					active = activeRow.row < bottom || _top === bottom ? ++bottom : ++_top;
				} else {
					active = activeRow.row < bottom ? --bottom : --_top;
				}

				if (active >= 0 && active < this._grid.getDataLength()) {
					this._grid.scrollRowIntoView(active);
					this._ranges = this._rowsToRanges(this._getRowsRange(_top, bottom));
					this.setSelectedRanges(this._ranges);
				}

				e.preventDefault();
				e.stopPropagation();
			}
		};

		RowSelectionModel.prototype._handleClick = function _handleClick(info) {
			var e = info.event,
			    cell = this._grid.getCellFromEvent(e);
			if (!cell || !this._grid.canCellBeActive(cell.row, cell.cell)) {
				return false;
			}

			if (!this._grid.getOptions().multiSelect || !e.ctrlKey && !e.shiftKey && !e.metaKey) {
				return false;
			}

			var selection = this._rangesToRows(this._ranges),
			    idx = selection.indexOf(cell.row);

			if (idx === -1 && (e.ctrlKey || e.metaKey)) {
				selection.push(cell.row);
				this._grid.setActiveCell(cell.row, cell.cell);
			} else if (idx !== -1 && (e.ctrlKey || e.metaKey)) {
				selection = selection.filter(function (o, i) {
					return o !== cell.row;
				});
				this._grid.setActiveCell(cell.row, cell.cell);
			} else if (selection.length && e.shiftKey) {
				var last = selection.pop(),
				    from = Math.min(cell.row, last),
				    to = Math.max(cell.row, last);
				selection = [];
				for (var i = from; i <= to; i++) {
					if (i !== last) {
						selection.push(i);
					}
				}

				selection.push(last);
				this._grid.setActiveCell(cell.row, cell.cell);
			}

			this._ranges = this._rowsToRanges(selection);
			this.setSelectedRanges(this._ranges);
			e.stopPropagation();

			return true;
		};

		RowSelectionModel.prototype._wrapHandler = function _wrapHandler(handler) {
			var me = this;
			return function () {
				if (!this._inHandler) {
					this._inHandler = true;
					handler.apply(me, arguments);
					this._inHandler = false;
				}
			};
		};

		RowSelectionModel.prototype._rangesToRows = function _rangesToRows(ranges) {
			var rows = [];
			for (var i = 0; i < ranges.length; i++) {
				for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
					rows.push(j);
				}
			}

			return rows;
		};

		RowSelectionModel.prototype._rowsToRanges = function _rowsToRanges(rows) {
			var ranges = [],
			    lastCell = this._grid.getColumns().length - 1;
			for (var i = 0; i < rows.length; i++) {
				ranges.push(new _Range(rows[i], 0, rows[i], lastCell));
			}

			return ranges;
		};

		RowSelectionModel.prototype._getRowsRange = function _getRowsRange(from, to) {
			var i = undefined,
			    rows = [];
			for (i = from; i <= to; i++) {
				rows.push(i);
			}

			for (i = to; i < from; i++) {
				rows.push(i);
			}

			return rows;
		};

		RowSelectionModel.prototype.init = function init(grid) {
			this._grid = grid;
			this._handler.subscribe(this._grid.onActiveCellChanged, this._wrapHandler(this._handleActiveCellChange));
			this._handler.subscribe(this._grid.onKeyDown, this._wrapHandler(this._handleKeyDown));
			this._handler.subscribe(this._grid.onClick, this._wrapHandler(this._handleClick));
		};

		RowSelectionModel.prototype.destroy = function destroy() {
			this._handler.unsubscribeAll();
		};

		RowSelectionModel.prototype.getSelectedRows = function getSelectedRows() {
			return this._rangesToRows(this._ranges);
		};

		RowSelectionModel.prototype.setSelectedRows = function setSelectedRows(rows) {
			this.setSelectedRanges(this._rowsToRanges(rows));
		};

		RowSelectionModel.prototype.setSelectedRanges = function setSelectedRanges(ranges) {
			this._ranges = ranges;
			this.onSelectedRangesChanged.notify(ranges);
		};

		RowSelectionModel.prototype.getSelectedRanges = function getSelectedRanges() {
			return this._ranges;
		};

		return RowSelectionModel;
	})();

	module.exports = RowSelectionModel;
});
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
(function (global, factory) {
	if (typeof define === "function" && define.amd) {
		define(["exports"], factory);
	} else if (typeof exports !== "undefined") {
		factory(exports);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports);
		global.events = mod.exports;
	}
})(this, function (exports) {
	"use strict";

	exports.__esModule = true;

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/**
  * Created by taylorhakes on 3/13/15.
  */ /***
     * An event object for passing data to event handlers and letting them control propagation.
     * <p>This is pretty much identical to how W3C and jQuery implement events.</p>
     * @class EventControl
     * @constructor
     */

	var EventControl = (function () {
		function EventControl() {
			_classCallCheck(this, EventControl);

			this._isStopped = false;
		}

		/***
   * Stops event from propagating up the DOM tree.
   * @method stop
   */

		EventControl.prototype.stop = function stop() {
			this._isStopped = true;
		};

		/***
   * Returns whether stopPropagation was called on this event object.
   * @method isStopped
   * @return {Boolean}
   */

		EventControl.prototype.isStopped = function isStopped() {
			return this._isStopped;
		};

		return EventControl;
	})();

	/***
  * A simple publisher-subscriber implementation.
  * @class Event
  * @constructor
  */

	var Event = (function () {
		function Event() {
			_classCallCheck(this, Event);

			this._handlers = [];
		}

		/***
   * Adds an event handler to be called when the event is fired.
   * <p>Event handler will receive two arguments - an <code>EventData</code> and the <code>data</code>
   * object the event was fired with.<p>
   * @method subscribe
   * @param fn {Function} Event handler.
   */

		Event.prototype.subscribe = function subscribe(fn) {
			this._handlers.push(fn);
		};

		/***
   * Removes an event handler added with <code>subscribe(fn)</code>.
   * @method unsubscribe
   * @param fn {Function} Event handler to be removed.
   */

		Event.prototype.unsubscribe = function unsubscribe(fn) {
			for (var i = this._handlers.length - 1; i >= 0; i--) {
				if (this._handlers[i] === fn) {
					this._handlers.splice(i, 1);
				}
			}
		};

		/***
   * Fires an event notifying all subscribers.
   * @method notify
   * @param data {Object} Additional data object to be passed to all handlers.
   * @param e {EventControl}
   *      Optional.
   *      An <code>EventData</code> object to be passed to all handlers.
   *      For DOM events, an existing W3C/jQuery event object can be passed in.
   * @param scope {Object}
   *      Optional.
   *      The scope ("this") within which the handler will be executed.
   *      If not specified, the scope will be set to the <code>Event</code> instance.
   */

		Event.prototype.notify = function notify(data, e, scope) {
			var eventControl = new EventControl();
			scope = scope || this;

			for (var i = 0; i < this._handlers.length; i++) {
				this._handlers[i].call(scope, {
					event: e,
					data: data,
					stop: eventControl.stop
				});
			}

			return !eventControl.isStopped();
		};

		return Event;
	})();

	var EventHandler = (function () {
		function EventHandler() {
			_classCallCheck(this, EventHandler);

			this._handlers = [];
		}

		EventHandler.prototype.subscribe = function subscribe(event, handler) {
			this._handlers.push({
				event: event,
				handler: handler
			});
			event.subscribe(handler);

			return this; // allow chaining
		};

		EventHandler.prototype.unsubscribe = function unsubscribe(event, handler) {
			var i = this._handlers.length;
			while (i--) {
				if (this._handlers[i].event === event && this._handlers[i].handler === handler) {
					this._handlers.splice(i, 1);
					event.unsubscribe(handler);
					return;
				}
			}

			return this; // allow chaining
		};

		EventHandler.prototype.unsubscribeAll = function unsubscribeAll() {
			var i = this._handlers.length;
			while (i--) {
				this._handlers[i].event.unsubscribe(this._handlers[i].handler);
			}

			this._handlers = [];

			return this; // allow chaining
		};

		return EventHandler;
	})();

	var KEYCODES = Object.freeze({
		ESCAPE: 27,
		SPACE: 32,
		LEFT: 37,
		RIGHT: 39,
		UP: 38,
		DOWN: 40,
		ENTER: 13,
		TAB: 9,
		C: 67,
		V: 86
	});

	exports.Event = Event;
	exports.EventHandler = EventHandler;
	exports.EventControl = EventControl;
	exports.KEYCODES = KEYCODES;
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports'], factory);
	} else if (typeof exports !== 'undefined') {
		factory(exports);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports);
		global.formatters = mod.exports;
	}
})(this, function (exports) {
	'use strict';

	exports.__esModule = true;
	function PercentComplete(row, cell, value, columnDef, dataContext) {
		var className = undefined;
		if (value == null) {
			return '';
		}

		if (value < 50) {
			className = 'spark-bad';
		} else {
			className = 'spark-good';
		}

		return '<span class="' + className + '">' + value + '%</span>';
	}

	function PercentCompleteBar(row, cell, value, columnDef, dataContext) {
		var className = undefined;

		if (value == null) {
			return '';
		}

		if (value < 30) {
			className = 'spark-bad';
		} else if (value < 70) {
			className = 'spark-ok';
		} else {
			className = 'spark-good';
		}

		return '<span class="spark-bar ' + className + '" style="width:' + value + '%"></span>';
	}

	function YesNo(row, cell, value, columnDef, dataContext) {
		if (value == null) {
			return '';
		}

		return value ? 'Yes' : 'No';
	}

	function Checkmark(row, cell, value, columnDef, dataContext) {
		return value ? '<i class="spark-icon-check"></i>' : '';
	}

	exports.PercentComplete = PercentComplete;
	exports.PercentCompleteBar = PercentCompleteBar;
	exports.YesNo = YesNo;
	exports.Checkmark = Checkmark;
});
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports'], factory);
	} else if (typeof exports !== 'undefined') {
		factory(exports);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports);
		global.misc = mod.exports;
	}
})(this, function (exports) {
	'use strict';

	exports.__esModule = true;
	var matchesSelector = null,
	    selectors = ['matches', 'mozMatchesSelector', 'webkitMatchesSelector', 'msMatchesSelector'],
	    i = 0,
	    len = selectors.length;

	for (; i < len; i++) {
		var sel = selectors[i];
		if (document.body[sel]) {
			matchesSelector = sel;
		}
	}

	/**
  * Mix objects together, 1 level deep
  * @param obj {Object} source object
  * @returns {Object}
  */
	function extend(obj /* ...objects */) {
		for (var _i = 1, _len = arguments.length; _i < _len; _i++) {
			var source = arguments[_i];
			if (source) {
				for (var prop in source) {
					if (source.hasOwnProperty(prop)) {
						obj[prop] = source[prop];
					}
				}
			}
		}

		return obj;
	}

	function deepExtend(obj /* ...objects */) {
		for (var _i2 = 1, _len2 = arguments.length; _i2 < _len2; _i2++) {
			var source = arguments[_i2];
			if (source) {
				for (var prop in source) {
					if (source.hasOwnProperty(prop)) {
						if (typeof source[prop] === 'object' && source[prop] && !Array.isArray(source[prop])) {
							if (typeof obj[prop] !== 'object' || !obj[prop]) {
								obj[prop] = {};
							}

							deepExtend(obj[prop], source[prop]);
						} else {
							obj[prop] = source[prop];
						}
					}
				}
			}
		}

		return obj;
	}

	/**
  * Wrapper for querySelectorAll, but returns an array
  * @param selector {string} Search selector, i.e. #myId, .myClass, etc.
  * @param el {HTMLElement} parent element for query, defaults to document
  * @returns {Array}
  */
	function query(selector, el) {
		return slice((el || document).querySelectorAll(selector));
	}

	function closest(el, selector, lastEl) {
		// Go through parents and check matches
		while (true) {
			if (el && (el === selector || typeof selector === 'string' && el[matchesSelector] && el[matchesSelector](selector))) {
				return el;
			}

			if (!el || el === lastEl || typeof lastEl === 'string' && el[matchesSelector](lastEl)) {
				return null;
			}

			el = el.parentNode;
		}
	}

	/**
  * Delegate an event to a sub element
  * @param {HTMLElement} elem
  * @param {string} event
  * @param {string} selector
  * @param {function} fn
  */
	function delegate(elem, event, selector, fn) {
		var events = event.split(' ');

		function handleEvent(e) {
			var delEl = closest(e.target, selector, elem);
			if (delEl) {
				fn.call(delEl, e);
			}
		}

		for (i = 0, len = events.length; i < len; i++) {
			var ev = events[i];
			elem.addEventListener(ev, handleEvent);
		}
	}

	/**
  * Create an HTML element
  * @param options
  * @returns {HTMLElement}
  */
	function createEl(options) {
		var el = document.createElement(options.tag);
		if (options.style) {
			setStyle(el, options.style);
		}

		delete options.style;
		delete options.tag;

		extend(el, options);

		return el;
	}

	/**
  * Set the CSS styles of an HTML Element
  * @param el
  * @param styles
  * @returns {Object}
  */
	function setStyle(el, styles) {
		return extend(el.style, styles);
	}

	/**
  * Remove a/multiple HTML element from the DOM
  * @param {HTMLElement|Array<HTMLElement>} el
  */
	function removeEl(els) {
		if (!Array.isArray(els)) {
			els = [els];
		}

		var index = els.length;
		while (index--) {
			var el = els[index];
			if (el && el.parentNode) {
				el.parentNode.removeChild(el);
			}
		}
	}

	/**
  * Functional array slice
  */
	function slice(item, start, end) {
		return Array.prototype.slice.call(item, start, end);
	}

	//var slice = Function.prototype.call.bind(Array.prototype.slice);

	/**
  * Set a CSS style with in pixels
  * @param {HTMLElement} el
  * @param {string} prop
  * @param {string|number} val
  */
	function setPx(el, prop, val) {
		el.style[prop] = val + 'px';
	}

	/**
  * Get a pixel value as a number
  * @param {HTMLElement} el
  * @param {string} prop
  * @returns {Number}
  */
	function getPx(el, prop) {
		return parseFloat(el.style[prop] || 0);
	}

	/**
  * Toggle the visibility of an element
  * @param {HTMLElement} el
  */
	function toggle(el) {
		if (el.style.display === 'none') {
			show(el);
		} else {
			hide(el);
		}
	}

	/**
  * Display hide and element
  * @param el
  */
	function hide(el) {
		el.style.display = 'none';
	}

	/**
  * Remove display property from element
  * @param el
  */
	function show(el) {
		el.style.display = '';
	}

	/**
  * Toggle a CSS class
  * @param {HTMLElement} el
  * @param {string} className
  */
	function toggleClass(el, className) {
		if (el.classList.contains(className)) {
			el.classList.remove(className);
		} else {
			el.classList.add(className);
		}
	}

	exports.slice = slice;
	exports.createEl = createEl;
	exports.setStyle = setStyle;
	exports.setPx = setPx;
	exports.getPx = getPx;
	exports.toggle = toggle;
	exports.show = show;
	exports.hide = hide;
	exports.toggleClass = toggleClass;
	exports.removeEl = removeEl;
	exports.delegate = delegate;
	exports.closest = closest;
	exports.extend = extend;
	exports.deepExtend = deepExtend;
	exports.query = query;
});