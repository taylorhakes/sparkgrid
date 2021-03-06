(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod);
		global.EditorLock = mod.exports;
	}
})(this, function (exports, module) {
	/***
  * A locking helper to track the active edit controller and ensure that only a single controller
  * can be active at a time.  This prevents a whole class of state and validation synchronization
  * issues.  An edit controller (such as SlickGrid) can query if an active edit is in progress
  * and attempt a commit or cancel before proceeding.
  * @class EditorLock
  * @constructor
  */
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var EditorLock = (function () {
		function EditorLock() {
			_classCallCheck(this, EditorLock);

			this._activeEditController = null;
		}

		/***
   * Returns true if a specified edit controller is active (has the edit lock).
   * If the parameter is not specified, returns true if any edit controller is active.
   * @method isActive
   * @param editController {EditController}
   * @return {Boolean}
   */

		EditorLock.prototype.isActive = function isActive(editController) {
			return editController ? this._activeEditController === editController : this._activeEditController !== null;
		};

		/***
   * Sets the specified edit controller as the active edit controller (acquire edit lock).
   * If another edit controller is already active, and exception will be thrown.
   * @method activate
   * @param editController {EditController} edit controller acquiring the lock
   */

		EditorLock.prototype.activate = function activate(editController) {
			if (editController === this._activeEditController) {
				// already activated?
				return;
			}

			if (this._activeEditController !== null) {
				throw new Error('SlickGrid.EditorLock.activate: an editController is still active, can\'t activate another editController');
			}

			if (!editController.commitCurrentEdit) {
				throw new Error('SlickGrid.EditorLock.activate: editController must implement .commitCurrentEdit()');
			}

			if (!editController.cancelCurrentEdit) {
				throw new Error('SlickGrid.EditorLock.activate: editController must implement .cancelCurrentEdit()');
			}

			this._activeEditController = editController;
		};

		/***
   * Unsets the specified edit controller as the active edit controller (release edit lock).
   * If the specified edit controller is not the active one, an exception will be thrown.
   * @method deactivate
   * @param editController {EditController} edit controller releasing the lock
   */

		EditorLock.prototype.deactivate = function deactivate(editController) {
			if (this._activeEditController !== editController) {
				throw new Error('SlickGrid.EditorLock.deactivate: specified editController is not the currently active one');
			}

			this._activeEditController = null;
		};

		/***
   * Attempts to commit the current edit by calling 'commitCurrentEdit' method on the active edit
   * controller and returns whether the commit attempt was successful (commit may fail due to validation
   * errors, etc.).  Edit controller's 'commitCurrentEdit' must return true if the commit has succeeded
   * and false otherwise.  If no edit controller is active, returns true.
   * @method commitCurrentEdit
   * @return {Boolean}
   */

		EditorLock.prototype.commitCurrentEdit = function commitCurrentEdit() {
			return this._activeEditController ? this._activeEditController.commitCurrentEdit() : true;
		};

		/***
   * Attempts to cancel the current edit by calling 'cancelCurrentEdit' method on the active edit
   * controller and returns whether the edit was successfully cancelled.  If no edit controller is
   * active, returns true.
   * @method cancelCurrentEdit
   * @return {Boolean}
   */

		EditorLock.prototype.cancelCurrentEdit = function cancelCurrentEdit() {
			return this._activeEditController ? this._activeEditController.cancelCurrentEdit() : true;
		};

		return EditorLock;
	})();

	module.exports = EditorLock;
});