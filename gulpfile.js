var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var to5Browserify = require("6to5-browserify");


gulp.task('build', function() {
  return browserify('./index.js',{
      debug: true
    })
    .bundle()
    //Pass desired output filename to vinyl-source-stream
    .pipe(source('bundle.js'))
    // Start piping stream to tasks!
    .pipe(gulp.dest('./build/'));
});
