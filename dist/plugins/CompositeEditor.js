(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', '../util/misc'], factory);
	} else if (typeof exports !== 'undefined') {
		factory(exports, require('../util/misc'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, global.misc);
		global.CompositeEditor = mod.exports;
	}
})(this, function (exports, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var defaultOptions = {
		validationFailedMsg: 'Some of the fields have failed validation',
		show: null,
		hide: null,
		position: null,
		destroy: null
	},
	    noop = function noop() {};

	function getCompositeEditor(options) {
		var firstInvalidEditor = undefined,
		    containers = options.containers;

		options = _utilMisc.extend({}, defaultOptions, options);

		function getContainerBox(i) {
			var c = containers[i],
			    top = c.offsetTop,
			    left = c.offsetLeft,
			    width = c.offsetWidth,
			    height = c.offsetHeight;

			return {
				top: top,
				left: left,
				bottom: top + height,
				right: left + width,
				width: width,
				height: height,
				visible: true
			};
		}

		var CompositeEditor = (function () {
			function CompositeEditor(options) {
				_classCallCheck(this, CompositeEditor);

				this._columns = options.columns;

				var idx = this._columns.length;

				this._editors = [];
				while (idx--) {
					if (this._columns[idx].editor) {
						var newOptions = _utilMisc.extend({}, options);
						newOptions.container = containers[idx];
						newOptions.column = this._columns[idx];
						newOptions.position = getContainerBox(idx);
						newOptions.commitChanges = noop;
						newOptions.cancelChanges = noop;

						this._editors[idx] = new this._columns[idx].editor(newOptions);
					}
				}
			}

			CompositeEditor.prototype.destroy = function destroy() {
				this._editors.forEach(function (editor) {
					editor.destroy();
				});

				if (options.destroy) {
					options.destroy();
				}
			};

			CompositeEditor.prototype.focus = function focus() {
				// if validation has failed, set the focus to the first invalid editor
				(firstInvalidEditor || this._editors[0]).focus();
			};

			CompositeEditor.prototype.isValueChanged = function isValueChanged() {
				return this._editors.some(function (editor) {
					return editor.isValueChanged();
				});
			};

			CompositeEditor.prototype.serializeValue = function serializeValue() {
				return this._editors.reduce(function (prev, editor, index) {
					prev[index] = editor.serializeValue();
					return prev;
				}, {});
			};

			CompositeEditor.prototype.applyValue = function applyValue(item, state) {
				this._editors.forEach(function (editor, index) {
					editor.applyValue(item, state[index]);
				});
			};

			CompositeEditor.prototype.loadValue = function loadValue(item) {
				this._editors.forEach(function (editor, index) {
					editor.loadValue(item);
				});
			};

			CompositeEditor.prototype.validate = function validate() {
				var errors = [];
				firstInvalidEditor = null;

				this._editors.forEach(function (editor, index) {
					var validationResults = editor.validate();
					if (!validationResults.valid) {
						firstInvalidEditor = editor;
						errors.push({
							index: index,
							editor: editor,
							container: containers[index],
							msg: validationResults.msg
						});
					}
				});

				if (errors.length) {
					return {
						valid: false,
						msg: options.validationFailedMsg,
						errors: errors
					};
				} else {
					return {
						valid: true,
						msg: ''
					};
				}
			};

			CompositeEditor.prototype.hide = function hide() {
				this._editors.forEach(function (editor) {
					if (editor.hide) {
						editor.hide();
					}
				});
				if (options.hide) {
					options.hide();
				}
			};

			CompositeEditor.prototype.show = function show() {
				this._editors.forEach(function (editor) {
					if (editor.show) {
						editor.show();
					}
				});
				if (options.show) {
					options.show();
				}
			};

			CompositeEditor.prototype.position = function position(box) {
				if (options.position) {
					options.position(box);
				}
			};

			return CompositeEditor;
		})();

		return CompositeEditor;
	}
});