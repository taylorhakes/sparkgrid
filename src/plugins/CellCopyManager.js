let ESCAPE = 27;

class CellCopyManager {
	contructor() {
		this._grid = null;
		this._copiedRanges = null;
		this.onCopyCells = new Slick.Event();
		this.onCopyCancelled = new Slick.Event();
		this.onPasteCells = new Slick.Event();
	}

	init(grid) {
		this._grid = grid;
		this._grid.onKeyDown.subscribe(handleKeyDown);
	}

	destroy() {
		this._grid.onKeyDown.unsubscribe(handleKeyDown);
	}

	handleKeyDown(info) {
		let ranges,
			e = info.event;

		if (!this._grid.getEditorLock().isActive()) {
			if (e.which == ESCAPE) {
				if (this._copiedRanges) {
					e.preventDefault();
					clearCopySelection();
					this.onCopyCancelled.notify({ranges: this._copiedRanges});
					this._copiedRanges = null;
				}
			}

			if (e.which == 67 && (e.ctrlKey || e.metaKey)) {
				ranges = this._grid.getSelectionModel().getSelectedRanges();
				if (ranges.length != 0) {
					e.preventDefault();
					this._copiedRanges = ranges;
					markCopySelection(ranges);
					this.onCopyCells.notify({ranges: ranges});
				}
			}

			if (e.which == 86 && (e.ctrlKey || e.metaKey)) {
				if (this._copiedRanges) {
					e.preventDefault();
					clearCopySelection();
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