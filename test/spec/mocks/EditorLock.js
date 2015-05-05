let jas = jasmine;

class EditorLock {
	constructor() {
		this.activate = jas.createSpy('activate');
		this.isActive = jas.createSpy('isActive');
		this.deactivate = jas.createSpy('deactivate');
		this.commitCurrentEdit = jas.createSpy('commitCurrentEdit');
		this.cancelCurrentEdit = jas.createSpy('cancelCurrentEdit');
	}
}


export default EditorLock;