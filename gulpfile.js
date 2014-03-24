var gulp = require('gulp');

var browserify = require('gulp-browserify');
var less = require('gulp-less');
var mocha = require('gulp-mocha');
var path = require('path');

function clearConsole() {
  process.stdout.write('\u001B[2J\u001B[0;0f');
}

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

gulp.task('spec', function() {
  gulp.src('pretty-thing/test.js')
    .pipe(mocha({reporter: 'spec'}));
})

gulp.task('watch-spec', function() {
  gulp.watch(['pretty-thing/*.js', 'runner/*.js'])
    .on('change', function(event) {
      clearConsole()
      gulp.start('spec')
    });
})

gulp.task('watch-browser', function() {
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