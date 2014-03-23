var gulp = require('gulp');

var browserify = require('gulp-browserify');
var less = require('gulp-less');
var path = require('path');

gulp.task('browserify', function() {
    // Single entry point to browserify
    gulp.src('runner/dependencies.js')
        .pipe(browserify({
          insertGlobals : true,
          debug : !gulp.env.production
        }))
        .pipe(gulp.dest('build'))
});

gulp.task('less', function () {
  gulp.src('runner/runner.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(gulp.dest('build'));
});



gulp.task('watch', function() {
  gulp.watch(['pretty-thing/*.js', 'runner/*.js'], ['browserify']).on('change', function(event) {
    console.log('Browserifying JavaScript...');
  });
  gulp.watch('**/*.less', ['less']).on('change', function(event) {
    console.log('Recompiling LESS...');
  });
})

gulp.task('default', function() {
    gulp.start('browserify', 'less');
});