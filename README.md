# `@shgysk8zer0/http-server`

A powerful but lightweight node server built using web standards

[![CodeQL](https://github.com/shgysk8zer0/http-server/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/shgysk8zer0/http-server/actions/workflows/codeql-analysis.yml)
![Node CI](https://github.com/shgysk8zer0/http-server/workflows/Node%20CI/badge.svg)
![Lint Code Base](https://github.com/shgysk8zer0/http-server/workflows/Lint%20Code%20Base/badge.svg)

[![GitHub license](https://img.shields.io/github/license/shgysk8zer0/http-server.svg)](https://github.com/@shgysk8zer0/http-server/blob/master/LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/shgysk8zer0/http-server.svg)](https://github.com/@shgysk8zer0/http-server/commits/master)
[![GitHub release](https://img.shields.io/github/release/shgysk8zer0/http-server?logo=github)](https://github.com/@shgysk8zer0/http-server/releases)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/shgysk8zer0?logo=github)](https://github.com/sponsors/shgysk8zer0)

[![npm](https://img.shields.io/npm/v/@shgysk8zer0/http-server)](https://www.npmjs.com/package/@shgysk8zer0/http-server)
![node-current](https://img.shields.io/node/v/@shgysk8zer0/http-server)
![npm bundle size gzipped](https://img.shields.io/bundlephobia/minzip/@shgysk8zer0/http-server)
[![npm](https://img.shields.io/npm/dw/@shgysk8zer0/http-server?logo=npm)](https://www.npmjs.com/package/@shgysk8zer0/http-server)

[![GitHub followers](https://img.shields.io/github/followers/shgysk8zer0.svg?style=social)](https://github.com/shgysk8zer0)
![GitHub forks](https://img.shields.io/github/forks/shgysk8zer0/http-server.svg?style=social)
![GitHub stars](https://img.shields.io/github/stars/shgysk8zer0/http-server.svg?style=social)
[![Twitter Follow](https://img.shields.io/twitter/follow/shgysk8zer0.svg?style=social)](https://twitter.com/shgysk8zer0)

[![Donate using Liberapay](https://img.shields.io/liberapay/receives/shgysk8zer0.svg?logo=liberapay)](https://liberapay.com/shgysk8zer0/donate "Donate using Liberapay")
- - -

- [Code of Conduct](./.github/CODE_OF_CONDUCT.md)
- [Contributing](./.github/CONTRIBUTING.md)
<!-- - [Security Policy](./.github/SECURITY.md) -->
A lightweight, modern Node.js HTTP server built entirely around Web Standards. Created to bridge the gap between Node.js servers and native browser APIs, making server-side development feel more familiar to frontend developers.

## Key Features
- Uses native [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects for handling HTTP
- Built-in support for [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) and timeouts
- Dynamic imports using standard ESM [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
- Modern URL handling with [`URLPattern`](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) for flexible routing
- Standards-first - if it exists in the browser, we use it in Node
- Familiar API for frontend developers

Written in pure ESM and providing a flexible configuration system, this server brings the power and familiarity of Web APIs to your Node.js backend. Whether serving static files, creating a dev server, or building a full API, you'll work with the same standards-based interfaces you already know from frontend development.

## CLI Arguments

| Flag | Alias | Default | Description |
|------|--------|---------|-------------|
| `--hostname` | `-h` | `localhost` | The hostname to serve on |
| `--port` | `-p` | `8000` | The port number to listen on |
| `--path` | `-a` | `8000` | The path relative to project root to use for the default URL |
| `--static` | `-s` | `/` | Root directory for static files |
| `--open` | `-o` | `false` | Open in default browser when server starts |
| `--timeout` | `-t` | `undefined` | Server timeout in milliseconds |
| `--config` | `-c` | `undefined` | Path to config file |

## Usage Examples

### Basic Static Server
```bash
npx @shgysk8zer0/http-server
```

### Custom Port and Hostname
```bash
npx @shgysk8zer0/http-server --port=3000 --hostname=0.0.0.0
```

### Serve Static Files from Directory
```bash
npx @shgysk8zer0/http-server --static=./public
```

### Using Config File
```bash
npx @shgysk8zer0/http-server --config=./http.config.js
```

Example `http.config.js`:
```js
const controller = new AbortController();

export default {
  staticRoot: '/static/',
  routes: {
    '/favicon.svg': '@shgysk8zer0/http-server/api/favicon.js',
    '/tasks': '@shgysk8zer0/http-server/api/tasks.js',
  },
  staticPaths: ['/'],
  port: 8000,
  signal: controller.signal,
  open: true,
};
```

## Using as a Module
The server can be imported and configured programmatically:

```js
import { serve } from '@shgysk8zer0/http-server';

const controller = new AbortController();
const config = {
 port: 3000,
 hostname: 'localhost',
 staticRoot: '/public/',
 routes: {
   '/api/data': './routes/data.js',
   '/api/tasks/:taskId': './routes/tasks.js',
   '/posts/:year(20\\d{2})/:month(0?\\d|[0-2])/:day(0?[1-9]|[12]\\d|3[01])/:post([a-z0-9\-]+[a-z0-9])': '/js/routes/posts.js',
 },
 open: true,
 signal: controller.signal,
};

const { url, server, whenServerClosed } = await serve(config);
console.log(`Server running at ${url}`);

const resp = await fetch(new URL('/posts/2025/01/30/hello-world', url));
const { title, description, content, author } = await resp.json();

// Handle cleanup when done
controller.abort();
whenServerClosed.then(() => console.log(server, 'closed'));
```

### Example route/endpoint

```js
export default async function(req) {
  switch(req.method) {
    case 'GET': {
        const url = new URL(req.url);
        const params = url.searchParams;
        return Response.json(Object.fromEntries(params));

    }

    case 'POST': {
      const data = await req.formData();
      // Handle request with form data
    }
  }
}
```
