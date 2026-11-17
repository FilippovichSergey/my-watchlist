# Changelog

All notable changes to My Watchlist are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [semantic versioning](https://semver.org/).

## [1.0.1] - 2026-11-18

### Fixed
- The backend kept the serverless database awake around the clock: the connection pool held idle connections and pinged them, so Neon never suspended the compute and the free monthly allowance was 80% used in two weeks. The pool now keeps no idle connections and sends no keepalive query, so the database sleeps while nobody reads the list.

## [1.0.0] - 2026-11-13

The first numbered version: the site as it is deployed today. The history before it is in the git log.

### Added
- `VERSION` and this changelog, so that a review can name the version it looked at and its fixes can be told apart.
