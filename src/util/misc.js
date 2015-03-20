var matchesSelector = null,
	selectors = ['matches', 'mozMatchesSelector', 'webkitMatchesSelector', 'msMatchesSelector'],
	i = 0,
	len = selectors.length;

for (; i < len; i++) {
	var sel = selectors[i];
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
	var i, len, source;
	for (i = 1, len = arguments.length; i < len; i++) {
		source = arguments[i];
		if (source) {
			for (var prop in source) {
				if (source.hasOwnProperty(prop)) {
					obj[prop] = source[prop];
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
		if (el && el[matchesSelector] && el[matchesSelector](selector)) {
			return el;
		}
		if (!el || el === lastEl || (typeof lastEl === 'string' && el[matchesSelector](lastEl))) {
			return null;
		}
		el = el.parentNode
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
	var events = event.split(" "),
		i = 0,
		len = events.length;

	for (; i < len; i++) {
		var ev = events[i];
		elem.addEventListener(ev, function (e) {
			var delEl = closest(e.target, selector, elem);
			if (delEl) {
				fn.call(delEl, e);
			}
		});
	}
}

/**
 * Create an HTML element
 * @param options
 * @returns {HTMLElement}
 */
function createEl(options) {
	var el = document.createElement(options.tag);
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
 * Remove an HTML element from the DOM
 * @param {HTMLElement} el
 */
function removeEl(el) {
	if (el.parentNode) {
		el.parentNode.removeChild(el);
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
	el.style[prop] = val + "px";
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
	if (el.style.display === "none") {
		el.style.display = "";
	} else {
		el.style.display = "none";
	}
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


export {
	slice,
	createEl,
	setStyle,
	setPx,
	getPx,
	toggle,
	toggleClass,
	removeEl,
	delegate,
	closest,
	extend,
	query
};
