var gulp = require('gulp');
var browserify = require('gulp-browserify');
var less = require('gulp-less');
var coffee = require('gulp-coffee');
var mocha = require('gulp-mocha');
var path = require('path');
var insert = require('gulp-insert');
var chmod = require('gulp-chmod');

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

gulp.task('coffee', function() {
  gulp.src('./server/*.coffee')
    .pipe(coffee({bare: true}))
    .pipe(insert.prepend('#!/usr/bin/env node\n'))
    .pipe(chmod(755))
    .pipe(gulp.dest('./build/'))
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
  gulp.start('browserify', 'less');
  gulp.watch(['pretty-thing/*.js', 'runner/*.js'], ['browserify']).on('change', function(event) {
    console.log('Browserifying JavaScript...');
  });
  gulp.watch('**/*.less', ['less']).on('change', function(event) {
    console.log('Recompiling LESS...');
  });
})

gulp.task('default', function() {
    gulp.start('browserify', 'less', 'coffee');
});
