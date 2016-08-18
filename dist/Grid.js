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

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _Range = _interopRequireDefault(_selectionRange);

	var _EditorLock = _interopRequireDefault(_editingEditorLock);

	// shared across all grids on the page
	var scrollbarDimensions = undefined,
	    maxSupportedCssHeight = undefined,
	    // browser's breaking point
	uidIndex = 1,
	    GlobalEditorLock = new _EditorLock['default']();

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

		/**
   * Singleton editor lock for allowing only one cell on any grid to be editable
   */

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
				ranges.push(new _Range['default'](rows[i], 0, rows[i], lastCell));
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
			var viewportTop = arguments.length <= 0 || arguments[0] === undefined ? this._scrollTop : arguments[0];
			var viewportLeft = arguments.length <= 1 || arguments[1] === undefined ? this._scrollLeft : arguments[1];

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

	Grid.GlobalEditorLock = GlobalEditorLock;

	module.exports = Grid;
});