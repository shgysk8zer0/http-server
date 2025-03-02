import '@shgysk8zer0/polyfills'; // Adds polyfills for eg `Promise.try()`, `URLPattern`, `URL.parse` and `URL.canParse`, etc... All new APIs in JS.
export { createHandler } from './handler.js';
export { serve } from './server.js';
export { Cookie } from './Cookie.js';
export { HTTPError } from './HTTPError.js';
export { HTTPRequest } from './HTTPRequest.js';
export { HTTPResponse } from './HTTPResponse.js';
export { RequestCookieMap } from './RequestCookieMap.js';
export { getContentType, getFileStream, respondWithFile, getFileURL, resolveStaticPath } from './utils.js';
