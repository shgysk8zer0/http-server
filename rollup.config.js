import nodeResolve from '@rollup/plugin-node-resolve';
const external = [
	'@shgysk8zer0/polyfills',
];
const plugins = [nodeResolve()];

export default [{
	input: 'http-server.js',
	plugins,
	external,
	output: [{
		file: 'http-server.cjs',
		format: 'cjs',
	}],
}, {
	input: 'cli.js',
	plugins,
	external,
	output: [{
		file: 'cli.cjs',
		format: 'cjs',
	}],
}];
