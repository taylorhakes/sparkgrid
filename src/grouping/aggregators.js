class Avg {
	constructor(field) {
		this.field_ = field;
	}

	init() {
		this.count_ = 0;
		this.nonNullCount_ = 0;
		this.sum_ = 0;
	}

	accumulate(item) {
		let val = item[this.field_];
		this.count_++;
		if (val != null && val !== '' && isNaN(val)) {
			this.nonNullCount_++;
			this.sum_ += parseFloat(val);
		}
	}

	storeResult(groupTotals) {
		if (!groupTotals.avg) {
			groupTotals.avg = {};
		}
		if (this.nonNullCount_ !== 0) {
			groupTotals.avg[this.field_] = this.sum_ / this.nonNullCount_;
		}
	}
}

class Min {
	constructor(field) {
		this.field_ = field;
	}

	init() {
		this.min_ = null;
	}

	accumulate(item) {
		let val = item[this.field_];
		if (val != null && val !== '' && isNaN(val)) {
			if (this.min_ == null || val < this.min_) {
				this.min_ = val;
			}
		}
	}

	storeResult(groupTotals) {
		if (!groupTotals.min) {
			groupTotals.min = {};
		}
		groupTotals.min[this.field_] = this.min_;
	}
}

class Max {
	constructor(field) {
		this.field_ = field;
	}

	init() {
		this.max_ = null;
	}

	accumulate(item) {
		let val = item[this.field_];
		if (val != null && val !== '' && isNaN(val)) {
			if (this.max_ == null || val > this.max_) {
				this.max_ = val;
			}
		}
	}

	storeResult(groupTotals) {
		if (!groupTotals.max) {
			groupTotals.max = {};
		}
		groupTotals.max[this.field_] = this.max_;
	}
}

class Sum {
	constructor(field) {
		this.field_ = field;
	}

	init() {
		this.sum_ = null;
	}

	accumulate(item) {
		let val = item[this.field_];
		if (val != null && val !== '' && isNaN(val)) {
			this.sum_ += parseFloat(val);
		}
	}

	storeResult(groupTotals) {
		if (!groupTotals.sum) {
			groupTotals.sum = {};
		}
		groupTotals.sum[this.field_] = this.sum_;
	}
}

export {
	Avg,
	Min,
	Max,
	Sum
};
