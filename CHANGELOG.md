# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- References page: a public GitHub repository of Markdown source lists is synced once a day and on request and shown at a configurable address with redirecting aliases, with search, type and topic filters, evidence levels per claim, linked source numbers and a changelog per entry
- Admin view for the references repository with sync status and notes on incomplete entries
- Own icons for nasal spray, powder and round tablets, German search terms in the icon picker
- Calorie, peptide and substance decay calculators as their own subpages under a configurable address, computed on the server and updated in the browser while typing
- Short links can redirect to an address entered by hand instead of a link saved on the page
- Back arrows on every back link, a button that returns to the top of long pages, a copy button for the calculator address and an opt-in box that keeps calculator input in the browser
- Up to six configurable buttons on the start page that link to a subpage or an outside address
- An optional switch for the light and dark theme on every public page
- A markdown section with links and images below each calculator; an image with a title becomes a figure with a caption below it
- The media library copies the address of an image, and an image used in markdown counts as a usage, so it cannot be deleted by accident
- Substance search, preparations with their own share of active content, routes of administration and a decay curve that can be read at any point in time
- A modelled course of the effect from onset, peak and duration, drawn as its own full width chart next to the decay curve
- Cannabis is calculated from the amount of flower and its content, with smoking, vaporizing, eating and sublingual use carrying their own uptake and their own course of the effect
- CBD, HHC, kratom, 4-PrO-MET, 1P-LSD, 1S-LSD, 1-BP-LSD, 1Fe-LSD and alcohol as further substances, alcohol with the Widmark formula and a fixed amount cleared per hour instead of a half-life
- An illustrated nasal spray bottle with the dose as a share of the bottle and one dot per actuation
- Detection in blood and in urine are marked in red and in yellow
- A discount code block can carry an image or an icon that links to the partner, and every link in it copies the code to the clipboard before the shop opens
- The input of every calculator is split into numbered steps, and the syringe and the nasal spray sit beside the result where the screen is wide enough
- A reset next to the copy button returns a calculator to its empty form and deletes the values kept in the browser
- The decay calculator states the points in time as a span wherever a half-life range is published, puts a short warning above the result and shows the detection in blood and in urine as its own marked pair

### Changed

- The topic filter on the references page no longer shows a second arrow next to its own one
- The calculators are called Tools & Rechner, in the admin and on the public overview
- The nasal spray bottle is drawn narrower and taller

- The client address comes from `X-Real-IP` set by the reverse proxy; `TRUSTED_PROXIES`, `PROXY_PEER_HEADER`, `APP_PORT`, `PROXY_NETWORK` and `APP_ENCRYPTION_KEY_PREVIOUS` are gone
- The admin view for traffic origins is now called Origins and short links

### Removed

- GitHub workflows and Dependabot configuration

### Fixed

- Without JavaScript the peptide calculator ignored the switch to the nasal spray and always computed a syringe
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
