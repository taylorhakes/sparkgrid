function simulateEvent(el, eventName) {

}

function q(search) {
	return [].slice.call(document.querySelectorAll(search));
}

export {
	simulateEvent,
	q
};
