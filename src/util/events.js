/**
 * Created by taylorhakes on 3/13/15.
 *//***
 * An event object for passing data to event handlers and letting them control propagation.
 * <p>This is pretty much identical to how W3C and jQuery implement events.</p>
 * @class EventControl
 * @constructor
 */
function EventControl() {
	var isStopped = false;

	/***
	 * Stops event from propagating up the DOM tree.
	 * @method stop
	 */
	this.stop = function () {
		isStopped = true;
	};

	/***
	 * Returns whether stopPropagation was called on this event object.
	 * @method isStopped
	 * @return {Boolean}
	 */
	this.isStopped = function () {
		return isStopped;
	};
}

/***
 * A simple publisher-subscriber implementation.
 * @class Event
 * @constructor
 */
function Event() {
	var handlers = [];

	/***
	 * Adds an event handler to be called when the event is fired.
	 * <p>Event handler will receive two arguments - an <code>EventData</code> and the <code>data</code>
	 * object the event was fired with.<p>
	 * @method subscribe
	 * @param fn {Function} Event handler.
	 */
	this.subscribe = function (fn) {
		handlers.push(fn);
	};

	/***
	 * Removes an event handler added with <code>subscribe(fn)</code>.
	 * @method unsubscribe
	 * @param fn {Function} Event handler to be removed.
	 */
	this.unsubscribe = function (fn) {
		for (var i = handlers.length - 1; i >= 0; i--) {
			if (handlers[i] === fn) {
				handlers.splice(i, 1);
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
	this.notify = function (data, e, scope) {
		var eventControl = new EventControl();
		scope = scope || this;

		for (var i = 0; i < handlers.length; i++) {
			handlers[i].call(scope, {
				event: e,
				data: data,
				stop: eventControl.stop
			});
		}

		return !eventControl.isStopped();
	};
}

function EventHandler() {
	var handlers = [];

	this.subscribe = function (event, handler) {
		handlers.push({
			event: event,
			handler: handler
		});
		event.subscribe(handler);

		return this;  // allow chaining
	};

	this.unsubscribe = function (event, handler) {
		var i = handlers.length;
		while (i--) {
			if (handlers[i].event === event && handlers[i].handler === handler) {
				handlers.splice(i, 1);
				event.unsubscribe(handler);
				return;
			}
		}

		return this;  // allow chaining
	};

	this.unsubscribeAll = function () {
		var i = handlers.length;
		while (i--) {
			handlers[i].event.unsubscribe(handlers[i].handler);
		}
		handlers = [];

		return this;  // allow chaining
	}
}

export {
	Event,
	EventHandler,
	EventControl
}