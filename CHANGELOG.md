# Changelog

All notable changes to My Watchlist are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [semantic versioning](https://semver.org/).

## [1.0.4] - 2026-11-18

Addresses `review/review_2026-11-18_v1.0.3.md`.

### Fixed
- **[P2] finding #1** — the editor of an existing entry stayed editable while its changes were being saved and closed on success, so text typed meanwhile was lost. Its fields are locked until the answer arrives, as in the add form.
- **[P2] finding #2** — a second TMDB search could start by Enter while the first was still running, and the answer that came last replaced the results, even when it belonged to the older query. One search runs at a time, and only the newest search may show its answer.
- **Rest of finding #1 of the 1.0.1 review** — a category tab followed at once by another filter lost the category: the tab was a plain link outside the shared navigation. On the list a tab is now one more filter change.

### Added
- Frontend tests for the newest-answer rule and for a tab followed by a score (55 in all).

## [1.0.3] - 2026-11-18

Addresses `review/review_2026-11-18_v1.0.2.md`.

### Fixed
- **[P2] finding #1** — the add form stayed editable while the new entry was being saved and was cleared on success, so feedback typed meanwhile was lost. The form, the search field and the result list are locked until the answer arrives.
- **[P2] finding #2** — "Newest first" compared the creation dates as text, which misorders dates with a different fraction length or time-zone offset. They are compared as times.
- **Rest of finding #1 of the 1.0.1 review** — the category tabs and a quick second click on a score still built on the last finished view. Both now build on the navigation in flight: a search followed at once by a tab keeps the search, and two quick scores make a range.
- The README named the old 16 KiB body limit; it says 64 KiB now.

### Added
- Frontend tests for date order and for quick successive changes (53 in all).

## [1.0.2] - 2026-11-18

Addresses `review/review_2026-11-18_v1.0.1.md`.

### Fixed
- **[P2] finding #1** — two filter changes made in quick succession lost the first one: each change was built on the values of the last server render, so a search committed by leaving the field was overwritten by the click that took the focus. A change is now laid over the navigation still in flight.
- **[P2] finding #2** — the list URL was remembered only when the list was first shown, so "back to the list" forgot filters chosen afterwards; and with any earlier history the link stepped back blindly, possibly to another site. The URL is stored on every change, and the link steps back in history only when the title was opened from the list, otherwise it goes to the remembered list by address.
- **[P2] finding #3** — an edit with every field filled to its allowed length in non-Latin text could exceed the 16 KiB body limit and be refused with 413. The limit is 64 KiB, sized from the field limits.
- **[P2] finding #4** — `restore_entries.py ... > restore.sql` produced UTF-16 in Windows PowerShell 5.1. The tool takes the output file as a second argument and writes UTF-8 itself; standard output is UTF-8 as well.

### Added
- Frontend tests for the three fixes (51 in all), `backend/tools/test_restore_entries.py` (3 tests) and a CI step that runs it.

## [1.0.1] - 2026-11-18

### Fixed
- The backend kept the serverless database awake around the clock: the connection pool held idle connections and pinged them, so Neon never suspended the compute and the free monthly allowance was 80% used in two weeks. The pool now keeps no idle connections and sends no keepalive query, so the database sleeps while nobody reads the list.

## [1.0.0] - 2026-11-13

The first numbered version: the site as it is deployed today. The history before it is in the git log.

### Added
- `VERSION` and this changelog, so that a review can name the version it looked at and its fixes can be told apart.
