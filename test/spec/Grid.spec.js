import Grid from 'spark/Grid';
import { q, ThrottleMock } from './util';
import SelectionModelMock from './mocks/SelectionModel';
import EditorLock from './mocks/EditorLock';

(function(jas, describe, it, expect, beforeEach) {
	function newEl() {
		return document.createElement('div');
	}

	function gridInit(context) {
		context.grid = new Grid({
			el: newEl(),
			columns: []
		});
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
			enableTextSelectionOnCells: false,
			dataItemColumnValueExtractor: dataColumnValueExtractor,
			fullWidthRows: true,
			multiColumnSort: true,
			forceSyncScrolling: true,
			addNewRowCssClass: "old"
		};
		afterEach(function() {
			if (this.grid) {
				this.grid.destroy();
			}
		});

		describe('constructor', function() {
			it('minimal options', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: []
				});
				expect(this.grid instanceof Grid).toBe(true);
			});
			it('columns', function() {
				var columns = [
					{ id: "title", name: "Title", field: "title" },
					{ id: "duration", name: "Duration", field: "duration" }
				];
				this.grid =new Grid({
					el: newEl(),
					columns: columns
				});
				var newColumns = this.grid.getColumns();
				newColumns.forEach(function(c, i) {
					expect(c).toEqual(jas.objectContaining(columns[i]));
				});

			});
			it('options', function() {
				var columns = [];
				this.grid = new Grid({
					el: newEl(),
					columns: columns
				});
				expect(this.grid.getOptions()).toEqual(jas.objectContaining({
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
					enableTextSelectionOnCells: true,
					dataItemColumnValueExtractor: null,
					fullWidthRows: false,
					multiColumnSort: false,
					forceSyncScrolling: false,
					addNewRowCssClass: "new-row"
				}));
			});
			it('options changed', function() {
				var columns = [];
				this.grid = new Grid({
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
					enableTextSelectionOnCells: false,
					dataItemColumnValueExtractor: dataColumnValueExtractor,
					fullWidthRows: true,
					multiColumnSort: true,
					forceSyncScrolling: true,
					addNewRowCssClass: "old"
				});
				expect(this.grid.getOptions()).toEqual(jas.objectContaining(changedOptions));
			});
			it('error on empty options', function() {
				expect(function() {
					this.grid = new Grid();
				}).toThrow();
			});
			it('error on no container', function() {
				expect(function() {
					this.grid = new Grid({});
				}).toThrow();
			});
			it('error on no columns', function() {
				expect(function() {
					this.grid = new Grid({
						el: newEl()
					});
				}).toThrow();
			});
			it('error on init twice', function() {
				expect(function() {
					this.grid = new Grid({
						el: newEl(),
						columns: []
					});
					this.grid.init();
				}).toThrow();
			});
			it('no error on explicit init', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: [],
					explicitInitialization: true
				});
				this.grid.init();
				expect(this.grid instanceof Grid).toBe(true);
			});
		});
		describe('plugins', function() {
			var fakePlugin;
			beforeEach(function() {
				fakePlugin = {
					init: jas.createSpy('init'),
					destroy: jas.createSpy('destroy')
				};
			});
			it('registerPlugin', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: []
				});
				this.grid.registerPlugin(fakePlugin);
				expect(fakePlugin.init).toHaveBeenCalledWith(this.grid);
			});
			it('unregisterPlugin', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: []
				});
				this.grid.registerPlugin(fakePlugin);
				this.grid.unregisterPlugin(fakePlugin);
				expect(fakePlugin.destroy).toHaveBeenCalled();
			});
			it('unregisterPlugin no destroy fn', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: []
				});
				delete fakePlugin.destroy;
				this.grid.registerPlugin(fakePlugin);
				this.grid.unregisterPlugin(fakePlugin);
				expect(typeof fakePlugin).toBe('object');
			});
			it('unregisterPlugin not registered', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: []
				});
				delete fakePlugin.destroy;
				this.grid.unregisterPlugin(fakePlugin);
				expect(typeof fakePlugin).toBe('object');
			});
		});
		describe('columns', function() {
			var columns;
			beforeEach(function() {
				columns = [
					{ id: "title", name: "Title", field: "title" },
					{ id: "duration", name: "Duration", field: "duration" }
				];
			});
			describe('setColumns & getColumns', function() {
				it('empty columns', function() {
					this.grid = new Grid({
						el: newEl(),
						columns: []
					});
					this.grid.setColumns(columns);
					var newColumns = this.grid.getColumns();
					newColumns.forEach(function(c, i) {
						expect(c).toEqual(jas.objectContaining(columns[i]));
					});
				});
				it('multiple columns', function() {
					this.grid = new Grid({
						el: newEl(),
						columns: [
							{ id: 'test', name: 'Test', field: 'test'},
							{ id: 'fun', name: 'Fun', field: 'fun'},
							{ id: 'hello', name: 'Hello', field: 'hello'}
						]
					});
					this.grid.setColumns(columns);
					var newColumns = this.grid.getColumns();
					newColumns.forEach(function(c, i) {
						expect(c).toEqual(jas.objectContaining(columns[i]));
					});
				});
			});
			describe('getColumnIndex', function() {
				it('empty', function() {
					this.grid = new Grid({
						el: newEl(),
						columns: []
					});
					expect(this.grid.getColumnIndex('id')).toBe(undefined);
				});
				it('multiple', function() {
					this.grid = new Grid({
						el: newEl(),
						columns: columns
					});
					expect(this.grid.getColumnIndex('duration')).toBe(1);
				});
			});
			describe('setSortColumns', function() {
				var grid;
				beforeEach(function() {
					this.grid = new Grid({
						el: newEl(),
						columns: columns
					});
				});

				it('single col', function() {
					var sortCols = [{ columnId: 'duration' }];
					this.grid.setSortColumns(sortCols);
					expect(this.grid.getSortColumns()).toBe(sortCols);
				});
				it('multiple cols', function() {
					var sortCols = [{ columnId: 'duration' }, { columnId: 'title'}];
					this.grid.setSortColumns(sortCols);
					expect(this.grid.getSortColumns()).toBe(sortCols);
				});
				it('multiple cols sortAsc', function() {
					var sortCols = [{ columnId: 'duration', sortAsc: false }, { columnId: 'title'}];
					this.grid.setSortColumns(sortCols);
					expect(this.grid.getSortColumns()).toBe(sortCols);
				});
			});
		});
		describe('options', function() {
			beforeEach(function() {
				this.grid = new Grid({
					el: newEl(),
					columns: []
				});
			});
			it('setOptions', function() {
				this.grid.setOptions(changedOptions);
				expect(this.grid.getOptions()).toEqual(jas.objectContaining(changedOptions));
			});
		});
		describe('data', function() {
			var data;
			beforeEach(function() {
				data = [
					{
						id: 1
					},
					{
						id: 2
					},
					{
						id: 3
					}
				];
			});
			it('default empty', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: []
				});
				expect(this.grid.getData()).toEqual([]);
			});
			it('simple data', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: [],
					data: data
				});
				expect(this.grid.getData()).toEqual(data);
			});
			it('data length', function() {
				this.grid = new Grid({
						el: newEl(),
						columns: [],
						data: data
					});
				expect(this.grid.getDataLength()).toEqual(3);
			});
			it('getDataItem', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: [],
					data: data
				});
				expect(this.grid.getDataItem(1)).toEqual({
					id: 2
				});
			});
			it('setData', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: [],
					data: data
				});
				let newData = [
					{
						id: 10
					},
					{
						id: 8
					}
				];
				this.grid.setData(newData);
				expect(this.grid.getDataItem(1)).toEqual({
					id: 8
				});
				expect(this.grid.getData()).toEqual(newData);
			});
		});
		describe('get elements', function() {
			it('root element', function() {
				var el = newEl();
				this.grid = new Grid({
					el: el,
					columns: []
				});
				expect(this.grid.getContainerNode()).toBe(el);
			});
			it('canvas', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: []
				});
				expect(this.grid.getCanvasNode().tagName.toLowerCase()).toBe('div');
			});
			it('header row', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: []
				});
				expect(this.grid.getHeaderRow().tagName.toLowerCase()).toBe('div');
			});
			it('header column', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: [
						{
							id: '1',
							field: 'a',
							name: 'a'
						}
					],
					showHeaderRow: true
				});
				expect(this.grid.getHeaderRowColumn(1).tagName.toLowerCase()).toBe('div');
			});
		});
		describe('top panel', function() {
			it('top panel element', function() {
				gridInit(this);
				expect(this.grid.getTopPanel().tagName.toLowerCase()).toBe('div');
			});
			it('top panel visibility', function() {
				gridInit(this);
				expect(this.grid.getTopPanel().parentNode.style.display).toBe('none');
			});
			it('top panel change visibility', function() {
				gridInit(this);
				this.grid.setTopPanelVisibility(true);
				expect(this.grid.getTopPanel().parentNode.style.display).toBe('');
			});
			it('top panel change visibility change options', function() {
				this.grid = new Grid({
					el: newEl(),
					columns: [],
					showTopPanel: true
				});
				expect(this.grid.getTopPanel().parentNode.style.display).toBe('');
			});
		});
		describe('header row', function() {
			it('hidden by default', function() {
				gridInit(this);
				expect(this.grid.getHeaderRow().parentNode.style.display).toBe('none');
			});
		});
		describe('getUid', function() {
			it('unique', function() {
				var grid1 = new Grid({
					el: newEl(),
					columns: []
				}),
				grid2 = new Grid({
					el: newEl(),
					columns: []
				}),
				grid3 = new Grid({
					el: newEl(),
					columns: []
				});
				expect(grid1.getUid() !== grid2.getUid() && grid2.getUid() !== grid3.getUid() && grid1.getUid() !== grid3.getUid()).toBe(true);
			});
		});
		describe('selection model', function() {
			beforeEach(function() {
				this.grid = new Grid({
					el: newEl(),
					columns: []
				});
			});
			it('setSelectionModel no previous', function() {
				let sModel = new SelectionModelMock();
				this.grid.setSelectionModel(sModel);
				expect(sModel.init).toHaveBeenCalledWith(this.grid);
				expect(sModel.onSelectedRangesChanged.subscribe).toHaveBeenCalled()
			});
			it('setSelectionModel change model', function() {
				let oldModel = new SelectionModelMock(),
					newModel = new SelectionModelMock();
				this.grid.setSelectionModel(oldModel);
				this.grid.setSelectionModel(newModel);
				expect(oldModel.onSelectedRangesChanged.unsubscribe).toHaveBeenCalledWith(
					oldModel.onSelectedRangesChanged.subscribe.calls.argsFor(0)[0]);
				expect(oldModel.destroy).toHaveBeenCalled();
				expect(newModel.init).toHaveBeenCalledWith(this.grid);
				expect(newModel.onSelectedRangesChanged.subscribe).toHaveBeenCalled()
			});
			it('getSelectionModel', function() {
				let sModel = new SelectionModelMock();
				this.grid.setSelectionModel(sModel);
				expect(this.grid.getSelectionModel()).toBe(sModel);
			});
		});
		describe('editor lock', function() {
			it('getEditorLock default', function() {
				gridInit(this);
				expect(this.grid.getEditorLock()).toBe(Grid.GlobalEditorLock);
			});
			it('new editor lock', function() {
				let eLock = new EditorLock();
				this.grid = new Grid({
					el: newEl(),
					columns: [],
					editorLock: eLock
				});
				expect(this.grid.getEditorLock()).toBe(eLock);
			});
		});
		describe('edit controller', function() {
			it('getEditController', function() {
				gridInit(this);
				let eController = this.grid.getEditController();
				expect(typeof eController.commitCurrentEdit).toBe('function');
				expect(typeof eController.cancelCurrentEdit).toBe('function');
			});
		});
		describe('functional tests', function() {
			describe('check data rendered correctly', function() {
				beforeEach(function() {
					this.el = newEl();
					document.body.appendChild(this.el);
					ThrottleMock.install();
				});
				afterEach(function() {
					if (this.el.parentNode) {
						this.el.parentNode.removeChild(this.el);
					}
					ThrottleMock.uninstall();
				});
				it('basic data', function() {
					let el = this.el;
					el.style.height = '200px';

					var data = [];

					for(var i = 0; i < 25; i++) {
						data.push({
							id: 'id' + i,
							name: 'name' + i
						});
					}

					this.grid = new Grid({
						el: el,
						columns: [
							{ id: 'id', name: 'Id', field: 'id'},
							{ id: 'name', name: 'Name', field: 'name'}
						],
						data: data
					});
					ThrottleMock.tick();
					var rowEls = q('.spark-canvas .spark-row');
					rowEls.forEach(function(el, index) {
						expect(el.children[0].innerHTML).toBe('id' + index);
						expect(el.children[1].innerHTML).toBe('name' + index);
					});
					expect(rowEls.length).toBe(15);
					expect(this.grid.getViewport()).toEqual(jas.objectContaining({
						top: 0,
						bottom: 7
					}));
				});
			});
		});
	});

})(jasmine, describe, it, expect, beforeEach);
