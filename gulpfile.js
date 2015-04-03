var browserify = require('browserify');
var watchify = require('watchify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var babel = require('gulp-babel');
var watch = require('gulp-watch');
var logger = require('gulp-logger');
var jshint = require('gulp-jshint');

var path = {
	source:'src/**/*.js',
	output:'dist/',
	doc:'./doc'
};

gulp.task('watch', function() {
	return watch(path.source)
		.pipe(logger({
			before: 'Change Found...',
			after: 'Transpile complete!',
			showChange: true
		}))
		.pipe(babel({modules:'umd'}))
		.pipe(gulp.dest(path.output));
});
gulp.task('build', function () {
	return gulp.src(path.source)
		.pipe(babel({modules:'umd'}))
		.pipe(gulp.dest(path.output));
});

gulp.task('lint', function() {
	return gulp.src([
		'./src/**/*.js'
	])
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

