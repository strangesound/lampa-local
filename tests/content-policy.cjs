const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../source/src');
const parentalCode = fs.readFileSync(path.join(root, 'interaction/parental_control.js'),'utf8').replace('export default', 'result =');
const context = { result: null };
vm.runInNewContext(parentalCode, context);
let calls = 0;
assert.equal(context.result.enabled(), false);
context.result.query(() => calls++);
context.result.personal('extensions', () => calls++);
assert.equal(calls, 2, 'No parental PIN gate for playback or plugins');
const permitCode = fs.readFileSync(path.join(root,'core/account/permit.js'),'utf8').replace(/^import .*$/mg,'').replace('export default permit','result = permit');
for (const age of [0, 12, 18, 99]) {
 const ctx = {result:null, Storage:{get:()=>({token:'local-test',profile:{age,child:true}}),field:()=>true}, window:{lampa_settings:{account_use:true}}};
 vm.runInNewContext(permitCode,ctx);
 assert.equal(ctx.result.child,false);
 assert.equal(ctx.result.child_small,false);
}
const policyCode = fs.readFileSync(path.join(root,'core/tmdb/keys.js'),'utf8').replace('export default','result =');
vm.runInNewContext(policyCode,context);
for (const key of ['filter','adult','lgbt']) assert.equal(context.result[key].length,0);
const full = fs.readFileSync(path.join(root,'components/full.js'),'utf8');
assert(!full.includes('adult_block') && !full.includes('lgbt_block') && !full.includes('canWatchChildren'));
assert(fs.readFileSync(path.join(root,'core/api/sources/tmdb.js'),'utf8').includes('include_adult=true'));
console.log('Content policy: PIN, profiles, age and topic restrictions disabled.');
