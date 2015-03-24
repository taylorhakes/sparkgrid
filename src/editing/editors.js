import { extend, createEl, removeEl, setStyle } from '../util/misc';

const LEFT = 37,
	RIGHT = 39,
	ESCAPE = 27,
	ENTER = 13,
	TAB = 9;

class TextEditor {
	constructor(options) {
		this._defaultValue = null;
		this._options = options;
		this._inputEl = createEl({
			tag: 'input',
			type: this._options.type || 'text',
			className: 'editor-text'
		});
		this._inputEl.addEventListener('keydown', function (e) {
			if (e.keyCode === LEFT || e.keyCode === RIGHT) {
				e.stopPropagation();
			}
		});
		this._inputEl.focus();
		this._inputEl.setSelectionRange(0, this._inputEl.value.length);
		this._options.container.appendChild(this._inputEl);

	}

	destroy() {
		removeEl(this._inputEl);
	}

	focus() {
		this._inputEl.focus();
	}

	getValue() {
		return this._inputEl.value;
	}

	setValue(val) {
		this._inputEl.value = val;
	}

	loadValue(item) {
		this._defaultValue = item[options.column.field] || '';
		this._inputEl.value = this._defaultValue;
		this._inputEl.defaultValue = this._defaultValue;
		this._inputEl.setSelectionRange(0, this._inputEl.value.length);
	}

	serializeValue() {
		return this._inputEl.value;
	}

	applyValue(item, state) {
		item[this._options.column.field] = state;
	}

	isValueChanged() {
		return (!(this._inputEl.value === '' && this._defaultValue == null)) && (this._inputEl.value !== this._defaultValue);
	}

	validate() {
		if (this._options.column.validator) {
			let validationResults = this._options.column.validator(this._inputEl.value);
			if (!validationResults.valid) {
				return validationResults;
			}
		}

		return {
			valid: true,
			msg: null
		};
	}
}

class NumberEditor extends TextEditor {
	constructor(options) {
		super(extend({ type: 'number' }, options));
	}

	validate() {
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
	}
	serializeValue() {
		return parseFloat(this.inputEl.value) || 0;
	}
}

class YesNoSelectEditor {
	constructor(options) {
		this._defaultValue = null;
		this._options = options;
		this._selectEl = createEl({
			tag: 'select',
			tabIndex: '0',
			className: 'editor-yesno'
		});
		this._selectEl.innerHTML = '<OPTION value="yes">Yes</OPTION><OPTION value="no">No</OPTION>';
		this._options.container.appendChild(this._selectEl);
		this._selectEl.focus();
	}

	destroy() {
		removeEl(this._selectEl);
	}

	focus() {
		this._selectEl.focus();
	}

	loadValue(item) {
		this._defaultValue = item[this._options.column.field]
		this._selectEl.value = this._defaultValue ? 'yes' : 'no';
		this._selectEl.select();
	};

	serializeValue() {
		return this._selectEl.value === 'yes';
	}

	applyValue(item, state) {
		item[this._options.column.field] = state;
	}

	isValueChanged() {
		return this._selectEl.value !== this._defaultValue;
	}

	validate() {
		return {
			valid: true,
			msg: null
		};
	}
}

function CheckboxEditor(args) {
	let select,
		defaultValue;

	this.init = function () {
		select = createEl({
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
 * An example of a 'detached' editor.
 * The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
 * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
 */
function LongTextEditor(args) {
	let input, wrapper, defaultValue, scope = this;

	this.init = function () {
		let container = document.body, buttonWrapper;

		wrapper = createEl({
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

		input = createEl({
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

		let buttons = wrapper.querySelectorAll('button');
		buttons[0].addEventListener('click', this.save);
		buttons[buttons.length - 1].addEventListener('click', this.cancel);
		input.addEventListener('keydown', this.handleKeyDown);

		scope.position(args.position);
		input.focus();
		input.select();
	};

	this.handleKeyDown = function (e) {
		if (e.which === ENTER && e.ctrlKey) {
			scope.save();
		} else if (e.which === ESCAPE) {
			e.preventDefault();
			scope.cancel();
		} else if (e.which === TAB && e.shiftKey) {
			e.preventDefault();
			args.grid.navigatePrev();
		} else if (e.which === TAB) {
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
		setStyle(wrapper, {
			top: position.top - 5 + 'px',
			left: position.left - 5 + 'px'
		});
	};

	this.destroy = function () {
		removeEl(wrapper);
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
		return (!(input.value === '' && defaultValue == null)) && (input.value !== defaultValue);
	};

	this.validate = function () {
		return {
			valid: true,
			msg: null
		};
	};

	this.init();
}

export {
	TextEditor as Text,
	IntegerEditor as Integer,
	YesNoSelectEditor as YesNoSelect,
	CheckboxEditor as Checkbox,
	LongTextEditor as LongText
};

