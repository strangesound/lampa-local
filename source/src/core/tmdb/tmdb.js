import Storage from '../storage/storage'
import Utils from '../../utils/utils'

let broken_images = 0

function proxy(name){
    let proxy = Storage.field(name)

    if(proxy.length > 0 && proxy.charAt(proxy.length - 1) == '/'){
        proxy = proxy.substring(0, proxy.length - 1)
    }

    return Utils.checkHttp(proxy)
}

/**
 * Проксировать API запрос
 * @param {string} url URL запроса
 * @return {string} Проксированный URL запроса
 */
function api(url){ return window.location.origin + '/tmdb/3/' + url }

/**
 * Проксировать изображение
 * @param {string} url URL изображения
 * @return {string} Проксированный URL изображения
 */
function image(url){ return window.location.origin + '/tmdb-image/' + url }

/**
 * Сообщить о сломанных изображениях
 */
function broken(){
    broken_images++

    if(broken_images > 50){
        broken_images = 0

        if(Storage.field('tmdb_proxy_image') && Storage.field('proxy_tmdb_auto')) Storage.set('proxy_tmdb', true)
    }
}

/**
 * Получить ключ TMDB
 * @return {string} Ключ TMDB
 */
function key(){
    return '' // API credential is injected by the local server.
}

export default {
    api,
    key,
    image,
    broken
}