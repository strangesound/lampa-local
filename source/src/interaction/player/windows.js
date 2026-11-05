import Lang from '../../core/lang'
import Torserver from '../torserver'
import Noty from '../noty'

function streamUrl(value){
    if(typeof value !== 'string' || /[\r\n\x00]/.test(value)) throw new Error('Invalid stream URL')
    let url = new URL(value)
    if(url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Expected HTTP stream')
    return url.href
}

function open(data, onExternal, onError){
    let url
    try { url = streamUrl(Torserver.toPlayUrl(data.url)) }
    catch(e) {
        Noty.show(Lang.selected(['ru']) ? 'Для mpv нужна HTTP-ссылка на видео' : 'mpv requires an HTTP video URL')
        if(onError) onError()
        return
    }

    // Preserve the existing file-picker modal and its controller. Modal.open()
    // is not stackable: opening another modal here orphaned the torrent UI.
    try {
        // Use a stable host/path; the local launcher decodes the HTTP URL once.
        window.location.assign('mpv://play/?url=' + encodeURIComponent(url))
    }
    catch(e) {
        Noty.show(Lang.selected(['ru']) ? 'Не удалось открыть mpv. Проверьте разрешение браузера на запуск приложения.' : 'Could not open mpv. Check the browser permission to launch the app.')
        if(onError) onError()
        return
    }
    if(onExternal) onExternal()
}

export default { open, streamUrl }
