var browserify = require('browserify');
var watchify = require('watchify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');


function scripts(watch) {
	var bundler, rebundle;
	bundler = browserify('./index.js', {
		debug: true,
		cache: {}, // required for watchify
		packageCache: {}, // required for watchify
		fullPaths: watch // required to be true only for watchify
	});
	if(watch) {
		bundler = watchify(bundler)
	}
	rebundle = function() {
		var stream = bundler.bundle();
		stream = stream.pipe(source('bundle.js'));
		return stream.pipe(gulp.dest('./build'));
	};

	bundler.on('update', rebundle);
	return rebundle();
}


gulp.task('watch', function() {
	return scripts(true);
});


gulp.task('build', function() {
	return scripts();
});

