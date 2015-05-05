let jas = jasmine;
class SelectionModel {
	constructor() {
		this.init = jas.createSpy('init');
		this.destroy = jas.createSpy('destroy');
		this.onSelectedRangesChanged = {
			subscribe: jas.createSpy('onSelectedRangesChanged.subscribe'),
			unsubscribe: jas.createSpy('onSelectedRangesChanged.unsubscribe')
		};
	}
}

export default SelectionModel;
