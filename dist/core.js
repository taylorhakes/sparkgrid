(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["exports"], factory);
	} else if (typeof exports !== "undefined") {
		factory(exports);
	}
})(function (exports) {
	"use strict";

	exports.slice = slice;
	exports.createEl = createEl;
	exports.setStyle = setStyle;
	exports.setPx = setPx;
	exports.getPx = getPx;
	exports.toggle = toggle;
	exports.toggleClass = toggleClass;
	exports.removeEl = removeEl;
	exports.delegate = delegate;
	exports.closest = closest;
	exports.extend = extend;
	exports.Event = Event;
	exports.EventControl = EventControl;
	exports.EventHandler = EventHandler;
	exports.Range = Range;
	exports.NonDataItem = NonDataItem;
	exports.Group = Group;
	exports.GroupTotals = GroupTotals;
	exports.EditorLock = EditorLock;
	exports.query = query;
	exports.__esModule = true;
});