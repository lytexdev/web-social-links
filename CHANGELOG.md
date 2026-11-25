# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- References page: a public GitHub repository of Markdown source lists is synced once a day and on request and shown at a configurable address with redirecting aliases, with search, type and topic filters, evidence levels per claim, linked source numbers and a changelog per entry
- Admin view for the references repository with sync status and notes on incomplete entries
- Own icons for nasal spray, powder and round tablets, German search terms in the icon picker
- Calorie calculator and peptide calculator as their own subpages under a configurable address, computed on the server and updated in the browser while typing
- Short links can redirect to an address entered by hand instead of a link saved on the page

### Changed

- The client address comes from `X-Real-IP` set by the reverse proxy; `TRUSTED_PROXIES`, `PROXY_PEER_HEADER`, `APP_PORT`, `PROXY_NETWORK` and `APP_ENCRYPTION_KEY_PREVIOUS` are gone
- The admin view for traffic origins is now called Origins and short links

### Removed

- GitHub workflows and Dependabot configuration

### Fixed

- Publishing could leave out a setting or block edit typed moments earlier
- A scrollable table could not be reached with the keyboard
- The icon picker requested the icon index from a wrong address and listed no icons
- Dependency advisories in glob, minimatch, esbuild, zod and node-forge
- The development server did not start with @nuxt/cli 4.0.1

## [1.0.0] - 2026-10-30

### Added

- Public page rendered on the server without framework JavaScript, cookies or third party requests, in the datasheet and paper presets with a two column layout from 960 pixels
- Blocks for links, tiles, groups, text, headings, images, discount codes, notices, dividers and spacers with visibility windows
- Drafts with autosave, publishing to immutable revisions, preview and restore of every revision
- Admin with drag and drop and a keyboard alternative, live preview, icon picker over Tabler Icons and Simple Icons, media library, theme editor with live contrast checks, markdown pages, sources and short links with QR codes, export and import
- Login with Argon2id, TOTP, recovery codes, forced password change on first login, sudo mode, session overview and a security log
- Rate limits, trap paths with bans, CSRF protection, host validation and hash based CSP
- Server side analytics without cookies: views, clicks, click rate, link previews, sources, referrer hosts, UTM, devices and countries, optional daily visitor estimate, retention, dashboard and CSV export
- Privacy policy generator matching the configuration, legal page gate before publishing
- Backup and restore scripts, admin reset script, demo seed, container image with a read only root
