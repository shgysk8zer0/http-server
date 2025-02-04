import nodeResolve from '@rollup/plugin-node-resolve';

const external = (id, src) => typeof src === 'string';
const plugins = [nodeResolve()];
const modules = [
	'cli', 'Cookie', 'http-server', 'HTTPError', 'HTTPRequest', 'server', 'utils',
];

export default modules.map(module => ({
	input: `${module}.js`,
	external,
	plugins,
	output: {
		file: `${module}.cjs`,
		format: 'cjs',
	},
}));
