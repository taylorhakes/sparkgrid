(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports'], factory);
	} else if (typeof exports !== 'undefined') {
		factory(exports);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports);
		global.misc = mod.exports;
	}
})(this, function (exports) {
	'use strict';

	exports.__esModule = true;
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
		for (var _i = 1, _len = arguments.length; _i < _len; _i++) {
			var source = arguments[_i];
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

	function deepExtend(obj /* ...objects */) {
		for (var _i2 = 1, _len2 = arguments.length; _i2 < _len2; _i2++) {
			var source = arguments[_i2];
			if (source) {
				for (var prop in source) {
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
			if (el && (el === selector || typeof selector === 'string' && el[matchesSelector] && el[matchesSelector](selector))) {
				return el;
			}

			if (!el || el === lastEl || typeof lastEl === 'string' && el[matchesSelector](lastEl)) {
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
		var events = event.split(' ');

		function handleEvent(e) {
			var delEl = closest(e.target, selector, elem);
			if (delEl) {
				fn.call(delEl, e);
			}
		}

		for (i = 0, len = events.length; i < len; i++) {
			var ev = events[i];
			elem.addEventListener(ev, handleEvent);
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
  * Remove a/multiple HTML element from the DOM
  * @param {HTMLElement|Array<HTMLElement>} el
  */
	function removeEl(els) {
		if (!Array.isArray(els)) {
			els = [els];
		}

		var index = els.length;
		while (index--) {
			var el = els[index];
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

	exports.slice = slice;
	exports.createEl = createEl;
	exports.setStyle = setStyle;
	exports.setPx = setPx;
	exports.getPx = getPx;
	exports.toggle = toggle;
	exports.show = show;
	exports.hide = hide;
	exports.toggleClass = toggleClass;
	exports.removeEl = removeEl;
	exports.delegate = delegate;
	exports.closest = closest;
	exports.extend = extend;
	exports.deepExtend = deepExtend;
	exports.query = query;
});