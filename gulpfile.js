var browserify = require('browserify');
var watchify = require('watchify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var to5 = require('gulp-6to5');
var sourcemaps = require('gulp-sourcemaps');
var watch = require('gulp-watch');
var logger = require('gulp-logger');

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
		.pipe(to5({modules:'umd'}))
		.pipe(gulp.dest(path.output));
});
gulp.task('build', function () {
	return gulp.src(path.source)
		.pipe(to5({modules:'umd'}))
		.pipe(gulp.dest(path.output));
});

