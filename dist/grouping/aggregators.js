(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports'], factory);
	} else if (typeof exports !== 'undefined') {
		factory(exports);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports);
		global.aggregators = mod.exports;
	}
})(this, function (exports) {
	'use strict';

	exports.__esModule = true;

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var Avg = (function () {
		function Avg(field) {
			_classCallCheck(this, Avg);

			this.field_ = field;
		}

		Avg.prototype.init = function init() {
			this.count_ = 0;
			this.nonNullCount_ = 0;
			this.sum_ = 0;
		};

		Avg.prototype.accumulate = function accumulate(item) {
			var val = item[this.field_];
			this.count_++;
			if (val != null && val !== '' && isNaN(val)) {
				this.nonNullCount_++;
				this.sum_ += parseFloat(val);
			}
		};

		Avg.prototype.storeResult = function storeResult(groupTotals) {
			if (!groupTotals.avg) {
				groupTotals.avg = {};
			}

			if (this.nonNullCount_ !== 0) {
				groupTotals.avg[this.field_] = this.sum_ / this.nonNullCount_;
			}
		};

		return Avg;
	})();

	var Min = (function () {
		function Min(field) {
			_classCallCheck(this, Min);

			this.field_ = field;
		}

		Min.prototype.init = function init() {
			this.min_ = null;
		};

		Min.prototype.accumulate = function accumulate(item) {
			var val = item[this.field_];
			if (val != null && val !== '' && isNaN(val)) {
				if (this.min_ == null || val < this.min_) {
					this.min_ = val;
				}
			}
		};

		Min.prototype.storeResult = function storeResult(groupTotals) {
			if (!groupTotals.min) {
				groupTotals.min = {};
			}

			groupTotals.min[this.field_] = this.min_;
		};

		return Min;
	})();

	var Max = (function () {
		function Max(field) {
			_classCallCheck(this, Max);

			this.field_ = field;
		}

		Max.prototype.init = function init() {
			this.max_ = null;
		};

		Max.prototype.accumulate = function accumulate(item) {
			var val = item[this.field_];
			if (val != null && val !== '' && isNaN(val)) {
				if (this.max_ == null || val > this.max_) {
					this.max_ = val;
				}
			}
		};

		Max.prototype.storeResult = function storeResult(groupTotals) {
			if (!groupTotals.max) {
				groupTotals.max = {};
			}

			groupTotals.max[this.field_] = this.max_;
		};

		return Max;
	})();

	var Sum = (function () {
		function Sum(field) {
			_classCallCheck(this, Sum);

			this.field_ = field;
		}

		Sum.prototype.init = function init() {
			this.sum_ = null;
		};

		Sum.prototype.accumulate = function accumulate(item) {
			var val = item[this.field_];
			if (val != null && val !== '' && isNaN(val)) {
				this.sum_ += parseFloat(val);
			}
		};

		Sum.prototype.storeResult = function storeResult(groupTotals) {
			if (!groupTotals.sum) {
				groupTotals.sum = {};
			}

			groupTotals.sum[this.field_] = this.sum_;
		};

		return Sum;
	})();

	exports.Avg = Avg;
	exports.Min = Min;
	exports.Max = Max;
	exports.Sum = Sum;
});