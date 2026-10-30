# web-social-links

A self-hosted link-in-bio page with an admin CMS, cookieless server-side analytics and a hardened login, shipped as one Node container with SQLite.

The project is under active development. The foundation (configuration, container, tooling) is in place, the CMS, public page and analytics follow.

## Quick start

Requires Docker with Compose and OpenSSL on the host.

```sh
cp .env.example .env
./scripts/generate-secrets.sh
./scripts/init-data.sh
docker compose up -d
```

Set `PUBLIC_ORIGIN` and `SECURITY_CONTACT` in `.env` first. The app listens on `127.0.0.1:3000` and refuses to start if a required value is missing or a key is weak; the log line names the variable.

## Configuration

| Variable                      | Default                    | Purpose                                                                                                               |
| ----------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_ORIGIN`               | required                   | Canonical origin, for example `https://links.example.com`                                                             |
| `ALIAS_ORIGINS`               | empty                      | Further origins that redirect with 301 to `PUBLIC_ORIGIN`, comma separated                                            |
| `ADMIN_ALLOWED_HOSTS`         | host of `PUBLIC_ORIGIN`    | Hosts that serve the admin                                                                                            |
| `ADMIN_IP_ALLOWLIST`          | empty, any address         | CIDR ranges allowed to reach the admin                                                                                |
| `TRUSTED_PROXIES`             | empty, socket address only | Proxies whose `X-Forwarded-For` entries are trusted. CIDR ranges plus the presets `private`, `loopback`, `cloudflare` |
| `PROXY_PEER_HEADER`           | empty                      | Header in which your proxy passes its real TCP peer, see Reverse proxy                                                |
| `APP_ENCRYPTION_KEY`          | required                   | 32 random bytes, base64. Encrypts TOTP secrets                                                                        |
| `APP_ENCRYPTION_KEY_PREVIOUS` | empty                      | Previous key during a rotation, only used for decryption                                                              |
| `ANALYTICS_HMAC_KEY`          | required                   | At least 32 random bytes, base64                                                                                      |
| `INITIAL_ADMIN_USERNAME`      | `admin`                    | Owner account created on first start                                                                                  |
| `INITIAL_ADMIN_PASSWORD`      | `admin123`                 | Must be changed at first login. Set your own value before the app is reachable                                        |
| `TOTP_ISSUER`                 | host of `PUBLIC_ORIGIN`    | Name shown in authenticator apps                                                                                      |
| `SESSION_IDLE_MINUTES`        | `60`                       | Admin session idle timeout                                                                                            |
| `SESSION_MAX_HOURS`           | `24`                       | Admin session absolute lifetime                                                                                       |
| `UPLOAD_MAX_MB`               | `10`                       | Upload limit per file                                                                                                 |
| `LOG_LEVEL`                   | `info`                     | `debug`, `info`, `warn` or `error`                                                                                    |
| `APP_PORT`                    | `3000`                     | Host port bound to `127.0.0.1`                                                                                        |
| `PROXY_NETWORK`               | `proxy`                    | External Docker network for `compose.proxy-network.example.yaml`                                                      |
| `TZ`                          | `Europe/Berlin`            | Time zone for days in statistics and schedules                                                                        |
| `BAN_SCOPE`                   | `admin`                    | `admin` blocks banned addresses from the admin only, `all` from everything                                            |
| `SECURITY_CONTACT`            | required                   | `mailto:` or `https:` address for `security.txt`                                                                      |

`generate-secrets.sh` fills empty keys and never overwrites existing values.

## Reverse proxy

### Nginx Proxy Manager and Cloudflare

If Nginx Proxy Manager runs in Docker, attach the app to its network instead of publishing a port:

```sh
docker compose -f compose.yaml -f compose.proxy-network.example.yaml up -d
```

`PROXY_NETWORK` is the name of the network Nginx Proxy Manager is in, for example `npm_default`.

Create one proxy host for the canonical domain and every alias domain, forwarding to `app` port `3000` (or `127.0.0.1:3000` when NPM runs on the host). The app performs the alias redirect itself. In the Advanced tab of each proxy host, add:

```nginx
location / {
  include conf.d/include/proxy.conf;
  proxy_set_header X-Proxy-Peer $realip_remote_addr;
}
```

and in `.env`:

```sh
TRUSTED_PROXIES=private,loopback,cloudflare
PROXY_PEER_HEADER=x-proxy-peer
```

Why: Nginx Proxy Manager trusts Cloudflare and CloudFront addresses and takes the client address from their `X-Real-IP` header. A visitor can send that header through Cloudflare and choose any address, which would defeat rate limits and bans. `$realip_remote_addr` is the address that actually connected to Nginx Proxy Manager, so the app can verify the chain itself. The custom `location /` replaces the default one of that proxy host; NPM access lists on it no longer apply, use `ADMIN_IP_ALLOWLIST` instead.

Only set `PROXY_PEER_HEADER` when the proxy really sets that header. Otherwise a client could send it.

In Cloudflare, keep the DNS records proxied, use SSL mode Full (strict) and do not add a cache rule for HTML.

## Development

Node 26.13.0 (see `.node-version`) and pnpm 11.

```sh
pnpm install
pnpm dev
```

`pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` must pass before a commit. Conventions are in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
