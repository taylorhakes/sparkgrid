(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc', '../util/events'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'), require('../util/events'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc, global.events);
		global.HeaderButtons = mod.exports;
	}
})(this, function (exports, module, _utilMisc, _utilEvents) {
	/***
  * A plugin to add custom buttons to column headers.
  *
  * USAGE:
  *
  * Add the plugin .js & .css files and register it with the grid.
  *
  * To specify a custom button in a column header, extend the column definition like so:
  *
  *   var columns = [
  *     {
    *       id: 'myColumn',
    *       name: 'My column',
    *
    *       // This is the relevant part
    *       header: {
    *          buttons: [
    *              {
    *                // button options
    *              },
    *              {
    *                // button options
    *              }
    *          ]
    *       }
    *     }
  *   ];
  *
  * Available button options:
  *    cssClass:     CSS class to add to the button.
  *    image:        Relative button image path.
  *    tooltip:      Button tooltip.
  *    showOnHover:  Only show the button on hover.
  *    handler:      Button click handler.
  *    command:      A command identifier to be passed to the onCommand event handlers.
  *
  * The plugin exposes the following events:
  *    onCommand:    Fired on button click for buttons with 'command' specified.
  *        Event args:
  *            grid:     Reference to the grid.
  *            column:   Column definition.
  *            command:  Button command identified.
  *            button:   Button options.  Note that you can change the button options in your
  *                      event handler, and the column header will be automatically updated to
  *                      reflect them.  This is useful if you want to implement something like a
  *                      toggle button.
  *
  *
  * @param options {Object} Options:
  *    buttonCssClass:   a CSS class to use for buttons (default 'slick-header-button')
  * @class Slick.Plugins.HeaderButtons
  * @constructor
  */
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var defaults = {
		buttonCssClass: 'spark-header-button'
	};

	var HeaderButtons = (function () {
		function HeaderButtons(options) {
			_classCallCheck(this, HeaderButtons);

			this._grid = null;
			this._handler = new _utilEvents.EventHandler();
			this._options = _utilMisc.extend({}, defaults, options);
			this.onCommand = new _utilEvents.Event();
		}

		HeaderButtons.prototype.init = function init(grid) {
			this._grid = grid;
			this._boundHandleHeaderCellRendered = this._handleHeaderCellRendered.bind(this);
			this._boundHandleBeforeHeaderCellDestroy = this._handleBeforeHeaderCellDestroy.bind(this);
			this._boundHandleButtonClick = this._handleButtonClick.bind(this);
			this._handler.subscribe(grid.onHeaderCellRendered, this._boundHandleHeaderCellRendered).subscribe(grid.onBeforeHeaderCellDestroy, this._boundHandleBeforeHeaderCellDestroy);

			// Force the grid to re-render the header now that the events are hooked up.
			grid.setColumns(grid.getColumns());
		};

		HeaderButtons.prototype.destroy = function destroy() {
			this._handler.unsubscribeAll();
		};

		HeaderButtons.prototype._handleHeaderCellRendered = function _handleHeaderCellRendered(info) {
			var column = info.data.column;

			if (column.header && column.header.buttons) {
				// Append buttons in reverse order since they are floated to the right.
				var i = column.header.buttons.length;
				while (i--) {
					var button = column.header.buttons[i],
					    btn = _utilMisc.createEl({
						tag: 'div',
						className: this._options.buttonCssClass
					});

					btn.dataset.column = column;
					btn.dataset.button = button;

					if (button.showOnHover) {
						btn.classList.add('spark-header-button-hidden');
					}

					if (button.image) {
						btn.style.backgroundImage = 'url(' + button.image + ')';
					}

					if (button.cssClass) {
						btn.classList.add(button.cssClass);
					}

					if (button.tooltip) {
						btn.title = button.tooltip;
					}

					if (button.command) {
						btn.dataset.command = button.command;
					}

					if (button.handler) {
						btn.addEventListener('click', button.handler);
					}

					btn.addEventListener('click', this._boundHandleButtonClick);
					info.data.node.appendChild(btn);
				}
			}
		};

		HeaderButtons.prototype._handleBeforeHeaderCellDestroy = function _handleBeforeHeaderCellDestroy(info) {
			var column = info.data.column;

			if (column.header && column.header.buttons) {
				// Removing buttons via jQuery will also clean up any event handlers and data.
				// NOTE: If you attach event handlers directly or using a different framework,
				//       you must also clean them up here to avoid memory leaks.
				_utilMisc.slice(info.data.node.querySelectorAll('.' + this._options.buttonCssClass)).forEach(function (btn) {
					_utilMisc.removeEl(btn);
				});
			}
		};

		HeaderButtons.prototype._handleButtonClick = function _handleButtonClick(info) {
			var e = info.event,
			    el = e.target,
			    command = el.dataset.command,
			    columnDef = el.dataset.column,
			    button = el.dataset.button;

			if (command != null) {
				this.onCommand.notify({
					grid: this._grid,
					column: columnDef,
					command: command,
					button: button
				}, e, this);

				// Update the header in case the user updated the button definition in the handler.
				this._grid.updateColumnHeader(columnDef.id);
			}

			// Stop propagation so that it doesn't register as a header click event.
			e.preventDefault();
			e.stopPropagation();
		};

		return HeaderButtons;
	})();

	module.exports = HeaderButtons;
});