var browserify = require('browserify');
var watchify = require('watchify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var babel = require('gulp-babel');
var watch = require('gulp-watch');
var logger = require('gulp-logger');
var jshint = require('gulp-jshint');
var runSequence = require('run-sequence');
var concat = require('gulp-concat');
var rimraf = require('rimraf');

var path = {
	source:'src/**/*.js',
	outputFiles: 'dist/**/*.js',
	output:'dist/',
	doc:'./doc'
};
var babelOptions = { modules:'umd', loose: 'all' };

gulp.task('watch', function() {
	return watch(path.source)
		.pipe(logger({
			before: 'Change Found...',
			after: 'Transpile complete!',
			showChange: true
		}))
		.pipe(babel(babelOptions))
		.pipe(gulp.dest(path.output));
});
gulp.task('build', function(callback) {
	runSequence(
		'cleanBuild',
		'buildFiles',
		'buildConcat',
		callback);
});

gulp.task('cleanBuild', function (cb) {
	rimraf(path.output, cb);
});
gulp.task('buildFiles', function () {
	return gulp.src(path.source)
		.pipe(babel(babelOptions))
		.pipe(gulp.dest(path.output));
});

gulp.task('buildConcat', function () {
	return gulp.src(path.outputFiles)
		.pipe(concat('SparkGrid.js'))
		.pipe(gulp.dest(path.output));
});

gulp.task('lint', function() {
	return gulp.src([
		'./src/**/*.js'
	])
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

