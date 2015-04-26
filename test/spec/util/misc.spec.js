import { extend, deepExtend, query, closest, delegate, throttle,
	createEl, setStyle, removeEl, slice, setPx, getPx, toggle, toggleClass } from 'spark/util/misc';

(function(jas) {
	describe('misc', function() {
		describe('extend', function() {
			it('basic', function() {
				expect(extend({}, { a: 1 })).toEqual({ a: 1 });
			});
			it('general', function() {
				expect(extend({ b: 3 }, { a: 1 })).toEqual({ b: 3,  a: 1 });
			});
			it('overwriting', function() {
				expect(extend({ b: 3, a: 1 }, { a: 'h' })).toEqual({ b: 3,  a: 'h' });
			});
			it('multi level doesn\'t extend past first level', function() {
				var obj = { hello: 'world'},
					result = extend({ b: 5, a : {} }, { a: obj });
				expect(result).toEqual({ b: 5, a: obj});
				expect(result.a).toBe(obj);
			});
			it('null first throws error', function() {
				expect(function() {
					extend(null, { hello: 1 })
				}).toThrow();
			});
			it('multiple objects', function() {
				expect(extend({ a: 12, b: 'h', c: { h: 1, d: 23 } }, { a: 13 }, { c: { h: 12 }})).toEqual({ a: 13, b: 'h', c: { h: 12 } });
			});
		});
		describe('deepExtend', function() {
			it('basic', function() {
				expect(deepExtend({}, { a: 1 })).toEqual({ a: 1 });
			});
			it('general', function() {
				expect(deepExtend({ b: 3 }, { a: 1 })).toEqual({ b: 3,  a: 1 });
			});
			it('overwriting', function() {
				expect(deepExtend({ b: 3, a: 1 }, { a: 'h' })).toEqual({ b: 3,  a: 'h' });
			});
			it('multi level merging', function() {
				var obj = { hello: 'world'},
					result = deepExtend({ b: 5, a : { fun: 'times' } }, { a: obj });
				expect(result).toEqual({ b: 5, a: { hello: 'world', fun: 'times' }});
			});
			it('3 level merging', function() {
				var obj = { hello: 'world', j: { k: 32 }},
					result = deepExtend({ b: 10, a : { fun: 'times' } }, { a: obj, b: 20, c: 10 });
				expect(result).toEqual({ b: 20, a: { hello: 'world', fun: 'times', j: { k: 32} }, c: 10});
			});
			it('array merging', function() {
				var obj = [5,6,7],
					result = deepExtend({ b: 10, a : [1,2,3] }, { a: obj, b: 20, c: 10 });
				expect(result).toEqual({ b: 20, a: [5,6,7], c: 10});
			});
			it('null on second obj', function() {
				var result = deepExtend({ b: 10, a : { k: 87 } }, { a: null, b: 20, c: 10 });
				expect(result).toEqual({ b: 20, a: null, c: 10});
			});
			it('second missing prop', function() {
				var result = deepExtend({ b: 10, a : { k: 87 } }, {  b: 20, c: 10 });
				expect(result).toEqual({ b: 20, a: { k: 87 }, c: 10});
			});
		});

		describe('query', function() {
			var els = [];
			beforeEach(function() {
				for (var i = 0; i < 3; i++) {
					var div = document.createElement('div');
					div.className = 'm';
					document.body.appendChild(div);
					els.push(div);
				}

				var span = document.createElement('span');
				span.id = 'i';
				document.body.appendChild(span);
				els.push(span);
			});
			afterEach(function() {
				els.forEach(function(el) {
					if (el.parentNode) {
						el.parentNode.removeChild(el);
					}
				});
				els = [];
			});
			describe('body parent', function() {
				it('classes', function() {
					var result = query('.m');
					expect(Array.isArray(result)).toBe(true);
					expect(result.length).toBe(3);
				});
				it('id', function() {
					var result = query('#i');
					expect(Array.isArray(result)).toBe(true);
					expect(result.length).toBe(1);
				});
			});
			describe('specific parent', function() {
				var parent;
				beforeEach(function() {
					parent = document.createElement('div');
					document.body.appendChild(parent);
					for (var i = 0; i < 5; i++) {
						var div = document.createElement('div');
						div.className = 'm';
						parent.appendChild(div);
						els.push(div);
					}

					var span = document.createElement('span');
					span.id = 'ip';
					parent.appendChild(span);
					els.push(span);
				});
				afterEach(function() {
					document.body.removeChild(parent);
				});
				it('classes', function() {
					var result = query('.m', parent);
					expect(Array.isArray(result)).toBe(true);
					expect(result.length).toBe(5);
				});
				it('id', function() {
					var result = query('#ip', parent);
					expect(Array.isArray(result)).toBe(true);
					expect(result.length).toBe(1);
				});
			});
		});

		describe('nested setup', function() {
			var el;
			beforeEach(function() {
				el = document.createElement('div');
				el.innerHTML = '' +
				'<div class="h">' +
				'<div class="a">' +
				'<div id="b">' +
				'<div class="c"></div>' +
				'</div>' +
				'</div>' +
				'</div>';
				document.body.appendChild(el);
			});
			afterEach(function() {
				document.body.removeChild(el);
			});

			describe('closest', function() {
				it('null when element doesn\'t exist', function() {
					expect(closest(el, '.fun')).toBe(null);
				});
				it('null when element outside last element', function() {
					expect(closest(document.getElementById('b'), '.h', '.a')).toBe(null);
				});
				it('gets higher parent', function() {
					var el = closest(document.getElementById('b'), '.h');
					expect(el.className).toBe('h');
				});
				it('gets immediate parent', function() {
					var el = closest(document.getElementById('b'), '.a', '.h');
					expect(el.className).toBe('a');
				});
			});
			//describe('delegate', function() {
			//	it('nested', function() {
			//		var clickSpy = jas.createSpy();
			//		delegate(el, '.c', 'click', clickSpy);
			//		// TODO: Simulate click
			//		expect(clickSpy).toHaveBeenCalled();
			//
			//	});
			//	it('no call on parent click', function() {
			//		var clickSpy = jas.createSpy();
			//		delegate(el, '.c', 'click', clickSpy);
			//		// TODO: Simulate click
			//		expect(clickSpy).not.toHaveBeenCalled();
			//	});
			//	it('`this` is correct on child click', function() {
			//		var clickSpy = jas.createSpy();
			//		delegate(el, '.a', 'click', clickSpy);
			//		// TODO: Simulate click
			//		expect(clickSpy).not.toHaveBeenCalled();
			//	});
			//});
		});
		describe('createEl', function() {
			it('basic', function() {
				var el = createEl({
					tag: 'span'
				});
				expect(el.tagName.toLowerCase()).toBe('span');
			});
			it('with className', function() {
				var el = createEl({
					tag: 'input',
					className: 'a b'
				});
				expect(el.tagName.toLowerCase()).toBe('input');
				expect(el.className).toBe('a b');
			});
			it('general attribute', function() {
				var el = createEl({
					tag: 'input',
					type: 'button'
				});
				expect(el.type).toBe('button');
			});
			it('styles', function() {
				var el = createEl({
					tag: 'span',
					style: {
						height: '2px',
						width: '10px'
					}
				});
				expect(el.style.height).toBe('2px');
				expect(el.style.width).toBe('10px');
			});
		});
		describe('setStyle', function() {
			it('basic', function() {
				var el = document.createElement('div');
				setStyle(el, {
					margin: '10px',
					padding: '5px'
				});
				expect(el.style.margin).toBe('10px');
				expect(el.style.padding).toBe('5px');
			});
			it('override existing', function() {
				var el = document.createElement('div');
				el.style.margin = '2px';
				el.style.padding = '3px';
				setStyle(el, {
					margin: '8px',
					padding: '10px'
				});
				expect(el.style.margin).toBe('8px');
				expect(el.style.padding).toBe('10px');
			});
		});
		describe('removeEl', function() {
			it('no parent, no error', function() {
				var el = document.createElement('div');
				removeEl(el);
			});
			describe('correct children', function() {
				var parent, child;
				beforeEach(function() {
					parent = document.createElement('div');
					child = document.createElement('span');

					parent.appendChild(child);
					document.body.appendChild(parent);
				});
				afterEach(function() {
					document.body.removeChild(parent);
				});
				it('removes child correctly', function() {
					removeEl(child);
					expect(parent.children.length).toBe(0);
				});
			});
		});
		describe('slice', function() {
			it('cuts existing array', function() {
				expect(slice([ 1, 2, 3], 0, 1)).toEqual([ 1 ]);
			});
			describe('DOM elements', function() {
				var el;
				beforeEach(function() {
					el = document.createElement('div');
					el.id = 'test';
					document.body.appendChild(el);
				});
				afterEach(function() {
					document.body.removeChild(el);
				});
				it('converts dom collection to real array', function() {
					var els = slice(document.querySelectorAll('#test'));

					expect(Array.isArray(els)).toBe(true);
					expect(els.length).toBe(1);
				});
			});
		});
		describe('setPx', function() {
			it('basic', function() {
				var el = document.createElement('div');
				setPx(el, 'marginRight', 10);
				expect(el.style.marginRight).toBe('10px');
			});
		});
		describe('getPx', function() {
			it('basic', function() {
				var el = document.createElement('div');
				el.style.marginLeft = '20px';
				expect(getPx(el, 'marginLeft')).toBe(20);
			});
		});
		describe('toggle', function() {
			var el;
			beforeEach(function() {
				el = document.createElement('div');
			});
			it('hide', function() {
				toggle(el);
				expect(el.style.display).toBe('none');
			});
			it('show', function() {
				el.style.display = 'none';
				toggle(el);
				expect(el.style.display).toBe('');
			});
			it('hide then show', function() {
				toggle(el);
				toggle(el);
				expect(el.style.display).toBe('');
			});
			it('show then hide', function() {
				el.style.display = 'none';
				toggle(el);
				toggle(el);
				expect(el.style.display).toBe('none');
			});
		});
		describe('toggleClass', function() {
			var el;
			beforeEach(function() {
				el = document.createElement('div');
			});
			it('on', function() {
				toggleClass(el, 'a');
				expect(el.classList.contains('a')).toBe(true);
			});
			it('off', function() {
				el.classList.add('a');
				toggleClass(el, 'a');
				expect(el.classList.contains('a')).toBe(false);
			});
			it('on then off', function() {
				toggleClass(el, 'a');
				toggleClass(el, 'a');
				expect(el.classList.contains('a')).toBe(false);
			});
			it('off then on', function() {
				el.classList.add('a');
				toggleClass(el, 'a');
				toggleClass(el, 'a');
				expect(el.classList.contains('a')).toBe(true);
			});
		});
		describe('throttle', function() {
			beforeEach(function() {
				jas.clock().install();
			});
			afterEach(function() {
				jas.clock().uninstall();
			});
			it('basic', function(done) {
				var me = {},
					dbFn = throttle(function() {
						expect(arguments[0]).toEqual('hello');
						expect(arguments[1]).toEqual(123);
						expect(this).toBe(me);
						done();
					}, 1);
				dbFn.call(me, 'hello', 123);
				jas.clock().tick(1);
			});
		});

	});

})(jasmine);
