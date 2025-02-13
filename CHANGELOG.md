<!-- markdownlint-disable -->
# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.0.4] - 2025-02-12

### Added
- Add `createHandler()` for easier handler authoring
- Add support for middleware transforming response bodies (via `TransformStream`)
- Add support for request timeout in server config
- Add support for `--open` for more platforms
- Add `searchParams` to `context` passed to handlers
- Add support for inline function support instead of only module imports in handling requests
- Significantly expands testing

### Fixed
- Pass `signal` into `HTTPResponse` body parser

## [v1.0.3] - 2025-02-08

### Added
- Add `-l` and `--logger` CLI flags to enable `console.error` logging

### Fixed
- Fix incompatibility between `pathname` in CLI & `serve()`
- Fix bad documentation of CLI

## [v1.0.2] - 2025-02-08

### Added
- `requestPreprocessors` option for running functions before request handling, allowing request context modification, validation and early termination
- `responsePostprocessors` to eg add CORS headers, etc

### Changed
- Update config/flags

## [v1.0.1] - 2025-02-05

### Fixed
- Fix issue in resolving paths via `import()`
- Fix `cli.js` not executing as node

## [v1.0.0] - 2025-02-04

Initial Release
