<!-- markdownlint-disable -->
# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
