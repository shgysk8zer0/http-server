import nodeResolve from '@rollup/plugin-node-resolve';

export default [{
	input: 'server.js',
	plugins: [nodeResolve()],
	external: ['@shgysk8zer0/polyfills'],
	output: [{
		file: 'server.cjs',
		format: 'cjs',
	}],
}];
