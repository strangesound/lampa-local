import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('server', ROOT / 'server.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

class PrivacyTests(unittest.TestCase):
    def test_rewrite_nested_download_links(self):
        data = {'Results': [{'Link': server.JACKETT + '/api/v2.0/indexers/demo/results/torznab/api?apikey=SECRET&t=get&id=123'}]}
        result = server.rewrite_jackett(data)
        self.assertNotIn('SECRET', str(result))
        self.assertEqual(result['Results'][0]['Link'], server.PUBLIC_URL + '/jackett/api/v2.0/indexers/demo/results/torznab/api?t=get&id=123')
        self.assertIn('SECRET', data['Results'][0]['Link'])

    def test_jackett_download_and_poster_credentials(self):
        for route in ['dl','img']:
            url = server.JACKETT + '/' + route + '/rutor/?jackett_apikey=SECRET&path=opaque&file=test'
            result = server.rewrite_jackett(url)
            self.assertNotIn('SECRET', result)
            self.assertEqual(result, server.PUBLIC_URL + '/jackett/' + route + '/rutor/?path=opaque&file=test')

    def test_magnets_preserved(self):
        magnet = 'magnet:?xt=urn:btih:123&dn=test'
        self.assertEqual(server.rewrite_jackett(magnet), magnet)

    def test_external_scripts_and_tracking_not_allowed(self):
        self.assertIn("script-src 'self' 'unsafe-eval'", server.CSP)
        self.assertIn("connect-src 'self' " + server.TORRSERVER, server.CSP)
        self.assertNotIn('https:', server.CSP)

    def test_reporting_removed_from_bundle(self):
        bundle = (ROOT / 'dist/app.js').read_text()
        for endpoint in ['/api/metric/unic', '/api/metric/stat', '/api/metric/histogram',
                         '/api/lampa/logs/write', '/api/plugins/blacklist', '/lgbt.json',
                         '/watch?id=', '/api/remote-configuration/']:
            self.assertNotIn(endpoint, bundle)

    def test_no_youtube_autoload(self):
        self.assertNotIn('youtube.com/iframe_api', (ROOT / 'dist/index.html').read_text())

    @unittest.skipUnless((ROOT / 'secrets/jackett.key').is_file(), 'Private integration key is optional')
    def test_key_not_shipped_in_frontend(self):
        key = (ROOT / 'secrets/jackett.key').read_text().strip()
        for name in ['app.js','index.html','local-config.js']:
            self.assertNotIn(key, (ROOT / 'dist' / name).read_text())

if __name__ == '__main__':
    unittest.main()
