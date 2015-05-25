(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module', '../util/misc'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module, require('../util/misc'));
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod, global.misc);
		global.HeaderMenu = mod.exports;
	}
})(this, function (exports, module, _utilMisc) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

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

	var HeaderMenu = (function () {
		function HeaderMenu(options) {
			_classCallCheck(this, HeaderMenu);

			this._grid = null;
			this._handler = new _utilMisc.EventHandler();
			this._menu = null;
			this._activeHeaderColumn = null;

			this._options = _utilMisc.extend({}, defaults, options);

			this._boundShowMenu = this._showMenu.bind(this);
			this._boundHandleBodyMouseDown = this._handleBodyMouseDown.bind(this);
			this._boundHandleHeaderCellRendered = this._handleHeaderCellRendered.bind(this);
			this._boundHandleMenuItemClick = this._handleMenuItemClick.bind(this);
		}

		HeaderMenu.prototype.init = function init(grid) {
			this._grid = grid;
			this._handler.subscribe(this._grid.onHeaderCellRendered, this._boundHandleHeaderCellRendered).subscribe(this._grid.onBeforeHeaderCellDestroy, this._handleBeforeHeaderCellDestroy);

			// Force the grid to re-render the header now that the events are hooked up.
			this._grid.setColumns(this._grid.getColumns());

			// Hide the menu on outside click.
			document.body.addEventListener('mousedown', this._boundHandleBodyMouseDown);
		};

		HeaderMenu.prototype.destroy = function destroy() {
			this._handler.unsubscribeAll();
			document.body.removeEventListener('mousedown', this._boundHandleBodyMouseDown);
		};

		HeaderMenu.prototype._handleBodyMouseDown = function _handleBodyMouseDown(e) {
			if (this._menu !== e.target && !_utilMisc.closest(e.target, this._menu)) {
				this.hideMenu();
			}
		};

		HeaderMenu.prototype.hideMenu = function hideMenu() {
			if (this._menu) {
				_utilMisc.removeEl(this._menu);
				this._menu = null;
				this._activeHeaderColumn.classList.remove(this._options.headerActiveClass);
			}
		};

		HeaderMenu.prototype._handleHeaderCellRendered = function _handleHeaderCellRendered(info) {
			var column = info.data.column;
			var menu = column.header && column.header.menu;

			if (menu) {
				var el = _utilMisc.createEl({
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
		};

		HeaderMenu.prototype._handleBeforeHeaderCellDestroy = function _handleBeforeHeaderCellDestroy(info) {
			var column = info.data.column;

			if (column.header && column.header.menu) {
				_utilMisc.removeEl(info.data.node.querySelector('.spark-header-menubutton'));
			}
		};

		HeaderMenu.prototype._showMenu = function _showMenu(e) {
			var menuButton = e.currentTarget,
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
				menu = _utilMisc.createEl({
					tag: 'div',
					className: 'spark-header-menu'
				});
				this._grid.getContainerNode().appendChild(menu);
			}

			menu.innerHTML = '';

			// Construct the menu items.
			for (var i = 0; i < menu.items.length; i++) {
				var item = menu.items[i],
				    li = _utilMisc.createEl({
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

				var icon = _utilMisc.createEl({
					tag: 'div',
					className: 'spark-header-menuicon'
				});
				li.appendChild(icon);
				if (item.iconCssClass) {
					icon.classList.add(item.iconCssClass);
				}

				if (item.iconImage) {
					icon.style.backgroundImage = 'url(" + item.iconImage + ")';
				}

				var span = _utilMisc.createEl({
					tag: 'span',
					className: 'spark-header-menucontent',
					textContent: item.title
				});
				li.appendChild(li);
			}

			// Position the menu.
			_utilMisc.setPx(menu, 'top', menuButton.offsetTop + menuButton.offsetHeight);
			_utilMisc.setPx(menu, 'left', menuButton.offsetLeft);

			// Mark the header as active to keep the highlighting.
			this._activeHeaderColumn = _utilMisc.closest(menuButton, '.spark-header-column');
			this._activeHeaderColumn.classList.add(this._options.headerActiveClass);

			// Stop propagation so that it doesn't register as a header click event.
			e.preventDefault();
			e.stopPropagation();
		};

		HeaderMenu.prototype._handleMenuItemClick = function _handleMenuItemClick(e) {
			var menuItem = e.currentTarget,
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
		};

		return HeaderMenu;
	})();

	module.exports = HeaderMenu;
});