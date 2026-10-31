# Security

## Reporting a vulnerability

Report vulnerabilities through GitHub private vulnerability reporting on this repository (Security tab, "Report a vulnerability"). Do not open a public issue. You get an answer within seven days. Each running instance also publishes its operator's contact in `/.well-known/security.txt`.

## Threat model

The public page is static content rendered from a published snapshot. The attack surface that matters:

| Area         | Threat                                                             | Measures                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin login  | Credential stuffing, brute force, phishing of the initial password | Argon2id (64 MiB, t=3, p=1) with a two slot semaphore, equal timing for unknown users, 5 attempts per 15 minutes per address and user, 20 per hour per address with growing delay, 10 failures lock a user for 15 minutes from any address, a hidden form field and a signed render timestamp, forced password change on first login, optional TOTP with replay protection and single use recovery codes |
| Sessions     | Theft, fixation, cross site requests                               | 256 bit tokens in a `__Host-` cookie that is HttpOnly, Secure and SameSite=Strict, only the SHA-256 is stored, rotation on every privilege change, idle and absolute timeouts, CSRF token bound to the session plus an Origin check, recent password confirmation for account, 2FA, session and export actions                                                                                           |
| Uploads      | Malicious files, decompression bombs, metadata leaks               | Type detection by magic bytes that must match the declared type, 40 MP limit, full re-encoding after applying the EXIF orientation so no metadata survives, SVG rejected when it contains scripts, entities or external references and otherwise rasterised, random file names outside `public/`                                                                                                         |
| Redirects    | Open redirect, phishing                                            | `/go/{id}` resolves IDs against the published snapshot only and never takes a target URL; hidden, scheduled and unknown links answer 404                                                                                                                                                                                                                                                                 |
| Link check   | SSRF                                                               | DNS is resolved by the app, private, loopback, link local, CGNAT and metadata ranges are refused at every hop, the connection is pinned to the checked address, at most 3 redirects                                                                                                                                                                                                                      |
| Analytics    | Tracking visitors, log injection                                   | No cookies or storage, only the referrer host, no IP addresses in analytics tables, optional daily hash with a salt deleted at day end, CSV cells escaped                                                                                                                                                                                                                                                |
| Supply chain | Malicious releases                                                 | Exact pins and a lockfile, pnpm refuses releases younger than a day, provenance downgrades and unlisted install scripts, gitleaks in the pre-commit hook                                                                                                                                                                                                                                                 |

Every response carries a strict CSP built from SHA-256 hashes of the inline content (no `unsafe-inline` for scripts or styles, no `unsafe-eval`), HSTS, `nosniff`, `X-Frame-Options: DENY` (the admin preview allows its own origin), a restrictive Permissions-Policy, `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy`. Requests for typical attack paths such as `/wp-login.php` or `/.env` answer like any 404; two hits in ten minutes block the address from the admin for 24 hours.

## Known limits

- One instance only. Rate limits, login challenges and the analytics buffer live in memory. Running two replicas halves every limit
- The visitor address comes from `X-Real-IP`. It is only as trustworthy as the reverse proxy that sets it, and the container must not be reachable except through that proxy
- There is no passkey support yet. The `credentials` table is reserved for it

## Recommended hardening

- Set your own `INITIAL_ADMIN_PASSWORD` before the first start, so the known default is never reachable
- Turn on TOTP in the first login wizard
- Restrict `/admin` with `ADMIN_IP_ALLOWLIST` to a VPN range, or serve the admin on its own host with `ADMIN_ALLOWED_HOSTS`
- Let fail2ban ban addresses the app reports. Every security event is one JSON line on stdout:

```ini
[Definition]
failregex = ^.*"evt":"security\.(auth_failed|honeypot|trap_hit|totp_failed)","ip":"<HOST>".*$
ignoreregex =
```

Docker's default json-file driver escapes the quotes inside each line, so switch the service to the journald driver in `compose.yaml` (`logging: { driver: journald, options: { tag: web-social-links } }`) and use `backend = systemd` with `journalmatch = SYSLOG_IDENTIFIER=web-social-links` in the jail. The banned address must be the one Cloudflare or your proxy sees; with Cloudflare in front, ban through the Cloudflare API action instead of iptables.

## Lost second factor

Run `docker compose exec app node scripts/reset-admin.mjs`. It turns off 2FA, ends all sessions and prints a one-time password that must be changed at the next login.
