# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

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
