import core from 'spark/core';

(function(jas) {
	describe('core', function() {
		describe('extend', function() {
			it('basic', function() {
				expect(core.extend({}, { a: 1 })).toEqual({ a: 1 });
			});
			it('general', function() {
				expect(core.extend({ b: 3 }, { a: 1 })).toEqual({ b: 3,  a: 1 });
			});
			it('overwriting', function() {
				expect(core.extend({ b: 3, a: 1 }, { a: 'h' })).toEqual({ b: 3,  a: 'h' });
			});
			it('multi level doesn\'t extend past first level', function() {
				var obj = { hello: 'world'},
					result = core.extend({ b: 5, a : {} }, { a: obj });
				expect(result).toEqual({ b: 5, a: obj});
				expect(result.a).toBe(obj);
			});
			it('null first throws error', function() {
				expect(function() {
					core.extend(null, {})
				}).toThrow();
			});
			it('null second throws error', function() {
				expect(function() {
					core.extend({}, null)
				}).toThrow();
			});
			it('multiple objects', function() {
				expect(core.extend({ a: 12, b: 'h', c: { h: 1, d: 23 } }, { a: 13 }, { c: { h: 12 }})).toEqual({ a: 13, b: 'h', c: { h: 12 } });
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
					document.body.removeChild(el);
				})
			});
			describe('body parent', function() {
				it('classes', function() {
					var result = core.query('.m');
					expect(Array.isArray(result)).toBe(true);
					expect(result.length).toBe(3);
				});
				it('id', function() {
					var result = core.query('#i');
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
					var result = core.query('.m', parent);
					expect(Array.isArray(result)).toBe(true);
					expect(result.length).toBe(5);
				});
				it('id', function() {
					var result = core.query('#ip', parent);
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
					expect(core.closest(el, '.fun')).toBe(null);
				});
				it('null when element outside last element', function() {
					expect(core.closest(document.getElementById('b'), '.h', '.a')).toBe(null);
				});
				it('gets higher parent', function() {
					var el = core.closest(document.getElementById('b'), '.h');
					expect(el.className).toBe('h');
				});
				it('gets immediate parent', function() {
					var el = core.closest(document.getElementById('b'), '.a', '.h');
					expect(el.className).toBe('a');
				});
			});
			describe('delegate', function() {
				it('nested', function() {
					var clickSpy = jas.createSpy();
					core.delegate(el, '.c', 'click', clickSpy);
					// TODO: Simulate click
					expect(clickSpy).toHaveBeenCalled();

				});
				it('no call on parent click', function() {
					var clickSpy = jas.createSpy();
					core.delegate(el, '.c', 'click', clickSpy);
					// TODO: Simulate click
					expect(clickSpy).not.toHaveBeenCalled();
				});
				it('`this` is correct on child click', function() {
					var clickSpy = jas.createSpy();
					core.delegate(el, '.a', 'click', clickSpy);
					// TODO: Simulate click
					expect(clickSpy).not.toHaveBeenCalled();
				});
			});
		});
		describe('createEl', function() {
			it('basic', function() {
				var el = core.createEl({
					tag: 'span'
				});
				expect(el.tagName).toBe('span');
			});
			it('with className', function() {
				var el = core.createEl({
					tag: 'input',
					className: 'a b'
				});
				expect(el.tagName).toBe('input');
				expect(el.className).toBe('a b');
			});
			it('general attribute', function() {
				var el = core.createEl({
					tagName: 'input',
					type: 'button'
				});
				expect(el.type).toBe('button');
			});
			it('styles', function() {
				var el = core.createEl({
					tagName: 'span',
					style: {
						background: '#222',
						color: 'red'
					}
				});
				expect(el.style.background).toBe('#222');
				expect(el.style.color).toBe('red');
			});
		});
		describe('setStyle', function() {
			it('basic', function() {
				var el = document.createElement('div');
				core.setStyle(el, {
					background: '#555',
					color: 'blue'
				});
				expect(el.style.background).toBe('#555');
				expect(el.style.color).toBe('blue');
			});
			it('override existing', function() {
				var el = document.createElement('div');
				el.style.color = 'green';
				el.style.background = 'orange';
				core.setStyle(el, {
					background: '#999',
					color: 'pink'
				});
				expect(el.style.background).toBe('#999');
				expect(el.style.color).toBe('pink');
			});
		});
		describe('removeEl', function() {
			it('no parent, no error', function() {
				var el = document.createElement('div');
				core.removeEl(el);
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
					core.removeEl(child);
					expect(parent.children.length).toBe(0);
				});
			});
		});
		describe('slice', function() {
			it('cuts existing array', function() {
				expect(core.slice([ 1, 2, 3], 0, 1)).toEqual([ 1 ]);
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
					var els = core.slice(document.querySelectorAll('#test'));

					expect(Array.isArray(els)).toBe(true);
					expect(els.length).toBe(1);
				});
			});
		});
		describe('setPx', function() {
			it('basic', function() {
				var el = document.createElement('div');
				core.setPx(el, 'marginRight', 10);
				expect(el.style.marginRight).toBe('10px');
			});
		});
		describe('getPx', function() {
			it('basic', function() {
				var el = document.createElement('div');
				el.style.marginLeft = '20px';
				expect(core.getPx(el, 'marginLeft')).toBe(20);
			});
		});
		describe('toggle', function() {
			var el;
			beforeEach(function() {
				el = document.createElement('div');
			});
			it('hide', function() {
				core.toggle(el);
				expect(el.style.display).toBe('none');
			});
			it('show', function() {
				el.style.display = 'none';
				core.toggle(el);
				expect(el.style.display).toBe('');
			});
			it('hide then show', function() {
				core.toggle(el);
				core.toggle(el);
				expect(el.style.display).toBe('');
			});
			it('show then hide', function() {
				el.style.display = 'none';
				core.toggle(el);
				core.toggle(el);
				expect(el.style.display).toBe('none');
			});
		});
		describe('toggleClass', function() {
			var el;
			beforeEach(function() {
				el = document.createElement('div');
			});
			it('on', function() {
				core.toggleClass(el, 'a');
				expect(el.classList.contains(a)).toBe(true);
			});
			it('off', function() {
				el.classList.add('a');
				core.toggleClass(el, 'a');
				expect(el.classList.contains(a)).toBe(false);
			});
			it('on then off', function() {
				core.toggleClass(el, 'a');
				core.toggleClass(el, 'a');
				expect(el.classList.contains(a)).toBe(false);
			});
			it('off then on', function() {
				el.classList.add('a');
				core.toggleClass(el, 'a');
				core.toggleClass(el, 'a');
				expect(el.classList.contains(a)).toBe(true);
			});
		});
	});
	describe('EventControl', function() {
		var eC;
		beforeEach(function() {
			eC = new core.EventControl();
		});
		it('not stopped by default', function() {
			expect(eC.isStopped()).toBe(false);
		});
		it('stop works', function() {
			eC.stop();
			expect(eC.isStopped()).toBe(true);
		});
		it('multiple stop calls', function() {
			eC.stop();
			eC.stop();
			expect(eC.isStopped()).toBe(true);
		})
	});
	describe('Event', function() {
		var ev, data, event, scope;
		beforeEach(function() {
			data = {};
			event = { target: {} };
			scope = {};
			ev = new core.Event();
		});
		it('one subscriber', function() {
			var spy = jas.createSpy('subscribe spy');
			ev.subscribe(spy);
			ev.notify(data, event, scope);
			expect(spy).toHaveBeenCalledWith({
				event: event,
				data: data,
				stop: function() {}
			});
		});
		it('multiple subscribers', function() {
			var spy1 = jas.createSpy('subscribe spy 1'),
				spy2 = jas.createSpy('subscribe spy 2');
			ev.subscribe(spy1);
			ev.subscribe(spy2);
			ev.notify(data, event, scope);
			expect(spy1).toHaveBeenCalledWith({
				event: event,
				data: data,
				stop: function() {}
			});
			expect(spy2).toHaveBeenCalledWith({
				event: event,
				data: data,
				stop: function() {}
			});
		});
		it('notify returns stop function', function() {
			var isStopped = ev.notify(data, event, scope);
			expect(typeof isStopped).toBe('function');
		});
	})


})(jasmine);
