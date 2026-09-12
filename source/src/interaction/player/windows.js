import Modal from '../modal'
import Controller from '../../core/controller'
import Lang from '../../core/lang'
import Torserver from '../torserver'
import Noty from '../noty'

function streamUrl(value){
    if(typeof value !== 'string' || /[\r\n\x00]/.test(value)) throw new Error('Invalid stream URL')
    let url = new URL(value)
    if(url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Expected HTTP stream')
    return url.href
}

function playlist(url, title){
    let name = String(title || 'Lampa').replace(/[\r\n\x00]/g, ' ')
    return '#EXTM3U\n#EXTINF:-1,' + name + '\n' + streamUrl(url) + '\n'
}

function download(url, title){
    let blob = new Blob([playlist(url, title)], {type: 'audio/x-mpegurl;charset=utf-8'})
    let objectUrl = URL.createObjectURL(blob)
    let link = document.createElement('a')
    link.href = objectUrl
    link.download = 'lampa.m3u8'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(()=>URL.revokeObjectURL(objectUrl), 60000)
}

function open(data, player, inner, onExternal, onCancel){
    let ru = Lang.selected(['ru'])
    let url
    try { url = streamUrl(Torserver.toPlayUrl(data.url)) }
    catch(e) { return Noty.show(ru ? 'Для внешнего плеера нужна HTTP-ссылка на видео' : 'External playback requires an HTTP video URL') }
    let previous = Controller.enabled().name
    let body = $('<div class="about"></div>')
    let text = player == 'potplayer'
        ? (ru ? 'Нажмите «Открыть PotPlayer» и разрешите запуск приложения в браузере. Если приложение не открылось, скачайте плейлист и откройте его в PotPlayer.' : 'Open PotPlayer and allow the browser to launch the app. If it does not open, download the playlist and open it in PotPlayer.')
        : (ru ? 'Скачайте плейлист и откройте файл lampa.m3u8 через «Открыть с помощью → VLC». Это ссылка на поток, а не скачивание фильма.' : 'Download the playlist and open lampa.m3u8 with VLC. This file contains the stream URL, not the video.')
    body.append($('<p></p>').text(text))
    body.append($('<p></p>').text(ru ? 'Ссылку также можно скопировать и открыть в плеере вручную:' : 'You can also copy this URL and open it in your player:'))
    body.append($('<textarea readonly rows="3" style="width:100%;user-select:text"></textarea>').val(url))
    let close = ()=>{ Modal.close(); Controller.toggle(previous) }
    let buttons = []
    if(player == 'potplayer') buttons.push({
        name: ru ? 'Открыть PotPlayer' : 'Open PotPlayer',
        onSelect: ()=>{ window.location.assign('potplayer://' + url); onExternal() }
    })
    buttons.push({name: ru ? 'Скачать плейлист' : 'Download playlist', onSelect: ()=>{ download(url, data.title); onExternal() }})
    buttons.push({name: ru ? 'В браузере' : 'Play in browser', onSelect: ()=>{ close(); inner() }})
    Modal.open({title: player == 'potplayer' ? 'PotPlayer' : 'VLC', html: body, size: 'medium', buttons,
        onBack: ()=>{ close(); onCancel() }
    })
}

export default { open, streamUrl, playlist }
