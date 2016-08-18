(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', '../util/misc', '../util/events'], factory);
	} else if (typeof exports !== 'undefined') {
		factory(exports, require('../util/misc'), require('../util/events'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, global.misc, global.events);
		global.editors = mod.exports;
	}
})(this, function (exports, _utilMisc, _utilEvents) {
	'use strict';

	exports.__esModule = true;

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var Text = (function () {
		function Text(options) {
			_classCallCheck(this, Text);

			this._defaultValue = null;
			this._options = options;
			this._inputEl = _utilMisc.createEl({
				tag: 'input',
				type: this._options.type || 'text',
				className: 'editor-text'
			});
			this._inputEl.addEventListener('keydown', function (e) {
				if (e.keyCode === _utilEvents.KEYCODES.LEFT || e.keyCode === _utilEvents.KEYCODES.RIGHT) {
					e.stopPropagation();
				}
			});
			this._inputEl.focus();
			this._inputEl.setSelectionRange(0, this._inputEl.value.length);
			this._options.container.appendChild(this._inputEl);
		}

		Text.prototype.destroy = function destroy() {
			_utilMisc.removeEl(this._inputEl);
		};

		Text.prototype.focus = function focus() {
			this._inputEl.focus();
		};

		Text.prototype.getValue = function getValue() {
			return this._inputEl.value;
		};

		Text.prototype.setValue = function setValue(val) {
			this._inputEl.value = val;
		};

		Text.prototype.loadValue = function loadValue(item) {
			this._defaultValue = item[this._options.column.field] || '';
			this._inputEl.value = this._defaultValue;
			this._inputEl.defaultValue = this._defaultValue;
			this._inputEl.setSelectionRange(0, this._inputEl.value.length);
		};

		Text.prototype.serializeValue = function serializeValue() {
			return this._inputEl.value;
		};

		Text.prototype.applyValue = function applyValue(item, state) {
			item[this._options.column.field] = state;
		};

		Text.prototype.isValueChanged = function isValueChanged() {
			return !(this._inputEl.value === '' && this._defaultValue == null) && this._inputEl.value !== this._defaultValue;
		};

		Text.prototype.validate = function validate() {
			if (this._options.column.validator) {
				var validationResults = this._options.column.validator(this._inputEl.value);
				if (!validationResults.valid) {
					return validationResults;
				}
			}

			return {
				valid: true,
				msg: null
			};
		};

		return Text;
	})();

	var Number = (function (_Text) {
		_inherits(Number, _Text);

		function Number(options) {
			_classCallCheck(this, Number);

			_Text.call(this, _utilMisc.extend({ type: 'number' }, options));
		}

		Number.prototype.validate = function validate() {
			if (isNaN(this._inputEl.value)) {
				return {
					valid: false,
					msg: 'Please enter a valid number'
				};
			}

			return {
				valid: true,
				msg: null
			};
		};

		Number.prototype.serializeValue = function serializeValue() {
			return parseFloat(this.inputEl.value) || 0;
		};

		return Number;
	})(Text);

	var YesNoSelect = (function () {
		function YesNoSelect(options) {
			_classCallCheck(this, YesNoSelect);

			this._defaultValue = null;
			this._options = options;
			this._selectEl = _utilMisc.createEl({
				tag: 'select',
				tabIndex: '0',
				className: 'editor-yesno'
			});
			this._selectEl.innerHTML = '<OPTION value="yes">Yes</OPTION><OPTION value="no">No</OPTION>';
			this._options.container.appendChild(this._selectEl);
			this._selectEl.focus();
		}

		YesNoSelect.prototype.destroy = function destroy() {
			_utilMisc.removeEl(this._selectEl);
		};

		YesNoSelect.prototype.focus = function focus() {
			this._selectEl.focus();
		};

		YesNoSelect.prototype.loadValue = function loadValue(item) {
			this._defaultValue = item[this._options.column.field];
			this._selectEl.value = this._defaultValue ? 'yes' : 'no';
			this._selectEl.select();
		};

		YesNoSelect.prototype.serializeValue = function serializeValue() {
			return this._selectEl.value === 'yes';
		};

		YesNoSelect.prototype.applyValue = function applyValue(item, state) {
			item[this._options.column.field] = state;
		};

		YesNoSelect.prototype.isValueChanged = function isValueChanged() {
			return this._selectEl.value !== this._defaultValue;
		};

		YesNoSelect.prototype.validate = function validate() {
			return {
				valid: true,
				msg: null
			};
		};

		return YesNoSelect;
	})();

	var Checkbox = (function () {
		function Checkbox(options) {
			_classCallCheck(this, Checkbox);

			this._defaultValue = null;
			this._select = _utilMisc.createEl({
				tag: 'input',
				type: 'checkbox',
				checked: true,
				className: 'editor-checkbox',
				hideFocus: true
			});
			this._options = options;
			this._select.focus();
			options.container.appendChild(this._select);
		}

		/*
   * An example of a 'detached' editor.
   * The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
   * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
   */

		Checkbox.prototype.destroy = function destroy() {
			_utilMisc.removeEl(this._select);
		};

		Checkbox.prototype.focus = function focus() {
			this._select.focus();
		};

		Checkbox.prototype.loadValue = function loadValue(item) {
			this._select.checked = !!item[this._options.column.field];
		};

		Checkbox.prototype.serializeValue = function serializeValue() {
			return this._select.checked;
		};

		Checkbox.prototype.applyValue = function applyValue(item, state) {
			item[this._options.column.field] = state;
		};

		Checkbox.prototype.isValueChanged = function isValueChanged() {
			return this.serializeValue() !== this._defaultValue;
		};

		Checkbox.prototype.validate = function validate() {
			return {
				valid: true,
				msg: null
			};
		};

		return Checkbox;
	})();

	var LongText = (function () {
		function LongText(options) {
			_classCallCheck(this, LongText);

			this._defaaultValue = null;
			this._container = options.container || document.body;
			this._wrapper = _utilMisc.createEl({
				tag: 'div',
				style: {
					zIndex: 10000,
					position: 'absolute',
					background: '#fff',
					padding: '5px',
					border: '3px solid gray',
					borderRadius: '10px'
				}
			});
			this._container.appendChild(this._wrapper);

			this._input = _utilMisc.createEl({
				tag: 'textarea',
				rows: 5,
				style: {
					background: '#fff',
					width: '250px',
					height: '80px',
					border: 0,
					outline: 0
				}
			});

			this._wrapper.innerHTML = '<DIV style="text-align:right"><BUTTON>Save</BUTTON><BUTTON>Cancel</BUTTON></DIV>';
			this._wrapper.appendChild(this._input);

			var buttons = this._wrapper.querySelectorAll('button');
			buttons[0].addEventListener('click', this.save.bind(this));
			buttons[1].addEventListener('click', this.cancel.bind(this));
			this._input.addEventListener('keydown', this.handleKeyDown.bind(this));

			this.position(options.position);
			this._input.focus();
			this._input.select();
		}

		LongText.prototype.handleKeyDown = function handleKeyDown(e) {
			if (e.which === _utilEvents.KEYCODES.ENTER && e.ctrlKey) {
				this.save();
			} else if (e.which === _utilEvents.KEYCODES.ESCAPE) {
				e.preventDefault();
				this.cancel();
			} else if (e.which === _utilEvents.KEYCODES.TAB && e.shiftKey) {
				e.preventDefault();
				this._options.grid.navigatePrev();
			} else if (e.which === _utilEvents.KEYCODES.TAB) {
				e.preventDefault();
				this._options.grid.navigateNext();
			}
		};

		LongText.prototype.save = function save() {
			this._options.commitChanges();
		};

		LongText.prototype.cancel = function cancel() {
			this._input.value = this._defaultValue;
			this._options.cancelChanges();
		};

		LongText.prototype.hide = function hide() {
			this._wrapper.style.display = 'none';
		};

		LongText.prototype.show = function show() {
			this._wrapper.style.display = '';
		};

		LongText.prototype.position = function position(_position) {
			_utilMisc.setStyle(this._wrapper, {
				top: _position.top - 5 + 'px',
				left: _position.left - 5 + 'px'
			});
		};

		LongText.prototype.destroy = function destroy() {
			_utilMisc.removeEl(this._wrapper);
		};

		LongText.prototype.focus = function focus() {
			this._input.focus();
		};

		LongText.prototype.loadValue = function loadValue(item) {
			this._input.value = this._defaultValue = item[this._options.column.field];
			this._input.select();
		};

		LongText.prototype.serializeValue = function serializeValue() {
			return this._input.value;
		};

		LongText.prototype.applyValue = function applyValue(item, state) {
			item[this._options.column.field] = state;
		};

		LongText.prototype.isValueChanged = function isValueChanged() {
			return !(this._input.value === '' && this._defaultValue == null) && this._input.value !== this._defaultValue;
		};

		LongText.prototype.validate = function validate() {
			return {
				valid: true,
				msg: null
			};
		};

		return LongText;
	})();

	exports.Text = Text;
	exports.Number = Number;
	exports.YesNoSelect = YesNoSelect;
	exports.Checkbox = Checkbox;
	exports.LongText = LongText;
});