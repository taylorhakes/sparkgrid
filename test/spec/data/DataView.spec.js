import DataView from 'spark/data/DataView';

describe('DataView', function() {
	var dv;
	afterEach(function() {
		dv = null;
	});
	describe('constructor', function() {
		it('no options', function() {
			dv = new DataView();
			expect(dv.getLength()).toBe(0);
		});
		it('inline filters option', function() {
			dv = new DataView({
				inlineFilters: true
			});
			expect(dv.getLength()).toBe(0);
		});
		it('inlineFilters and metadataProvider', function() {
			dv = new DataView({
				inlineFilters: true,
				groupItemMetadataProvider: {}
			});
			expect(dv.getLength()).toBe(0);
		});
	});
	describe('paging info', function() {
		it('general paging info', function() {
			dv = new DataView();
			dv.setPagingOptions({
				pageSize: 10,
				pageNum: 1
			});
			expect(dv.getPagingInfo()).toEqual({ pageSize: 10, pageNum: 0, totalRows: 0, totalPages: 1 });
		});
		it('single page', function() {
			dv = new DataView();
			dv.setItems([
				{
					id: 1
				},
				{
					id: 2
				}
			]);
			dv.setPagingOptions({
				pageSize: 10,
				pageNum: 1
			});
			expect(dv.getPagingInfo()).toEqual({ pageSize: 10, pageNum: 0, totalRows: 2, totalPages: 1 });
		});
		it('multiple pages', function() {
			dv = new DataView();
			var data = [];
			for(var i = 0; i < 50; i++) {
				data.push( {
					id: i
				});
			}

			dv.setItems(data);
			dv.setPagingOptions({
				pageSize: 12,
				pageNum: 2
			});
			expect(dv.getPagingInfo()).toEqual({ pageSize: 12, pageNum: 2, totalRows: 50, totalPages: 5 });
		});
	});
	describe('setItems & getItems', function() {
		it('no items', function() {
			dv = new DataView();
			expect(dv.getItems()).toEqual([]);
		});
		it('multiple items', function() {
			dv = new DataView();
			var data = [
				{
					id: 1
				},
				{
					id: 2
				}
			];
			dv.setItems(data);
			expect(dv.getItems()).toEqual(data);
		});
		it('different id property items', function() {
			dv = new DataView();
			var data = [
				{
					hello: 1
				},
				{
					hello: 2
				}
			];
			dv.setItems(data, 'hello');
			expect(dv.getItems()).toEqual(data);
		});
	});
	describe('setFilter', function() {
		it('basic fn', function() {
			dv = new DataView();
			var data = [
				{
					id: 1
				},
				{
					id: 2
				}
			];
			dv.setItems(data);
			dv.setFilter(function(item) {
				return item.id === 1;
			});
			expect(dv.getFilteredItems()).toEqual([
				{ id: 1 }
			]);
		});
	});
	describe('sort', function() {
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
					id: 0
				}
			]
		});
		it('descending', function() {
			dv = new DataView();
			dv.setItems(data);
			dv.sort(function(a, b) {
				if (a.id == b.id) return 0;
				return a.id > b.id ? -1 : 1;
			}, true);
			expect(dv.getItems()).toEqual([
				{
					id: 2
				},
				{
					id: 1
				},
				{
					id: 0
				}
			]);
		});
		it('ascending', function() {
			dv = new DataView();
			dv.setItems(data);
			dv.sort(function(a, b) {
				if (a.id == b.id) return 0;
				return a.id > b.id ? -1 : 1;
			}, false);
			expect(dv.getItems()).toEqual([
				{
					id: 0
				},
				{
					id: 1
				},
				{
					id: 2
				}
			]);
		});
		it('resort', function() {
			dv = new DataView();
			dv.setItems(data);
			dv.sort(function(a, b) {
				if (a.id == b.id) return 0;
				return a.id > b.id ? -1 : 1;
			}, false);
			dv.reSort();
			expect(dv.getItems()).toEqual([
				{
					id: 0
				},
				{
					id: 1
				},
				{
					id: 2
				}
			]);
		});
	});
	//describe('change grouping', function() {
	//	it()
	//});
});
