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
 const choices={}, saved={player:'inner',player_iptv:'vlc_playlist',player_torrent:'inner'}, writes=[];
 const c={Storage:{get:k=>saved[k],set:(k,v)=>{saved[k]=v;writes.push(k)}},select:(key,value)=>choices[key]=value, trigger:()=>{},Platform:{screen:()=>false,windowsBrowser:()=>kind==='windows',desktop:()=>kind==='desktop',macOS:()=>kind==='mac',is:(s)=>kind==='ios'&&s==='apple'}};
 vm.runInNewContext(platformSetup,c);c.init();
 for(const key of ['player','player_iptv','player_torrent']) {
  if(kind==='windows') {assert.deepEqual(Object.keys(choices[key]),['potplayer']);assert.equal(saved[key],'potplayer')}
  else {assert(choices[key].inner);assert(choices[key][kind==='desktop'?'other':'infuse'])}
 }
 assert.equal(writes.length,kind==='windows'?3:0);
}
let assigned=[],external=0,errors=0,notices=[];
const modalState={active:true,controller:'modal'};
const forbidden=()=>{throw Error('External handoff must not replace the active torrent modal')};
const c={result:null,URL,Error,Modal:{open:forbidden,close:forbidden},Controller:{toggle:forbidden},Lang:{selected:()=>true},Torserver:{toPlayUrl:x=>x},Noty:{show:x=>notices.push(x)},window:{location:{assign:x=>assigned.push(x)}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'interaction/player/windows.js'),'utf8').replace(/^import .*$/mg,'').replace('export default','result ='),c);
const url='http://media.example/stream?link=a%2Fb&index=2&play';
assert.equal(c.result.streamUrl(url),url);
for(const bad of ['javascript:alert(1)','file:///tmp/test','http://media.example/\n#EXTVLCOPT:test'])assert.throws(()=>c.result.streamUrl(bad));
// A second click must still work after returning from the system prompt/player.
for(let i=0;i<2;i++)c.result.open({url},()=>external++,()=>errors++);
assert.deepEqual(assigned,['potplayer://'+url,'potplayer://'+url]);assert.equal(external,2);assert.equal(errors,0);
assert.deepEqual(modalState,{active:true,controller:'modal'});
c.result.open({url:'file:///test'},()=>external++,()=>errors++);
assert.equal(assigned.length,2);assert.equal(errors,1);
c.window.location.assign=()=>{throw Error('Protocol launch refused')};
c.result.open({url},()=>external++,()=>errors++);
assert.equal(external,2);assert.equal(errors,2);assert.equal(notices.length,2);
const player=fs.readFileSync(path.join(root,'interaction/player.js'),'utf8');
assert.match(player,/if\(Platform.windowsBrowser\(\) && !Video.verifyTube\(data.url\)\)\{\s*WindowsPlayer.open/);
assert.match(fs.readFileSync(path.join(root,'interaction/settings/component.js'),'utf8'),/!Platform.any\(\) \|\| Platform.windowsBrowser\(\)/);
console.log('Windows PotPlayer defaults, migration, direct launch, modal preservation and error handling passed.');
