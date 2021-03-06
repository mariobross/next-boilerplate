const webpack = require('webpack'); // eslint-disable-line
const path = require('path');
const glob = require('glob');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');


module.exports = (config = {}, param = {}) => {
	const { dev } = param;

	// Fixes npm packages that depend on `fs` module
	config.node = {
		fs: 'empty'
	};

	config.mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';

	config.resolve = {
		modules: ['node_modules', './app']
	};

	config.module = {
		rules: [
			...config.module && config.module.rules ? config.module.rules : [],
			{
				test: /\.css$/,
				use: ['babel-loader', 'raw-loader', {
          loader: 'postcss-loader',
          options: {
            sourceMap: dev
          }
        }]
			},
			{
				test: /\.s(a|c)ss$/,
				use: ['babel-loader', 'raw-loader', {
          loader: 'postcss-loader',
          options: {
            sourceMap: dev ? 'inline' : false
          }
        },
					{
						loader: 'sass-loader',
						options: {
							sourceMap: dev,
							includePaths: ['styles', 'node_modules']
								.map(d => path.join(__dirname, d))
								.map(g => glob.sync(g))
								.reduce((a, c) => a.concat(c), [])
						}
					}
				]
			}
		]
	};

	let plugins = [];

	if (!process.env.JEST) plugins = [...config.plugins];

	// Enable Only in Development
	if (dev) {
		config.module.rules.push({
			test: /\.js$/,
			enforce: 'pre',
			exclude: /node_modules/,
			loader: 'eslint-loader',
			options: {
				emitWarning: dev
				// configFile: path.resolve('./.eslintrc.js')
			}
		});
	}

	/* Enable only in Production */
	if (!dev) {
		const oldEntry = config.entry;

		config.entry = () => oldEntry()
			.then((entry) => {
				if (entry['main.js']) entry['main.js'].push(path.resolve('./app/utils/offline'));
				return entry;
			});

		config.plugins = [
			...plugins,
			new SWPrecacheWebpackPlugin({
				cacheId: 'next-ss',
				filepath: './app/static/sw.js',
				minify: true,
				staticFileGlobsIgnorePatterns: [/\.next\//],
				staticFileGlobs: [
					'static/**/*' // Precache all static files by default
				],
				runtimeCaching: [
					// Example with different handlers
					{
						handler: 'fastest',
						urlPattern: /[.](png|jpg|css)/
					},
					{
						handler: 'networkFirst',
						urlPattern: /^http.*/ // cache all files
					}
				]
			}),
			new webpack.DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify('production')
			})
		];
	}
	return config;
};
