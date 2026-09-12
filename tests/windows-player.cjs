const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../source/src');
const platform = fs.readFileSync(path.join(root,'core/platform.js'),'utf8');
const detect = platform.match(/function windowsBrowser\(\)\{[\s\S]*?\n\}/)[0];
for (const [ua,desktop,wanted] of [['Windows NT 10.0',false,true],['Windows NT 10.0',true,false],['Mac OS X',false,false],['iPhone',false,false]]) {
 const c={navigator:{userAgent:ua},desktop:()=>desktop};vm.runInNewContext(detect,c);assert.equal(c.windowsBrowser(),wanted);
}
const params = fs.readFileSync(path.join(root,'interaction/settings/params.js'),'utf8');
const platformSetup = params.slice(params.indexOf('function init(){'),params.indexOf("    trigger('advanced_animation'"))+'}';
for(const kind of ['windows','mac','ios','desktop']) {
 const choices={};
 const c={select:(key,value)=>choices[key]=value, trigger:()=>{},Platform:{screen:()=>false,windowsBrowser:()=>kind==='windows',desktop:()=>kind==='desktop',macOS:()=>kind==='mac',is:(s)=>kind==='ios'&&s==='apple'}};
 vm.runInNewContext(platformSetup,c);c.init();
 for(const key of ['player','player_iptv','player_torrent']) {
  assert(choices[key].inner);
  assert(choices[key][kind==='windows'?'vlc_playlist':kind==='desktop'?'other':'infuse']);
  if(kind==='windows')assert(choices[key].potplayer);
 }
}
let dialog,assigned,external=0,cancelled=0,inner=0,clicked=0,revoked=0,timeout;
class TestURL extends URL {
 static createObjectURL(blob){assert.equal(blob.type,'audio/x-mpegurl;charset=utf-8');return 'blob:test'}
 static revokeObjectURL(url){assert.equal(url,'blob:test');revoked++}
}
const element={append(){return this},text(){return this},val(){return this}};
const c={result:null,URL:TestURL,Blob,Error,$:()=>element,Modal:{open:x=>dialog=x,close(){}},Controller:{enabled:()=>({name:'content'}),toggle(){}},Lang:{selected:()=>true},Torserver:{toPlayUrl:x=>x},Noty:{show:x=>{throw Error(x)}},window:{location:{assign:x=>assigned=x}},document:{body:{appendChild(){}},createElement:()=>({click(){clicked++},remove(){}})},setTimeout:f=>timeout=f};
vm.runInNewContext(fs.readFileSync(path.join(root,'interaction/player/windows.js'),'utf8').replace(/^import .*$/mg,'').replace('export default','result ='),c);
const url='http://media.example/stream?link=a%2Fb&index=2&play';
assert.equal(c.result.streamUrl(url),url);
assert.equal(c.result.playlist(url,'Title\n#EXTVLCOPT:test'),'#EXTM3U\n#EXTINF:-1,Title #EXTVLCOPT:test\n'+url+'\n');
for(const bad of ['javascript:alert(1)','file:///tmp/test','http://media.example/\n#EXTVLCOPT:test'])assert.throws(()=>c.result.streamUrl(bad));
c.result.open({url,title:'Test'},'potplayer',()=>inner++,()=>external++,()=>cancelled++);
dialog.buttons[0].onSelect();assert.equal(assigned,'potplayer://'+url);assert.equal(external,1);
dialog.buttons[1].onSelect();assert.equal(clicked,1);timeout();assert.equal(revoked,1);
dialog.buttons[2].onSelect();assert.equal(inner,1);
dialog.onBack();assert.equal(cancelled,1);
c.result.open({url},'vlc_playlist',()=>{},()=>{},()=>{});
assert.equal(dialog.title,'VLC');assert.equal(dialog.buttons.length,2);
console.log('Windows detection, all player settings, PotPlayer URL, M3U8 handoff and browser fallback passed.');
