/**
 * Created by taylorhakes on 3/13/15.
 *//***
 * An event object for passing data to event handlers and letting them control propagation.
 * <p>This is pretty much identical to how W3C and jQuery implement events.</p>
 * @class EventControl
 * @constructor
 */
class EventControl {
	constructor() {
		this._isStopped = false;
	}

	/***
	 * Stops event from propagating up the DOM tree.
	 * @method stop
	 */
	stop() {
		this._isStopped = true;
	}

	/***
	 * Returns whether stopPropagation was called on this event object.
	 * @method isStopped
	 * @return {Boolean}
	 */
	isStopped() {
		return this._isStopped;
	}
}

/***
 * A simple publisher-subscriber implementation.
 * @class Event
 * @constructor
 */
class Event {
	constructor() {
		this._handlers = [];
	}

	/***
	 * Adds an event handler to be called when the event is fired.
	 * <p>Event handler will receive two arguments - an <code>EventData</code> and the <code>data</code>
	 * object the event was fired with.<p>
	 * @method subscribe
	 * @param fn {Function} Event handler.
	 */
	subscribe(fn) {
		this._handlers.push(fn);
	}

	/***
	 * Removes an event handler added with <code>subscribe(fn)</code>.
	 * @method unsubscribe
	 * @param fn {Function} Event handler to be removed.
	 */
	unsubscribe(fn) {
		for (let i = this._handlers.length - 1; i >= 0; i--) {
			if (this._handlers[i] === fn) {
				this._handlers.splice(i, 1);
			}
		}
	}

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
	notify(data, e, scope) {
		let eventControl = new EventControl();
		scope = scope || this;

		for (let i = 0; i < this._handlers.length; i++) {
			this._handlers[i].call(scope, {
				event: e,
				data: data,
				stop: eventControl.stop
			});
		}

		return !eventControl.isStopped();
	}
}

class EventHandler {
	constructor() {
		this._handlers = [];
	}

	subscribe(event, handler) {
		this._handlers.push({
			event: event,
			handler: handler
		});
		event.subscribe(handler);

		return this;  // allow chaining
	}

	unsubscribe(event, handler) {
		let i = this._handlers.length;
		while (i--) {
			if (this._handlers[i].event === event && this._handlers[i].handler === handler) {
				this._handlers.splice(i, 1);
				event.unsubscribe(handler);
				return;
			}
		}

		return this;  // allow chaining
	}

	unsubscribeAll() {
		let i = this._handlers.length;
		while (i--) {
			this._handlers[i].event.unsubscribe(this._handlers[i].handler);
		}
		this._handlers = [];

		return this;  // allow chaining
	}
}

const KEYCODES = Object.freeze({
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

export {
	Event,
	EventHandler,
	EventControl,
	KEYCODES
};