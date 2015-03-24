function PercentComplete(row, cell, value, columnDef, dataContext) {
	let className;
	if (value == null) {
		return '';
	}
	if (value < 50) {
		className = 'spark-bad';
	} else {
		className = 'spark-good';
	}

	return '<span class="' + className + '">' + value + '%</span>';
}

function PercentCompleteBar(row, cell, value, columnDef, dataContext) {
	let className;

	if (value == null) {
		return '';
	}

	if (value < 30) {
		className = 'spark-bad';
	} else if (value < 70) {
		className = 'spark-ok';
	} else {
		className = 'spark-good';
	}

	return '<span class="spark-bar ' + className + '" style="width:' + value + '%"></span>';
}

function YesNo(row, cell, value, columnDef, dataContext) {
	if (value == null) {
		return '';
	}
	return value ? 'Yes' : 'No';
}

function Checkmark(row, cell, value, columnDef, dataContext) {
	return value ? '<i class="spark-icon-check"></i>' : '';
}

export {
	PercentComplete,
	PercentCompleteBar,
	YesNo,
	Checkmark
};
