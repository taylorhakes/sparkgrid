import { extend } from '../util/misc';

let defaultOptions = {
	validationFailedMsg: "Some of the fields have failed validation",
	show: null,
	hide: null,
	position: null,
	destroy: null
};
let noop = () => {};

class CompositeEditor {
	constructor(options) {
		this._options = extend({}, defaultOptions, options);

		this._columns = this._options.columns;
		this._containers = this._options.containers;
		this._firstInvalidEditor  = null;
	}

	getContainerBox(i) {
	  var c = this._containers[i];
	  var w = c.clientHeight;
	  var h = c.clientWidth;

	  return {
		top: c.offsetTop,
		left: c.offsetLeft,
		bottom: c.offsetTop + h,
		right: c.offsetLeft + w,
		width: w,
		height: h,
		visible: true
	  };
	}


function editor(args) {
  var editors = [];


  function init() {
	var newArgs = {};
	var idx = columns.length;
	while (idx--) {
	  if (columns[idx].editor) {
		newArgs = $.extend({}, args);
		newArgs.container = containers[idx];
		newArgs.column = columns[idx];
		newArgs.position = getContainerBox(idx);
		newArgs.commitChanges = noop;
		newArgs.cancelChanges = noop;

		editors[idx] = new (columns[idx].editor)(newArgs);
	  }
	}
  }


  this.destroy = function () {
	var idx = editors.length;
	while (idx--) {
	  editors[idx].destroy();
	}

	options.destroy && options.destroy();
  };


  this.focus = function () {
	// if validation has failed, set the focus to the first invalid editor
	(firstInvalidEditor || editors[0]).focus();
  };


  this.isValueChanged = function () {
	var idx = editors.length;
	while (idx--) {
	  if (editors[idx].isValueChanged()) {
		return true;
	  }
	}
	return false;
  };


  this.serializeValue = function () {
	var serializedValue = [];
	var idx = editors.length;
	while (idx--) {
	  serializedValue[idx] = editors[idx].serializeValue();
	}
	return serializedValue;
  };


  this.applyValue = function (item, state) {
	var idx = editors.length;
	while (idx--) {
	  editors[idx].applyValue(item, state[idx]);
	}
  };


  this.loadValue = function (item) {
	var idx = editors.length;
	while (idx--) {
	  editors[idx].loadValue(item);
	}
  };


  this.validate = function () {
	var validationResults;
	var errors = [];

	firstInvalidEditor = null;

	var idx = editors.length;
	while (idx--) {
	  validationResults = editors[idx].validate();
	  if (!validationResults.valid) {
		firstInvalidEditor = editors[idx];
		errors.push({
		  index: idx,
		  editor: editors[idx],
		  container: containers[idx],
		  msg: validationResults.msg
		});
	  }
	}

	if (errors.length) {
	  return {
		valid: false,
		msg: options.validationFailedMsg,
		errors: errors
	  };
	} else {
	  return {
		valid: true,
		msg: ""
	  };
	}
  };


  this.hide = function () {
	var idx = editors.length;
	while (idx--) {
	  editors[idx].hide && editors[idx].hide();
	}
	options.hide && options.hide();
  };


  this.show = function () {
	var idx = editors.length;
	while (idx--) {
	  editors[idx].show && editors[idx].show();
	}
	options.show && options.show();
  };


  this.position = function (box) {
	options.position && options.position(box);
  };
}

export default CompositeEditor;