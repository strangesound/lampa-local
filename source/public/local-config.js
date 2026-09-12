/* Local deployment policy: loaded before the application. */
window.lampa_settings = {
    socket_use: false, socket_methods: false,
    account_use: false, account_sync: false,
    plugins_use: true, plugins_store: false,
    torrents_use: true, white_use: false, read_only: false, demo: false,
    dcma: false, lgbt: false,
    services: false, feed: false, youtube: false, geo: false, mirrors: false,
    hide_important_params: false,
    disable_features: {
        dmca: true, lgbt: true, reactions: true, discuss: true, metadata: true,
        ai: true, subscribe: true, blacklist: true, persons: true,
        ads: true, trailers: true, install_proxy: true, remote_configuration: true
    }
};
(function () {
    var defaults = {
        language: 'ru', tmdb_lang: 'ru', source: 'tmdb',
        parse_in_search: 'true', parser_use: 'true', parser_torrent_type: 'jackett', parser_use_link: 'one',
        jackett_url: window.location.origin + '/jackett', jackett_key: '',
        torrserver_url: (window.lampa_deployment || {}).torrserver_url || '',
        proxy_tmdb: 'false', proxy_tmdb_auto: 'false'
    };
    Object.keys(defaults).forEach(function (key) {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, defaults[key]);
    });
})();
