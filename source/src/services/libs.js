import Utils from '../utils/utils'
import Manifest from '../core/manifest'
import Platform from '../core/platform'

/**
 * Инициализация дополнительных библиотек
 * @returns {void}
 */
function init(){
    let include = []

    // Видео библиотеки
    include = include.concat(['hls/hls.js', 'dash/dash.js', 'qrcode/qrcode.js'].map(lib=>{
        return window.location.protocol == 'file:' || window.location.href.indexOf('chrome-extension') > -1 ? Manifest.github_lampa + 'vender/' + lib : './vender/' + lib
    }))

    // YouTube IFrame API
    // больше не актуально, так как youtube плеер теперь использует собственный мост для взаимодействия с iframe, и не зависит от глобального объекта YT
    // if(window.youtube_lazy_load && window.lampa_settings.youtube){
    //     include.push(Utils.protocol() + 'youtube.com/iframe_api')
    // }

    Utils.putScriptOfMirrors(include,()=>{})
}

export default {
    init
}