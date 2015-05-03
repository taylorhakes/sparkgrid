import { throttle } from 'spark/util/misc';

function simulateEvent(el, eventName) {

}

function q(search) {
	return [].slice.call(document.querySelectorAll(search));
}


let originalThrottle = throttle._throttleFn;
class TMock {
	constructor() {
		this.callbacks = [];
	}
	install() {
		this.callbacks = [];
		throttle._throttleFn = (fn) => {
			this.callbacks.push(fn);
		};
	}
	tick() {
		this.callbacks.forEach(function(cb) {
			cb();
		});
	}
	uninstall() {
		throttle._throttleFn = originalThrottle;
	}
}
let ThrottleMock = new TMock();

export {
	simulateEvent,
	q,
	ThrottleMock
};
