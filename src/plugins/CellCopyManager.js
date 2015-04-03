import { Event, KEYCODES } from 'core/util/events';

class CellCopyManager {
	constructor() {
		this._grid = null;
		this._copiedRanges = null;
		this.onCopyCells = new Event();
		this.onCopyCancelled = new Event();
		this.onPasteCells = new Event();
	}

	init(grid) {
		this._grid = grid;
		this._grid.onKeyDown.subscribe(this._handleKeyDown);
	}

	destroy() {
		this._grid.onKeyDown.unsubscribe(this._handleKeyDown);
	}

	_handleKeyDown(info) {
		let ranges,
			e = info.event;

		if (!this._grid.getEditorLock().isActive()) {
			if (e.which === KEYCODES.ESCAPE) {
				if (this._copiedRanges) {
					e.preventDefault();
					this.clearCopySelection();
					this.onCopyCancelled.notify({ranges: this._copiedRanges});
					this._copiedRanges = null;
				}
			}

			if (e.which === KEYCODES.C && (e.ctrlKey || e.metaKey)) {
				ranges = this._grid.getSelectionModel().getSelectedRanges();
				if (ranges.length !== 0) {
					e.preventDefault();
					this._copiedRanges = ranges;
					this.markCopySelection(ranges);
					this.onCopyCells.notify({ranges: ranges});
				}
			}

			if (e.which === KEYCODES.V && (e.ctrlKey || e.metaKey)) {
				if (this._copiedRanges) {
					e.preventDefault();
					this.clearCopySelection();
					ranges = this._grid.getSelectionModel().getSelectedRanges();
					this.onPasteCells.notify({from: this._copiedRanges, to: ranges});
					this._copiedRanges = null;
				}
			}
		}
	}

	markCopySelection(ranges) {
		let columns = this._grid.getColumns(),
			hash = {};

		for (let i = 0; i < ranges.length; i++) {
			for (let j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
				hash[j] = {};
				for (let k = ranges[i].fromCell; k <= ranges[i].toCell; k++) {
					hash[j][columns[k].id] = 'copied';
				}
			}
		}
		this._grid.setCellCssStyles('copy-manager', hash);
	}

	clearCopySelection() {
		this._grid.removeCellCssStyles('copy-manager');
	}
}

export default CellCopyManager;