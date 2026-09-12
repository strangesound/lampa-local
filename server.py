#!/usr/bin/env python3
"""Local Lampa static server and fixed-destination metadata/Jackett proxy."""
import json
import os
import re
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, urlunsplit, urlencode, parse_qsl, unquote
from urllib.request import Request, build_opener, HTTPRedirectHandler, ProxyHandler
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parent
JACKETT = os.environ.get('JACKETT_URL', 'http://127.0.0.1:9117').rstrip('/')
KEY_FILE = Path(os.environ.get('JACKETT_KEY_FILE', str(ROOT / 'secrets/jackett.key')))
TORRSERVER = os.environ.get('TORRSERVER_URL', 'http://127.0.0.1:8090').rstrip('/')
PUBLIC_URL = os.environ.get('PUBLIC_URL', 'http://127.0.0.1:8088').rstrip('/')
TMDB_KEY_FILE = Path(os.environ.get('TMDB_KEY_FILE', str(ROOT / 'secrets/tmdb.key')))
CSP = "; ".join([
    "default-src 'self'", "script-src 'self' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
    "font-src 'self' data:", f"connect-src 'self' {TORRSERVER}",
    f"media-src 'self' blob: {TORRSERVER}", "worker-src 'self' blob:",
    "object-src 'none'", "frame-src 'none'", "base-uri 'self'",
    "form-action 'self'", "frame-ancestors 'self'",
])

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None
OPENER = build_opener(ProxyHandler({}), NoRedirect)
METADATA_PROXY = os.environ.get('METADATA_PROXY', '')
METADATA_OPENER = build_opener(ProxyHandler({'https': METADATA_PROXY}) if METADATA_PROXY else ProxyHandler({}), NoRedirect)


def rewrite_jackett(value):
    """Keep the Jackett credential out of JSON returned to browsers."""
    if isinstance(value, dict):
        return {k: rewrite_jackett(v) for k, v in value.items()}
    if isinstance(value, list):
        return [rewrite_jackett(v) for v in value]
    if isinstance(value, str) and value.startswith(JACKETT + '/'):
        parsed = urlsplit(value)
        query = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
                 if k.lower() not in ('apikey', 'jackett_apikey')]
        return PUBLIC_URL + '/jackett' + parsed.path + ('?' + urlencode(query) if query else '')
    return value


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'dist'), **kwargs)

    def log_message(self, fmt, *args):
        # No browsing/search history or query-string credentials in access logs.
        pass

    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def respond(self, status, body, content_type='application/json'):
        if not isinstance(body, bytes):
            body = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = urlsplit(self.path)
        decoded = unquote(path.path)
        if '..' in decoded.split('/') or '\\' in decoded:
            return self.respond(400, {'error': 'Invalid path'})
        if path.path == '/deployment-config.js':
            config = json.dumps({'torrserver_url': TORRSERVER})
            return self.respond(200, ('window.lampa_deployment = ' + config + ';').encode(), 'application/javascript')
        if path.path == '/healthz':
            return self.respond(200, {'status': 'ok', 'edition': 'local', 'jackett_configured': KEY_FILE.is_file()})
        if path.path.startswith('/tmdb/'):
            key = os.environ.get('TMDB_API_KEY', '')
            if not key and TMDB_KEY_FILE.is_file():
                key = TMDB_KEY_FILE.read_text().strip()
            if not key:
                return self.respond(503, {'error': 'Configure TMDB_API_KEY or secrets/tmdb.key on the server'})
            params = [(k, v) for k, v in parse_qsl(path.query, keep_blank_values=True) if k.lower() != 'api_key']
            params.append(('api_key', key))
            return self.proxy('https://api.themoviedb.org/' + path.path[len('/tmdb/'):] + '?' + urlencode(params))
        if path.path.startswith('/tmdb-image/'):
            return self.proxy('https://image.tmdb.org/' + re.sub(r'/+', '/', self.path[len('/tmdb-image/'):]))
        if path.path.startswith('/jackett/'):
            api_path = path.path[len('/jackett'):]
            # Expose search/download only; do not proxy Jackett's admin API.
            if not (api_path.startswith('/api/v2.0/indexers/') or re.fullmatch(r'/(dl|img)/[a-zA-Z0-9_-]+/', api_path)):
                return self.respond(403, {'error': 'Search API only'})
            if not KEY_FILE.is_file():
                return self.respond(503, {'error': 'Jackett API key is not configured on the server'})
            params = [(k, v) for k, v in parse_qsl(path.query, keep_blank_values=True) if k.lower() not in ('apikey', 'jackett_apikey')]
            key_name = 'jackett_apikey' if api_path.startswith(('/dl/', '/img/')) else 'apikey'
            params.append((key_name, KEY_FILE.read_text().strip()))
            return self.proxy(JACKETT + api_path + '?' + urlencode(params), jackett=True)
        if any(part.startswith('.') for part in decoded.split('/') if part):
            return self.respond(404, {'error': 'Not found'})
        return super().do_GET()

    def proxy(self, url, jackett=False):
        try:
            req = Request(url, headers={'Accept': self.headers.get('Accept', '*/*'), 'User-Agent': 'Lampa-Local/1.0'})
            opener = OPENER if jackett else METADATA_OPENER
            with opener.open(req, timeout=45) as response:
                body = response.read(32 * 1024 * 1024 + 1)
                if len(body) > 32 * 1024 * 1024:
                    return self.respond(502, {'error': 'Upstream response too large'})
                content_type = response.headers.get('Content-Type', 'application/octet-stream')
                if jackett and 'json' in content_type:
                    body = json.dumps(rewrite_jackett(json.loads(body)), ensure_ascii=False).encode()
                return self.respond(response.status, body, content_type)
        except HTTPError as error:
            # Never return an upstream error containing our credential or a redirect to it.
            return self.respond(502, {'error': 'Upstream HTTP error', 'status': error.code})
        except (URLError, TimeoutError, OSError, ValueError):
            return self.respond(502, {'error': 'Upstream unavailable'})


if __name__ == '__main__':
    bind = os.environ.get('BIND', '127.0.0.1')
    port = int(os.environ.get('PORT', '8088'))
    print(f'Lampa Local listening on http://{bind}:{port}', flush=True)
    ThreadingHTTPServer((bind, port), Handler).serve_forever()
