import { extend } from '../util/misc';

let defaultOptions = {
		validationFailedMsg: "Some of the fields have failed validation",
		show: null,
		hide: null,
		position: null,
		destroy: null
	},
	noop = () => {};

function getCompositeEditor(options) {
	let firstInvalidEditor,
		containers = options.containers;

	options = extend({}, defaultOptions, options);

	function getContainerBox(i) {
		let c = containers[ i ],
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

	class CompositeEditor {
		constructor(options) {
			let idx = columns.length;

			this._editors = [];
			while (idx--) {
				if (columns[ idx ].editor) {
					let newOptions = extend({}, options);
					newOptions.container = containers[ idx ];
					newOptions.column = columns[ idx ];
					newOptions.position = getContainerBox(idx);
					newOptions.commitChanges = noop;
					newOptions.cancelChanges = noop;

					this._editors[ idx ] = new (columns[ idx ].editor)(newOptions);
				}
			}
		}

		destroy() {
			this._editors.forEach((editor) => {
				editor.destroy();
			});

			options.destroy && options.destroy();
		};

		focus() {
			// if validation has failed, set the focus to the first invalid editor
			(firstInvalidEditor || this._editors[ 0 ]).focus();
		}

		isValueChanged() {
			return this._editors.some((editor) => {
				return editor.isValueChanged();
			});
		}

		serializeValue() {
			return this._editors.reduce((prev, editor, index) => {
				prev[index] = editor.serializeValue();
				return prev;
			}, {});
		}

		applyValue(item, state) {
			this._editors.forEach((editor, index) => {
				editor.applyValue(item, state[ index ]);
			});
		}

		loadValue(item) {
			this._editors.forEach((editor, index) => {
				editor.loadValue(item);
			});
		}

		validate() {
			let errors = [];
			firstInvalidEditor = null;

			this._editors.forEach((editor, index) => {
				let validationResults = editor.validate();
				if (!validationResults.valid) {
					firstInvalidEditor = editor;
					errors.push({
						index: index,
						editor: editor,
						container: containers[ index ],
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
					msg: ""
				};
			}
		}

		hide() {
			this._editors.forEach((editor) => {
				editor.hide && editor.hide();
			});
			options.hide && options.hide();
		}

		show() {
			this._editors.forEach((editor) => {
				editor.show && editor.show();
			});
			options.show && options.show();
		}

		position(box) {
			options.position && options.position(box);
		}
	}

	return CompositeEditor;
}