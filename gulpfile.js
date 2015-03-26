var gulp = require('gulp');
var gutil = require('gulp-util');
var less = require('gulp-less');
var plumber = require('gulp-plumber');


var log = console.log;


function errHandler(err){
    gutil.beep();
    log('err reported by: ', err.plugin);
    log('\tfile:  ', err.fileName);
    log('\tline:  ', err.lineNumber);
    log('\tstack: ', err.stack);
    log('*************************');
}


gulp.task('less', function(){
    return gulp.src('./layout/less/**/*.less')
        .pipe(plumber({errorHandler: errHandler}))
        .pipe(less({comments: 'dumpLineNumbers'}))
        .pipe(gulp.dest('./layout/css'));
});


gulp.task('watch', function(){
    gulp.watch('./layout/less/**/*.less', ['less']);
});

gulp.task('default', ['less']);
gulp.task('watch', ['less', 'watch']);
