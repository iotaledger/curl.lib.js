const gulp        = require('gulp');
const eslint      = require('gulp-eslint');
const del         = require('del');
const gulpNSP     = require('gulp-nsp');
const webpack     = require('webpack-stream');
const WebpackDevServer = require( 'webpack-dev-server');
const webpackConfig = require('./webpack.config');

const DEST = './dist/';

// Lint the JS code
gulp.task('lint', [], function(){
    return gulp.src(['**/*.js','!node_modules/**'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
});

// Remove existing dist folder
gulp.task('clean', ['lint'], function(cb) {
    del([DEST]).then(cb.bind(null, null));
});

// Check for vulns with nsp
gulp.task('nsp', function (cb) {
  gulpNSP({package: __dirname + '/package.json'}, cb);
});

gulp.task('dist', ['lint'], () => {
  return gulp.src('src/curl.lib.js')
    .pipe(webpack({
      output: {
        filename: 'curl.min.js'
      }
    }))
    .pipe(gulp.dest(DEST))
});

gulp.task('server', ['dist'], function(callback) {
	// modify some webpack config options
	var myConfig = Object.create(webpackConfig);
	myConfig.devtool = 'eval';
	myConfig.debug = true;

	// Start a webpack-dev-server
	new WebpackDevServer(webpack(myConfig), {
		publicPath: '/dist',
		stats: {
			colors: true
		},
		hot: true
	}).listen(8080, 'localhost', function(err) {
		if(err) throw new gutil.PluginError('webpack-dev-server', err);
		gutil.log('[webpack-dev-server]', 'http://localhost:8080/webpack-dev-server/index.html');
	});
});

gulp.task('default', ['lint', 'clean', 'nsp', 'dist']);
