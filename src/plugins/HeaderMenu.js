import { extend, removeEl, closest, createEl, setPx } from '../util/misc';
import { Event, EventHandler } from '../util/misc';

var defaults = {
	buttonCssClass: null,
	buttonImage: null,
	headerActiveClass: 'spark-header-column-active'
};

/***
 * A plugin to add drop-down menus to column headers.
 *
 * USAGE:
 *
 * Add the plugin .js & .css files and register it with the grid.
 *
 * To specify a menu in a column header, extend the column definition like so:
 *
 *   var columns = [
 *     {
   *       id: 'myColumn',
   *       name: 'My column',
   *
   *       // This is the relevant part
   *       header: {
   *          menu: {
   *              items: [
   *                {
   *                  // menu item options
   *                },
   *                {
   *                  // menu item options
   *                }
   *              ]
   *          }
   *       }
   *     }
 *   ];
 *
 *
 * Available menu options:
 *    tooltip:      Menu button tooltip.
 *
 *
 * Available menu item options:
 *    title:        Menu item text.
 *    disabled:     Whether the item is disabled.
 *    tooltip:      Item tooltip.
 *    command:      A command identifier to be passed to the onCommand event handlers.
 *    iconCssClass: A CSS class to be added to the menu item icon.
 *    iconImage:    A url to the icon image.
 *
 *
 * The plugin exposes the following events:
 *    onBeforeMenuShow:   Fired before the menu is shown.  You can customize the menu or dismiss it by returning false.
 *        Event args:
 *            grid:     Reference to the grid.
 *            column:   Column definition.
 *            menu:     Menu options.  Note that you can change the menu items here.
 *
 *    onCommand:    Fired on menu item click for buttons with 'command' specified.
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
 *    buttonCssClass:   an extra CSS class to add to the menu button
 *    buttonImage:      a url to the menu button image (default '../images/down.gif')
 * @class Slick.Plugins.HeaderButtons
 * @constructor
 */
class HeaderMenu {
	constructor(options) {
		this._grid = null;
		this._handler = new EventHandler();
		this._menu = null;
		this._activeHeaderColumn = null;

		this._options = extend({}, defaults, options);

		this._boundShowMenu = this._showMenu.bind(this);
		this._boundHandleBodyMouseDown = this._handleBodyMouseDown.bind(this);
		this._boundHandleHeaderCellRendered = this._handleHeaderCellRendered.bind(this);
		this._boundHandleMenuItemClick = this._handleMenuItemClick.bind(this);
	}

	init(grid) {
		this._grid = grid;
		this._handler
			.subscribe(this._grid.onHeaderCellRendered, this._boundHandleHeaderCellRendered)
			.subscribe(this._grid.onBeforeHeaderCellDestroy, this._handleBeforeHeaderCellDestroy);

		// Force the grid to re-render the header now that the events are hooked up.
		this._grid.setColumns(this._grid.getColumns());

		// Hide the menu on outside click.
		document.body.addEventListener('mousedown', this._boundHandleBodyMouseDown);
	}

	destroy() {
		this._handler.unsubscribeAll();
		document.body.removeEventListener('mousedown', this._boundHandleBodyMouseDown);
	}

	_handleBodyMouseDown(e) {
		if (this._menu !== e.target && !closest(e.target, this._menu)) {
			this.hideMenu();
		}
	}

	hideMenu() {
		if (this._menu) {
			removeEl(this._menu);
			this._menu = null;
			this._activeHeaderColumn.classList.remove(this._options.headerActiveClass);
		}
	}

	_handleHeaderCellRendered(info) {
		let column = info.data.column;
		var menu = column.header && column.header.menu;

		if (menu) {
			let el = createEl({
				tag: 'div',
				className: 'spark-header-menubutton'
			});
			el.dataset.column = column;
			el.dataset.menu = menu;

			if (this._options.buttonCssClass) {
				el.classList.add(this._options.buttonCssClass);
			}

			if (this._options.buttonImage) {
				el.style.backgroundImage = 'url(" + options.buttonImage + ")';
			}

			if (menu.tooltip) {
				el.setAttribute('title', menu.tooltip);
			}

			el.addEventListener('click', this._boundShowMenu);
			info.data.node.appendChild(el);
		}
	}

	_handleBeforeHeaderCellDestroy(info) {
		let column = info.data.column;

		if (column.header && column.header.menu) {
			removeEl(info.data.node.querySelector('.spark-header-menubutton'));
		}
	}

	_showMenu(e) {
		let menuButton = e.currentTarget,
			menu = menuButton.dataset.menu,
			columnDef = menuButton.dataset.column;

		// Let the user modify the menu or cancel altogether,
		// or provide alternative menu implementation.
		if (this.onBeforeMenuShow.notify({
				grid: this._grid,
				column: columnDef,
				menu: menu
			}, e, this) === false) {
			return;
		}

		if (!menu) {
			menu = createEl({
				tag: 'div',
				className: 'spark-header-menu'
			});
			this._grid.getContainerNode().appendChild(menu);
		}

		menu.innerHTML = '';

		// Construct the menu items.
		for (let i = 0; i < menu.items.length; i++) {
			let item = menu.items[i],
				li = createEl({
					tag: 'div',
					className: 'spark-header-menuitem'
				});
			li.dataset.command = item.command || '';
			li.dataset.column = columnDef;
			li.dataset.item = item;
			li.addEventListener('click', this._boundHandleMenuItemClick);
			menu.appendChild(li);

			if (item.disabled) {
				li.classList.add('spark-header-menuitem-disabled');
			}

			if (item.tooltip) {
				li.setAttribute('title', item.tooltip);
			}

			var icon = createEl({
				tag: 'div',
				className:'spark-header-menuicon'
			});
			li.appendChild(icon);
			if (item.iconCssClass) {
				icon.classList.add(item.iconCssClass);
			}

			if (item.iconImage) {
				icon.style.backgroundImage = 'url(" + item.iconImage + ")';
			}

			let span = createEl({
				tag: 'span',
				className: 'spark-header-menucontent',
				textContent: item.title
			});
			li.appendChild(li);
		}

		// Position the menu.
		setPx(menu, 'top', menuButton.offsetTop + menuButton.offsetHeight);
		setPx(menu, 'left', menuButton.offsetLeft);

		// Mark the header as active to keep the highlighting.
		this._activeHeaderColumn = closest(menuButton, '.spark-header-column');
		this._activeHeaderColumn.classList.add(this._options.headerActiveClass);

		// Stop propagation so that it doesn't register as a header click event.
		e.preventDefault();
		e.stopPropagation();
	}

	_handleMenuItemClick(e) {
		let menuItem = e.currentTarget,
			command = menuItem.dataset.command,
			columnDef = menuItem.dataset.column,
			item = menuItem.dataset.item;

		if (item.disabled) {
			return;
		}

		this.hideMenu();

		if (command != null && command !== '') {
			this.onCommand.notify({
				grid: this._grid,
				column: columnDef,
				command: command,
				item: item
			}, e, this);
		}

		// Stop propagation so that it doesn't register as a header click event.
		e.preventDefault();
		e.stopPropagation();
	}
}

export default HeaderMenu;
