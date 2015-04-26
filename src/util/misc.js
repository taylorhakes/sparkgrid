let matchesSelector = null,
	selectors = ['matches', 'mozMatchesSelector', 'webkitMatchesSelector', 'msMatchesSelector'],
	i = 0,
	len = selectors.length;

for (; i < len; i++) {
	let sel = selectors[i];
	if (document.body[sel]) {
		matchesSelector = sel;
	}
}

/**
 * Mix objects together, 1 level deep
 * @param obj {Object} source object
 * @returns {Object}
 */
function extend(obj /* ...objects */) {
	for (let i = 1, len = arguments.length; i < len; i++) {
		let source = arguments[i];
		if (source) {
			for (let prop in source) {
				if (source.hasOwnProperty(prop)) {
					obj[prop] = source[prop];
				}
			}
		}
	}
	return obj;
}

function deepExtend(obj /* ...objects */) {
	for (let i = 1, len = arguments.length; i < len; i++) {
		let source = arguments[i];
		if (source) {
			for (let prop in source) {
				if (source.hasOwnProperty(prop)) {
					if (typeof source[prop] === 'object' && source[prop] && !Array.isArray(source[prop])) {
						if (typeof obj[prop] !== 'object' || !obj[prop]) {
							obj[prop] = {};
						}
						deepExtend(obj[prop], source[prop]);
					} else {
						obj[prop] = source[prop];
					}
				}
			}
		}
	}
	return obj;
}

/**
 * Wrapper for querySelectorAll, but returns an array
 * @param selector {string} Search selector, i.e. #myId, .myClass, etc.
 * @param el {HTMLElement} parent element for query, defaults to document
 * @returns {Array}
 */
function query(selector, el) {
	return slice((el || document).querySelectorAll(selector));
}

function closest(el, selector, lastEl) {
	// Go through parents and check matches
	while (true) {
		if (el && (el === selector || (typeof selector === 'string' && el[matchesSelector] && el[matchesSelector](selector)))) {
			return el;
		}
		if (!el || el === lastEl || (typeof lastEl === 'string' && el[matchesSelector](lastEl))) {
			return null;
		}
		el = el.parentNode;
	}
}

/**
 * Delegate an event to a sub element
 * @param {HTMLElement} elem
 * @param {string} event
 * @param {string} selector
 * @param {function} fn
 */
function delegate(elem, event, selector, fn) {
	let events = event.split(' ');

	function handleEvent(e) {
		let delEl = closest(e.target, selector, elem);
		if (delEl) {
			fn.call(delEl, e);
		}
	}

	for (i = 0, len = events.length; i < len; i++) {
		let ev = events[i];
		elem.addEventListener(ev, handleEvent);
	}
}

/**
 * Create an HTML element
 * @param options
 * @returns {HTMLElement}
 */
function createEl(options) {
	let el = document.createElement(options.tag);
	if (options.style) {
		setStyle(el, options.style);
	}
	delete options.style;
	delete options.tag;

	extend(el, options);

	return el;
}

/**
 * Set the CSS styles of an HTML Element
 * @param el
 * @param styles
 * @returns {Object}
 */
function setStyle(el, styles) {
	return extend(el.style, styles);
}

/**
 * Remove a/multiple HTML element from the DOM
 * @param {HTMLElement|Array<HTMLElement>} el
 */
function removeEl(els) {
	if (!Array.isArray(els)) {
		els = [els];
	}

	let index = els.length;
	while(index--) {
		let el = els[index];
		if (el && el.parentNode) {
			el.parentNode.removeChild(el);
		}
	}
}

/**
 * Functional array slice
 */
function slice(item, start, end) {
	return Array.prototype.slice.call(item, start, end);
}
//var slice = Function.prototype.call.bind(Array.prototype.slice);

/**
 * Set a CSS style with in pixels
 * @param {HTMLElement} el
 * @param {string} prop
 * @param {string|number} val
 */
function setPx(el, prop, val) {
	el.style[prop] = val + 'px';
}

/**
 * Get a pixel value as a number
 * @param {HTMLElement} el
 * @param {string} prop
 * @returns {Number}
 */
function getPx(el, prop) {
	return parseFloat(el.style[prop] || 0);
}

/**
 * Toggle the visibility of an element
 * @param {HTMLElement} el
 */
function toggle(el) {
	if (el.style.display === 'none') {
		show(el);
	} else {
		hide(el);
	}
}

/**
 * Display hide and element
 * @param el
 */
function hide(el) {
	el.style.display = 'none';
}

/**
 * Remove display property from element
 * @param el
 */
function show(el) {
	el.style.display = '';
}

/**
 * Toggle a CSS class
 * @param {HTMLElement} el
 * @param {string} className
 */
function toggleClass(el, className) {
	if (el.classList.contains(className)) {
		el.classList.remove(className);
	} else {
		el.classList.add(className);
	}
}

let throttleFn = window.requestAnimationFrame || window.setImmediate || ((fn) => window.setTimeout(fn, 0));
function throttle(fn) {
	var timer = null,
		lastThis = null,
		lastArgs = null;

	return function() {
		lastThis = this;
		lastArgs = arguments;

		if (timer) {
			return;
		}

		timer = throttleFn(executeFn);

	};
	function executeFn() {
		timer = null;
		fn.apply(lastThis, lastArgs);
	}
}


export {
	slice,
	createEl,
	setStyle,
	setPx,
	getPx,
	toggle,
	show,
	hide,
	toggleClass,
	removeEl,
	delegate,
	closest,
	extend,
	deepExtend,
	query,
	throttle
};
