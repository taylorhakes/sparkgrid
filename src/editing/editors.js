import { extend, createEl, removeEl, setStyle } from '../util/misc';
import { KEYCODES } from '../util/events';


class Text {
	constructor(options) {
		this._defaultValue = null;
		this._options = options;
		this._inputEl = createEl({
			tag: 'input',
			type: this._options.type || 'text',
			className: 'editor-text'
		});
		this._inputEl.addEventListener('keydown', function (e) {
			if (e.keyCode === KEYCODES.LEFT || e.keyCode === KEYCODES.RIGHT) {
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
		this._defaultValue = item[this._options.column.field] || '';
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

class Number extends Text {
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

class YesNoSelect {
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
		this._defaultValue = item[this._options.column.field];
		this._selectEl.value = this._defaultValue ? 'yes' : 'no';
		this._selectEl.select();
	}

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

class Checkbox {
	constructor(options) {
		this._defaultValue = null;
		this._select = createEl({
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

	destroy() {
		removeEl(this._select);
	}

	focus() {
		this._select.focus();
	}

	loadValue(item) {
		this._select.checked = !!item[this._options.column.field];
	}

	serializeValue() {
		return this._select.checked;
	}

	applyValue(item, state) {
		item[this._options.column.field] = state;
	}

	isValueChanged() {
		return this.serializeValue() !== this._defaultValue;
	}

	validate() {
		return {
			valid: true,
			msg: null
		};
	}
}

/*
 * An example of a 'detached' editor.
 * The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
 * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
 */
class LongText {
	constructor(options) {
		this._defaaultValue = null;
		this._container = options.container || document.body;
		this._wrapper = createEl({
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

		this._input = createEl({
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

		let buttons = this._wrapper.querySelectorAll('button');
		buttons[0].addEventListener('click', this.save.bind(this));
		buttons[1].addEventListener('click', this.cancel.bind(this));
		this._input.addEventListener('keydown', this.handleKeyDown.bind(this));

		this.position(options.position);
		this._input.focus();
		this._input.select();
	}

	handleKeyDown(e) {
		if (e.which === KEYCODES.ENTER && e.ctrlKey) {
			this.save();
		} else if (e.which === KEYCODES.ESCAPE) {
			e.preventDefault();
			this.cancel();
		} else if (e.which === KEYCODES.TAB && e.shiftKey) {
			e.preventDefault();
			this._options.grid.navigatePrev();
		} else if (e.which === KEYCODES.TAB) {
			e.preventDefault();
			this._options.grid.navigateNext();
		}
	}

	save() {
		this._options.commitChanges();
	}

	cancel() {
		this._input.value = this._defaultValue;
		this._options.cancelChanges();
	}

	hide() {
		this._wrapper.style.display = 'none';
	}

	show() {
		this._wrapper.style.display = '';
	}

	position(position) {
		setStyle(this._wrapper, {
			top: position.top - 5 + 'px',
			left: position.left - 5 + 'px'
		});
	}

	destroy() {
		removeEl(this._wrapper);
	}

	focus() {
		this._input.focus();
	}

	loadValue(item) {
		this._input.value = this._defaultValue = item[this._options.column.field];
		this._input.select();
	}

	serializeValue() {
		return this._input.value;
	}

	applyValue(item, state) {
		item[this._options.column.field] = state;
	}

	isValueChanged() {
		return (!(this._input.value === '' && this._defaultValue == null)) && (this._input.value !== this._defaultValue);
	}

	validate() {
		return {
			valid: true,
			msg: null
		};
	}
}

export {
	Text,
	Number,
	YesNoSelect,
	Checkbox,
	LongText
};

