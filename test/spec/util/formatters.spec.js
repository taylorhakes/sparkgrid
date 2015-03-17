import { PercentComplete, PercentCompleteBar, YesNo, Checkmark } from 'spark/util/formatters';

function checkEmpty(fn) {
	it('empty', function() {
		expect(fn(null, null, null)).toBe('');
		expect(fn(null, null, undefined)).toBe('');
	});
}

describe('formatters', function() {
	describe('PercentComplete', function() {
		checkEmpty(PercentComplete);
		it('bad', function() {
			expect(PercentComplete(null, null, 29)).toBe('<span class="spark-bad">29%</span>');
		});
		it('good', function() {
			expect(PercentComplete(null, null, 61)).toBe('<span class="spark-good">61%</span>');
		});
	});
	describe('PercentCompleteBar', function() {
		checkEmpty(PercentCompleteBar);
		it('bad', function() {
			expect(PercentCompleteBar(null, null, 29)).toBe('<span class="spark-bar spark-bad" style="width:29%"></span>');
		});
		it('ok', function() {
			expect(PercentCompleteBar(null, null, 69)).toBe('<span class="spark-bar spark-ok" style="width:69%"></span>');
		});
		it('good', function() {
			expect(PercentCompleteBar(null, null, 71)).toBe('<span class="spark-bar spark-good" style="width:71%"></span>');
		});
	});
	describe('YesNo', function() {
		checkEmpty(YesNo);
		it('no', function() {
			expect(YesNo(null, null, false)).toBe('No')
		});
		it('yes', function() {
			expect(YesNo(null, null, true)).toBe('Yes')
		});

	});
	describe('Checkmark', function() {
		checkEmpty(Checkmark);
		it('false', function() {
			expect(Checkmark(null, null, false)).toBe('');
		});
		it('true', function() {
			expect(Checkmark(null, null, true)).toBe('<i class="spark-icon-check"></i>');
		});
	});
});