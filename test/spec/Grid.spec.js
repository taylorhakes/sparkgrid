import Grid from 'spark/Grid';

(function(jas) {
	function newEl() {
		return document.createElement('div');
	}

	describe('Grid', function() {
		var formatterFactory = function() {},
			editorFactory = function() {},
			dataColumnValueExtractor = function() {},
		changedOptions = {
			explicitInitialization: true,
			rowHeight: 40,
			defaultColumnWidth: 40,
			enableAddRow: true,
			leaveSpaceForNewRows: false,
			editable: true,
			autoEdit: true,
			enableCellNavigation: false,
			enableColumnReorder: false,
			asyncEditorLoading: true,
			asyncEditorLoadDelay: 300,
			forceFitColumns: false,
			enableAsyncPostRender: true,
			asyncPostRenderDelay: 111,
			autoHeight: true,
			showHeaderRow: true,
			headerRowHeight: 41,
			showTopPanel: true,
			topPanelHeight: 41,
			formatterFactory: formatterFactory,
			editorFactory: editorFactory,
			cellFlashingCssClass: "lights",
			selectedCellCssClass: "itsmine",
			multiSelect: false,
			enableTextSelectionOnCells: true,
			dataItemColumnValueExtractor: dataColumnValueExtractor,
			fullWidthRows: true,
			multiColumnSort: true,
			forceSyncScrolling: true,
			addNewRowCssClass: "old"
		};

		describe('constructor', function() {
			it('minimal options', function() {
				var grid = new Grid({
					el: newEl(),
					columns: []
				});
				expect(grid instanceof Grid).toBe(true);
			});
			it('columns', function() {
				var columns = [
					{ id: "title", name: "Title", field: "title" },
					{ id: "duration", name: "Duration", field: "duration" }
				];
				var grid = new Grid({
					el: newEl(),
					columns: columns
				});
				var newColumns = grid.getColumns();
				newColumns.forEach(function(c, i) {
					expect(c).toEqual(jas.objectContaining(columns[i]));
				});

			});
			it('options', function() {
				var columns = [];
				var grid = new Grid({
					el: newEl(),
					columns: columns
				});
				expect(grid.getOptions()).toEqual(jas.objectContaining({
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
					forceSyncScrolling: false,
					addNewRowCssClass: "new-row"
				}));
			});
			it('options changed', function() {
				var columns = [];
				var grid = new Grid({
					el: newEl(),
					columns: columns,
					explicitInitialization: true,
					rowHeight: 40,
					defaultColumnWidth: 40,
					enableAddRow: true,
					leaveSpaceForNewRows: true,
					editable: true,
					autoEdit: true,
					enableCellNavigation: false,
					enableColumnReorder: false,
					asyncEditorLoading: true,
					asyncEditorLoadDelay: 300,
					forceFitColumns: false,
					enableAsyncPostRender: true,
					asyncPostRenderDelay: 111,
					autoHeight: true,
					showHeaderRow: true,
					headerRowHeight: 41,
					showTopPanel: true,
					topPanelHeight: 41,
					formatterFactory: formatterFactory,
					editorFactory: editorFactory,
					cellFlashingCssClass: "lights",
					selectedCellCssClass: "itsmine",
					multiSelect: false,
					enableTextSelectionOnCells: true,
					dataItemColumnValueExtractor: dataColumnValueExtractor,
					fullWidthRows: true,
					multiColumnSort: true,
					forceSyncScrolling: true,
					addNewRowCssClass: "old"
				});
				expect(grid.getOptions()).toEqual(jas.objectContaining(changedOptions));
			});
			it('error on empty options', function() {
				expect(function() {
					new Grid();
				}).toThrow();
			});
			it('error on no container', function() {
				expect(function() {
					new Grid({});
				}).toThrow();
			});
			it('error on no columns', function() {
				expect(function() {
					new Grid({
						el: newEl()
					});
				}).toThrow();
			});
			it('error on init twice', function() {
				expect(function() {
					var grid = new Grid({
						el: newEl(),
						columns: []
					});
					grid.init();
				}).toThrow();
			});
			it('no error on explicit init', function() {
				var grid = new Grid({
					el: newEl(),
					columns: [],
					explicitInitialization: true
				});
				grid.init();
				expect(grid instanceof Grid).toBe(true);
			});
		});
		describe('plugins', function() {
			var fakePlugin;
			beforeEach(function() {
				fakePlugin = {
					init: jas.createSpy('init'),
					destroy: jas.createSpy('destroy')
				}
			});
			it('registerPlugin', function() {
				var grid = new Grid({
					el: newEl(),
					columns: []
				});
				grid.registerPlugin(fakePlugin);
				expect(fakePlugin.init).toHaveBeenCalledWith(grid);
			});
			it('unregisterPlugin', function() {
				var grid = new Grid({
					el: newEl(),
					columns: []
				});
				grid.registerPlugin(fakePlugin);
				grid.unregisterPlugin(fakePlugin);
				expect(fakePlugin.destroy).toHaveBeenCalled();
			});
			it('unregisterPlugin no destroy fn', function() {
				var grid = new Grid({
					el: newEl(),
					columns: []
				});
				delete fakePlugin.destroy;
				grid.registerPlugin(fakePlugin);
				grid.unregisterPlugin(fakePlugin);
				expect(typeof fakePlugin).toBe('object');
			});
			it('unregisterPlugin not registered', function() {
				var grid = new Grid({
					el: newEl(),
					columns: []
				});
				delete fakePlugin.destroy;
				grid.unregisterPlugin(fakePlugin);
				expect(typeof fakePlugin).toBe('object');
			});
		});
		describe('columns', function() {
			var columns;
			beforeEach(function() {
				columns = [
					{ id: "title", name: "Title", field: "title" },
					{ id: "duration", name: "Duration", field: "duration" }
				]
			});
			describe('setColumns & getColumns', function() {
				it('empty columns', function() {
					var grid = new Grid({
						el: newEl(),
						columns: []
					});
					grid.setColumns(columns);
					var newColumns = grid.getColumns();
					newColumns.forEach(function(c, i) {
						expect(c).toEqual(jas.objectContaining(newColumns[i]));
					});
				});
				it('multiple columns', function() {
					var grid = new Grid({
						el: newEl(),
						columns: [
							{ id: 'test', name: 'Test', field: 'test'},
							{ id: 'fun', name: 'Fun', field: 'fun'},
							{ id: 'hello', name: 'Hello', field: 'hello'}
						]
					});
					grid.setColumns(columns);
					var newColumns = grid.getColumns();
					newColumns.forEach(function(c, i) {
						expect(c).toEqual(jas.objectContaining(newColumns[i]));
					});
				});
			});
			describe('getColumnIndex', function() {
				it('empty', function() {
					var grid = new Grid({
						el: newEl(),
						columns: []
					});
					expect(grid.getColumnIndex('id')).toBe(undefined);
				});
				it('multiple', function() {
					var grid = new Grid({
						el: newEl(),
						columns: columns
					});
					expect(grid.getColumnIndex('duration')).toBe(1);
				});
			});
			describe('setSortColumns', function() {
				var grid;
				beforeEach(function() {
					grid = new Grid({
						el: newEl(),
						columns: columns
					})
				});

				it('single col', function() {
					var sortCols = [{ columnId: 'duration' }];
					grid.setSortColumns(sortCols);
					expect(grid.getSortColumns()).toBe(sortCols);
				});
				it('multiple cols', function() {
					var sortCols = [{ columnId: 'duration' }, { columnId: 'title'}];
					grid.setSortColumns(sortCols);
					expect(grid.getSortColumns()).toBe(sortCols);
				});
				it('multiple cols sortAsc', function() {
					var sortCols = [{ columnId: 'duration', sortAsc: false }, { columnId: 'title'}];
					grid.setSortColumns(sortCols);
					expect(grid.getSortColumns()).toBe(sortCols);
				});
			});
		});
		describe('options', function() {
			var grid;
			beforeEach(function() {
				grid = new Grid({
					el: newEl(),
					columns: []
				})
			});

			it('setOptions', function() {
				grid.setOptions(changedOptions);
				expect(grid.getOptions()).toEqual(jas.objectContaining(changedOptions));
			});
		})
	});

})(jasmine);
