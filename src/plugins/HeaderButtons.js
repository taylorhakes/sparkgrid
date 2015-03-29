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
import {  createEl, slice, extend, removeEl } from '../util/misc';
import { EventHandler, Event } from '../util/events';

let defaults = {
	buttonCssClass: 'spark-header-button'
};

class HeaderButtons {
	constructor(options) {
		this._grid = null;
		this._handler = new EventHandler();
		this._options = extend({}, defaults, options);
		this.onCommand = new Event();
	}

	init(grid) {
		this._grid = grid;
		this._boundHandleHeaderCellRendered = this._handleHeaderCellRendered.bind(this);
		this._boundHandleBeforeHeaderCellDestroy = this._handleBeforeHeaderCellDestroy.bind(this);
		this._boundHandleButtonClick = this._handleButtonClick.bind(this);
		this._handler
			.subscribe(grid.onHeaderCellRendered, this._boundHandleHeaderCellRendered)
			.subscribe(grid.onBeforeHeaderCellDestroy, this._boundHandleBeforeHeaderCellDestroy);

		// Force the grid to re-render the header now that the events are hooked up.
		grid.setColumns(grid.getColumns());
	}


	destroy() {
		this._handler.unsubscribeAll();
	}


	_handleHeaderCellRendered(info) {
		let column = info.data.column;

		if (column.header && column.header.buttons) {
			// Append buttons in reverse order since they are floated to the right.
			let i = column.header.buttons.length;
			while (i--) {
				let button = column.header.buttons[i],
					btn = createEl({
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
	}


	_handleBeforeHeaderCellDestroy(info) {
		var column = info.data.column;

		if (column.header && column.header.buttons) {
			// Removing buttons via jQuery will also clean up any event handlers and data.
			// NOTE: If you attach event handlers directly or using a different framework,
			//       you must also clean them up here to avoid memory leaks.
			slice(info.data.node.querySelectorAll('.' + this._options.buttonCssClass)).forEach(function (btn) {
				removeEl(btn);
			});
		}
	}


	_handleButtonClick(info) {
		let e = info.event,
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
	}
}

export default HeaderButtons;