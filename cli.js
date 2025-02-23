#!/usr/bin/env node
import '@shgysk8zer0/polyfills'; // Adds polyfills for eg `Promise.try()`, `URLPattern`, `URL.parse` and `URL.canParse`, etc... All new APIs in JS.
import { resolveModulePath } from './utils.js';
import { serve } from './server.js';
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2).map(arg => arg.split('=')).flat();

const importConfig = specifier => import(resolveModulePath(specifier))
	.then(module => typeof module.default === 'object' ? module.default : module)
	.catch(err => ({ signal: AbortSignal.abort(err)}));

/**
 *
 * @param {string|string[]} flag
 * @param {string} defaultValue
 * @returns {string|void}
 */
function getArg(flag, defaultValue) {
	const index = Array.isArray(flag) ? args.findIndex(arg => flag.includes(arg)) : args.indexOf(flag);

	return index === -1 ? defaultValue : args[index + 1] ?? defaultValue;
}

/**
 *
 * @param {string|string[]} flag
 * @returns {boolean}
 */
function hasArg(flag) {
	return Array.isArray(flag) ? flag.some(f => args.includes(f)) : args.includes(flag);
}

async function getConfig() {
	return hasArg(['-c', '--config']) ? await importConfig(getArg(['-c', '--config'])) : {
		hostname: getArg(['-h', '--hostname']),
		port: parseInt(getArg(['-p', '--port'], '8000')),
		pathname: getArg(['-a', '--path'], '/'),
		open: hasArg(['-o', '--open']),
		staticRoot: getArg(['-s', '--static'], '/'),
		timeout: hasArg(['-t', '--timeout']) ? parseInt(getArg(['-t', '--timeout'], '0')) || 0 : undefined,
		logger: hasArg(['-d', '--debug']) ? console.error : null,
		key: hasArg(['--key']) ? new Blob([await readFile(getArg('--key'))], { type: 'application/pkcs8' }) : undefined,
		cert: hasArg(['--cert']) ? new Blob([await readFile(getArg('--cert'))], { type: 'application/x-pem-file' }) : undefined,
	};
}

async function start() {
	const config = await getConfig();

	if (config instanceof Error) {
		throw config;
	} else if (config.signal instanceof AbortSignal && config.signal.abort) {
		throw config.signal.reason;
	} else {
		const { url } = await serve(config);
		console.log(`Now serving on ${url}`);
	}
}

start();
