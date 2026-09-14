# Lampa Local

A self-hosted Lampa build for a home network, including Raspberry Pi / ARM64. Russian and English UI are included.

Based on [yumata/lampa-source](https://github.com/yumata/lampa-source), upstream commit `56be33eb7077e326f4e00529ba35fe0040489810`. This is an independent modified distribution, not an official Lampa release. The original GPL-2.0 license is retained in [LICENSE](LICENSE).

## Content policy

This edition removes Lampa's application-level content restrictions:

- No regional or LGBT block lists, keyword-based card blocking or obscured posters.
- No DMCA card block list, political/title blacklist or search stop words.
- No adult keyword/tag filtering, adult confirmation gate or hidden sections in adult cards.
- No child-profile age gate or parental PIN gate for playback, settings or extensions.
- No app-store user-agent check disabling torrents; no read-only playback restriction.
- Search and discovery request `include_adult=true` from TMDB.
- No remote or hardcoded plugin blacklist.

Ratings, content labels and user-selected genre/search filters are descriptive and remain available. This does not change what TMDB, indexers, peers or network operators make available; codec/browser limitations also remain. Compatibility exports for removed services are kept so existing calls do not break.

## Privacy

Removed telemetry, unique-user metrics, playback metrics, watch-history reporting, cloud log export and remote terminal/configuration. CUB accounts, synchronization, sockets, geolocation, mirrors, ads, cloud AI metadata, reactions, discussions, store and automatic remote plugins are disabled. History and favorites stay in browser storage.

The web backend contacts official TMDB API/images and your configured Jackett. Playback uses your TorrServer directly. An optional HTTP proxy can be configured for TMDB only. No HTTP access logs record search queries.

Jackett and TMDB keys live on the server, outside `dist/`. The backend strips `apikey` and `jackett_apikey` from Jackett download/poster links and supplies credentials upstream. The generated browser configuration contains only the TorrServer URL.

Content Security Policy restricts scripts to this server and browser network access to this server plus the configured TorrServer. This is separate from content filtering: there are no topic, age or regional decisions. Third-party remote plugins do not load by default; audited plugins can be hosted in `dist/plugins/` and added using their local URL. Cloud-only features are not emulated.

## Build and run

Requirements: Node.js 20+ for building, Python 3.10+ for serving. No Python packages are required. Node.js is not needed on the runtime host if you copy the built `dist/`.

```sh
cd source
npm ci --no-audit --no-fund
cd ..
node source/build-local.cjs
python3 -m unittest discover -s tests -v
node tests/content-policy.cjs
cp .env.example .env
mkdir -p secrets
chmod 700 secrets
```

Configure `.env` with the URLs of your servers. `PUBLIC_URL` must be reachable both by your browsers and TorrServer. Use a LAN hostname/IP instead of `localhost` when other devices will connect. Set `BIND` to your server's LAN IP or `0.0.0.0` as appropriate.

Put your Jackett API key in `secrets/jackett.key` and your TMDB API key in `secrets/tmdb.key`, then set permissions to 600. Obtain your TMDB credential through [TMDB's API settings](https://www.themoviedb.org/settings/api). Alternatively supply `TMDB_API_KEY` to the server process. Keys are never part of the frontend bundle.

```sh
chmod 600 secrets/*.key
set -a
. ./.env
set +a
python3 server.py
```

Open the configured `PUBLIC_URL`. The default listen port is 8088. In a movie card, “Watch” / “Смотреть” opens the torrent choices. The global search also includes the parser.

Browser defaults apply only to settings that have not already been saved. Existing browser histories and preferences are not reset. Use the same URL consistently because different origins have separate browser storage.

## Raspberry Pi / systemd

Copy the project, built `dist/` and your private configuration to the Pi. The example service expects `/opt/lampa-local`, a dedicated `lampa` user, and `/etc/lampa-local.env`.

```sh
sudo useradd --system --user-group --home-dir /opt/lampa-local lampa
sudo cp .env /etc/lampa-local.env
sudo chmod 600 /etc/lampa-local.env
sudo chown -R lampa:lampa /opt/lampa-local/secrets
sudo install -m 644 deploy/lampa-local.service /etc/systemd/system/lampa-local.service
sudo systemctl daemon-reload
sudo systemctl enable --now lampa-local
```

Adjust the paths if using another installation directory. Preserve the private secret files on updates. This server is intended for a trusted home network; it is not an authenticated public internet gateway.

```sh
systemctl status lampa-local
sudo systemctl restart lampa-local
journalctl -u lampa-local -n 50
```

## Scope and verification

`source/src` and `source/public` contain the modified app and local runtime assets. Unused upstream plugin packs, platform packaging and development tools are not included. `source/package-lock.json` pins build dependencies. `server.py` serves static assets and provides fixed-destination proxies; it does not execute torrents or transcode video.

Tests cover removed telemetry endpoints, CSP, nested Jackett credential scrubbing, preserved magnet links, parental/profile policy, empty topic/title blacklists and unrestricted TMDB discovery. A LAN deployment was additionally checked for catalog rendering, posters, card-to-torrent search, Jackett `.torrent` delivery and TorrServer's list API. Playback of every codec/device is not covered.

Upstream dependencies are inherited and include older packages. Review upstream changes and rerun the build/tests when updating; automatic upstream updates are intentionally absent.

No private API keys, local deployment addresses, SSH settings, user histories or original working-directory Git history are included in this repository.

## Windows browser playback

Windows browsers open HTTP video streams directly in **PotPlayer**, without an additional Lampa dialog. Existing VLC/internal player preferences are migrated to PotPlayer, and player selection fields are hidden on Windows. YouTube playback retains its built-in handling.

The Windows `potplayer://` association must be installed. The browser may still ask permission to open the application; this permission belongs to the browser. The torrent file list stays usable after launching the player or cancelling the browser prompt.

No registry changes, browser extensions or executable downloads are performed. External player progress is not synchronized back to Lampa. macOS/iOS and native desktop app choices are preserved.

Run `node tests/windows-player.cjs` for Windows defaults, preference migration and handoff regression tests. Actual launch of installed Windows applications requires testing on that PC.
