(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["exports"], factory);
	} else if (typeof exports !== "undefined") {
		factory(exports);
	}
})(function (exports) {
	"use strict";

	function PercentCompleteFormatter(row, cell, value, columnDef, dataContext) {
		if (value == null || value === "") {
			return "-";
		} else if (value < 50) {
			return "<span class='spark-bad'>" + value + "%</span>";
		} else {
			return "<span class='spark-good'>" + value + "%</span>";
		}
	}

	function PercentCompleteBarFormatter(row, cell, value, columnDef, dataContext) {
		if (value == null || value === "") {
			return "";
		}

		var className;

		if (value < 30) {
			className = "spark-bad";
		} else if (value < 70) {
			className = "spark-ok";
		} else {
			className = "spark-good";
		}

		return "<span class='spark-bar " + className + "' style='width:" + value + "%'></span>";
	}

	function YesNoFormatter(row, cell, value, columnDef, dataContext) {
		return value ? "Yes" : "No";
	}

	function CheckmarkFormatter(row, cell, value, columnDef, dataContext) {
		return value ? "<i class='spark-icon-check'></i>" : "";
	}

	exports.PercentComplete = PercentCompleteFormatter;
	exports.PercentCompleteBar = PercentCompleteBarFormatter;
	exports.YesNo = YesNoFormatter;
	exports.Checkmark = CheckmarkFormatter;
	exports.__esModule = true;
});