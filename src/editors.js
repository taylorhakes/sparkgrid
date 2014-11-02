/***
 * Contains basic SlickGrid editors.
 * @module Editors
 * @namespace Slick
 */

(function ($) {
	'use strict';

	var core = require('./core');

	/* TODO: Remove jQuery from this file */

	var LEFT_CODE = 37,
		RIGHT_CODE = 39;

	function TextEditor(args) {
		var inputEl;
		var defaultValue;

		this.init = function () {
			inputEl = document.createElement('input');
			inputEl.type = 'text';
			inputEl.className = 'editor-text';
			inputEl.addEventListener('keydown', function() {
				if (e.keyCode === LEFT_CODE || e.keyCode === RIGHT_CODE) {
					e.stopPropagation();
				}
			});
			inputEl.focus();
			inputEl.setSelectionRange(0, inputEl.value.length);
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
			if (isNaN(inputEl.val())) {
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
			return parseInt(inputEl.val(), 10) || 0;
		};
	}

	function YesNoSelectEditor(args) {
		var selectEl;
		var defaultValue;

		this.init = function () {
			selectEl = $("<SELECT tabIndex='0' class='editor-yesno'><OPTION value='yes'>Yes</OPTION><OPTION value='no'>No</OPTION></SELECT>");
			selectEl.appendTo(args.container);
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
			return (selectEl.val() == "yes");
		};

		this.applyValue = function (item, state) {
			item[args.column.field] = state;
		};

		this.isValueChanged = function () {
			return (selectEl.val() != defaultValue);
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
		var $select;
		var defaultValue;

		this.init = function () {
			$select = $("<INPUT type=checkbox value='true' class='editor-checkbox' hideFocus>");
			$select.appendTo(args.container);
			$select.focus();
		};

		this.destroy = function () {
			$select.remove();
		};

		this.focus = function () {
			$select.focus();
		};

		this.loadValue = function (item) {
			defaultValue = !!item[args.column.field];
			if (defaultValue) {
				$select.prop('checked', true);
			} else {
				$select.prop('checked', false);
			}
		};

		this.serializeValue = function () {
			return $select.prop('checked');
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

	function PercentCompleteEditor(args) {
		var $input, $picker;
		var defaultValue;
		var scope = this;

		this.init = function () {
			$input = $("<INPUT type=text class='editor-percentcomplete' />");
			$input.width($(args.container).innerWidth() - 25);
			$input.appendTo(args.container);

			$picker = $("<div class='editor-percentcomplete-picker' />").appendTo(args.container);
			$picker.append("<div class='editor-percentcomplete-helper'><div class='editor-percentcomplete-wrapper'><div class='editor-percentcomplete-slider' /><div class='editor-percentcomplete-buttons' /></div></div>");

			$picker.find(".editor-percentcomplete-buttons").append("<button val=0>Not started</button><br/><button val=50>In Progress</button><br/><button val=100>Complete</button>");

			$input.focus().select();

			$picker.find(".editor-percentcomplete-slider").slider({
				orientation: "vertical",
				range: "min",
				value: defaultValue,
				slide: function (event, ui) {
					$input.val(ui.value)
				}
			});

			$picker.find(".editor-percentcomplete-buttons button").bind("click", function (e) {
				$input.val($(this).attr("val"));
				$picker.find(".editor-percentcomplete-slider").slider("value", $(this).attr("val"));
			})
		};

		this.destroy = function () {
			$input.remove();
			$picker.remove();
		};

		this.focus = function () {
			$input.focus();
		};

		this.loadValue = function (item) {
			$input.val(defaultValue = item[args.column.field]);
			$input.select();
		};

		this.serializeValue = function () {
			return parseInt($input.val(), 10) || 0;
		};

		this.applyValue = function (item, state) {
			item[args.column.field] = state;
		};

		this.isValueChanged = function () {
			return (!($input.val() == "" && defaultValue == null)) && ((parseInt($input.val(),
				10) || 0) != defaultValue);
		};

		this.validate = function () {
			if (isNaN(parseInt($input.val(), 10))) {
				return {
					valid: false,
					msg: "Please enter a valid positive number"
				};
			}

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
		var $input, $wrapper;
		var defaultValue;
		var scope = this;

		this.init = function () {
			var $container = $("body");

			$wrapper = $("<DIV style='z-index:10000;position:absolute;background:white;padding:5px;border:3px solid gray; -moz-border-radius:10px; border-radius:10px;'/>").appendTo($container);

			$input = $("<TEXTAREA hidefocus rows=5 style='backround:white;width:250px;height:80px;border:0;outline:0'>").appendTo($wrapper);

			$("<DIV style='text-align:right'><BUTTON>Save</BUTTON><BUTTON>Cancel</BUTTON></DIV>").appendTo($wrapper);

			$wrapper.find("button:first").bind("click", this.save);
			$wrapper.find("button:last").bind("click", this.cancel);
			$input.bind("keydown", this.handleKeyDown);

			scope.position(args.position);
			$input.focus().select();
		};

		this.handleKeyDown = function (e) {
			if (e.which == $.ui.keyCode.ENTER && e.ctrlKey) {
				scope.save();
			} else if (e.which == $.ui.keyCode.ESCAPE) {
				e.preventDefault();
				scope.cancel();
			} else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
				e.preventDefault();
				args.grid.navigatePrev();
			} else if (e.which == $.ui.keyCode.TAB) {
				e.preventDefault();
				args.grid.navigateNext();
			}
		};

		this.save = function () {
			args.commitChanges();
		};

		this.cancel = function () {
			$input.val(defaultValue);
			args.cancelChanges();
		};

		this.hide = function () {
			$wrapper.hide();
		};

		this.show = function () {
			$wrapper.show();
		};

		this.position = function (position) {
			$wrapper.css("top", position.top - 5).css("left", position.left - 5)
		};

		this.destroy = function () {
			$wrapper.remove();
		};

		this.focus = function () {
			$input.focus();
		};

		this.loadValue = function (item) {
			$input.val(defaultValue = item[args.column.field]);
			$input.select();
		};

		this.serializeValue = function () {
			return $input.val();
		};

		this.applyValue = function (item, state) {
			item[args.column.field] = state;
		};

		this.isValueChanged = function () {
			return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
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
		"Date": DateEditor,
		"YesNoSelect": YesNoSelectEditor,
		"Checkbox": CheckboxEditor,
		"PercentComplete": PercentCompleteEditor,
		"LongText": LongTextEditor
	};
})(jQuery);
