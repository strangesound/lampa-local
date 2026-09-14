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
        Noty.show(Lang.selected(['ru']) ? 'Для PotPlayer нужна HTTP-ссылка на видео' : 'PotPlayer requires an HTTP video URL')
        if(onError) onError()
        return
    }

    // Preserve the existing file-picker modal and its controller. Modal.open()
    // is not stackable: opening another modal here orphaned the torrent UI.
    try {
        window.location.assign('potplayer://' + url)
    }
    catch(e) {
        Noty.show(Lang.selected(['ru']) ? 'Не удалось открыть PotPlayer. Проверьте разрешение браузера на запуск приложения.' : 'Could not open PotPlayer. Check the browser permission to launch the app.')
        if(onError) onError()
        return
    }
    if(onExternal) onExternal()
}

export default { open, streamUrl }
