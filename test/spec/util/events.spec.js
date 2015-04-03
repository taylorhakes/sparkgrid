import { EventControl, Event } from 'spark/util/events';

(function(jas) {
	describe('EventControl', function() {
		var eC;
		beforeEach(function() {
			eC = new EventControl();
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
		});
	});

	describe('Event', function() {
		var ev, data, event, scope;
		beforeEach(function() {
			data = {};
			event = { target: {} };
			scope = {};
			ev = new Event();
		});
		it('one subscriber', function() {
			var spy = jas.createSpy('subscribe spy');
			ev.subscribe(spy);
			ev.notify(data, event, scope);
			expect(spy.calls.argsFor(0)[0].event).toBe(event);
			expect(spy.calls.argsFor(0)[0].data).toBe(data);
			expect(typeof spy.calls.argsFor(0)[0].stop).toBe('function');
		});
		it('multiple subscribers', function() {
			var spy1 = jas.createSpy('subscribe spy 1'),
				spy2 = jas.createSpy('subscribe spy 2');
			ev.subscribe(spy1);
			ev.subscribe(spy2);
			ev.notify(data, event, scope);
			expect(spy1.calls.argsFor(0)[0].event).toBe(event);
			expect(spy1.calls.argsFor(0)[0].data).toBe(data);
			expect(spy2.calls.argsFor(0)[0].event).toBe(event);
			expect(spy2.calls.argsFor(0)[0].data).toBe(data);
		});
		it('notify returns stop function', function() {
			var isStopped = ev.notify(data, event, scope);
			expect(typeof isStopped).toBe('boolean');
		});
	});
})(jasmine);

