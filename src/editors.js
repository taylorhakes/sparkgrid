/***
 * Contains basic SlickGrid editors.
 * @module Editors
 * @namespace Slick
 */

(function () {
	'use strict';

  var core = require('./core');

	var LEFT_CODE = 37,
		RIGHT_CODE = 39,
    ESCAPE = 27,
    ENTER = 13,
    TAB = 9;

	function TextEditor(args) {
		var inputEl;
		var defaultValue;

		this.init = function () {
			inputEl = core.createEl({
        tag: 'input',
        type: 'text',
        className: 'editor-text'
      });
			inputEl.addEventListener('keydown', function(e) {
				if (e.keyCode === LEFT_CODE || e.keyCode === RIGHT_CODE) {
					e.stopPropagation();
				}
			});
			inputEl.focus();
			inputEl.setSelectionRange(0, inputEl.value.length);
			args.container.appendChild(inputEl);
		};

		this.destroy = function () {
			inputEl.remove();
		};

		this.focus = function () {
			inputEl.focus();
		};

		this.getValue = function () {
			return inputEl.value;
		};

		this.setValue = function (val) {
			inputEl.value = val;
		};

		this.loadValue = function (item) {
			defaultValue = item[args.column.field] || "";
			inputEl.value = defaultValue;
			inputEl.defaultValue = defaultValue;
			inputEl.setSelectionRange(0, inputEl.value.length);
		};

		this.serializeValue = function () {
			return inputEl.value;
		};

		this.applyValue = function (item, state) {
			item[args.column.field] = state;
		};

		this.isValueChanged = function () {
			return (!(inputEl.value == "" && defaultValue == null)) && (inputEl.value != defaultValue);
		};

		this.validate = function () {
			if (args.column.validator) {
				var validationResults = args.column.validator(inputEl.value);
				if (!validationResults.valid) {
					return validationResults;
				}
			}

			return {
				valid: true,
				msg: null
			};
		};

		this.init();
	}

	function IntegerEditor(args) {
		var inputEl;

		core.extend(this, new TextEditor(args));

		this.validate = function () {
			if (isNaN(inputEl.value)) {
				return {
					valid: false,
					msg: "Please enter a valid integer"
				};
			}

			return {
				valid: true,
				msg: null
			};
		};
		this.serializeValue = function () {
			return parseInt(inputEl.value, 10) || 0;
		};
	}

	function YesNoSelectEditor(args) {
		var selectEl;
		var defaultValue;

		this.init = function () {
			selectEl = core.createEl({
        tag: 'select',
        tabIndex: '0',
        className: 'editor-yesno'
      });
      selectEl.innerHTML = '<OPTION value="yes">Yes</OPTION><OPTION value="no">No</OPTION>';
			args.container.appendChild(selectEl);
			selectEl.focus();
		};

		this.destroy = function () {
			selectEl.remove();
		};

		this.focus = function () {
			selectEl.focus();
		};

		this.loadValue = function (item) {
			selectEl.val((defaultValue = item[args.column.field]) ? "yes" : "no");
			selectEl.select();
		};

		this.serializeValue = function () {
			return (selectEl.value == "yes");
		};

		this.applyValue = function (item, state) {
			item[args.column.field] = state;
		};

		this.isValueChanged = function () {
			return (selectEl.value != defaultValue);
		};

		this.validate = function () {
			return {
				valid: true,
				msg: null
			};
		};

		this.init();
	}

	function CheckboxEditor(args) {
		var select;
		var defaultValue;

		this.init = function () {
			select = core.createEl({
        tag: 'input',
        type: 'checkbox',
        checked: true,
        className: 'editor-checkbox',
        hideFocus: true
      });
			args.container.appendChild(select);
			select.focus();
		};

		this.destroy = function () {
			select.remove();
		};

		this.focus = function () {
			select.focus();
		};

		this.loadValue = function (item) {
			select.checked = !!item[args.column.field];
		};

		this.serializeValue = function () {
			return select.checked;
		};

		this.applyValue = function (item, state) {
			item[args.column.field] = state;
		};

		this.isValueChanged = function () {
			return (this.serializeValue() !== defaultValue);
		};

		this.validate = function () {
			return {
				valid: true,
				msg: null
			};
		};

		this.init();
	}

	/*
	 * An example of a "detached" editor.
	 * The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
	 * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
	 */
	function LongTextEditor(args) {
		var input, wrapper;
		var defaultValue;
		var scope = this;

		this.init = function () {
			var container = document.body, buttonWrapper;

			wrapper = core.createEl({
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
      container.appendChild(wrapper);

			input = core.createEl({
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

      wrapper.innerHTML = '<DIV style="text-align:right"><BUTTON>Save</BUTTON><BUTTON>Cancel</BUTTON></DIV>';
      wrapper.appendChild(input);

      var buttons = wrapper.querySelectorAll("button");
			buttons[0].addEventListener("click", this.save);
			buttons[buttons.length - 1].addEventListener("click", this.cancel);
			input.addEventListener("keydown", this.handleKeyDown);

			scope.position(args.position);
			input.focus();
      input.select();
		};

		this.handleKeyDown = function (e) {
			if (e.which == ENTER && e.ctrlKey) {
				scope.save();
			} else if (e.which == ESCAPE) {
				e.preventDefault();
				scope.cancel();
			} else if (e.which == TAB && e.shiftKey) {
				e.preventDefault();
				args.grid.navigatePrev();
			} else if (e.which == TAB) {
				e.preventDefault();
				args.grid.navigateNext();
			}
		};

		this.save = function () {
			args.commitChanges();
		};

		this.cancel = function () {
			input.value = defaultValue;
			args.cancelChanges();
		};

		this.hide = function () {
			wrapper.style.display = 'none';
		};

		this.show = function () {
			wrapper.style.display = '';
		};

		this.position = function (position) {
			core.setStyle(wrapper, {
        top: position.top - 5 + 'px',
        left: position.left - 5 + 'px'
      });
		};

		this.destroy = function () {
			core.removeEl(wrapper);
		};

		this.focus = function () {
			input.focus();
		};

		this.loadValue = function (item) {
			input.value = defaultValue = item[args.column.field];
			input.select();
		};

		this.serializeValue = function () {
			return input.value;
		};

		this.applyValue = function (item, state) {
			item[args.column.field] = state;
		};

		this.isValueChanged = function () {
			return (!(input.value == "" && defaultValue == null)) && (input.value != defaultValue);
		};

		this.validate = function () {
			return {
				valid: true,
				msg: null
			};
		};

		this.init();
	}

	module.exports = {
		"Text": TextEditor,
		"Integer": IntegerEditor,
		"YesNoSelect": YesNoSelectEditor,
		"Checkbox": CheckboxEditor,
		"LongText": LongTextEditor
	};
})();
