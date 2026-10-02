import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../../backend/apps-script/LegacyMigration.gs',import.meta.url),'utf8'),context);
const show={malId:42,title:'Example 2',titleEn:'Example Season 2',titleJp:'作品 第2期',episodes:12};
const description='<b>Eng Title:</b> Example Season 2\n<b>JP Kanji Title:</b> 作品 第2期\n<b>Review:</b> Keep this review';
const event=(title='Example 2 Ep. 1',text=description)=>({getTitle:()=>title,getDescription:()=>text});
test('legacy HTML matching requires corroborating MAL aliases and preserves original description',()=>{
 const result=context.planLegacyIdentifiers_([event()],[show]);
 assert.equal(result.matches[0].key,'anime-sync:42:ep:1');
 assert.equal(result.matches[0].description,description);
});
test('legacy matching rejects duplicate keys, ambiguous aliases, unrelated events and out-of-range episodes',()=>{
 assert.equal(context.planLegacyIdentifiers_([event(),event()],[show]).matches.length,0);
 assert.equal(context.planLegacyIdentifiers_([event(),event('Managed','MAL ID: 42\nSync Key: anime-sync:42:ep:1')],[show]).matches.length,0);
 assert.equal(context.planLegacyIdentifiers_([event()],[show,{...show,malId:43}]).matches.length,0);
 assert.equal(context.planLegacyIdentifiers_([event('Example 2 Ep. 1','Personal meeting')],[show]).matches.length,0);
 assert.equal(context.planLegacyIdentifiers_([event('Example 2 Ep. 13')],[show]).matches.length,0);
 assert.equal(context.planLegacyIdentifiers_([event('Example 2 Ep. 1-4')],[show]).matches.length,0);
});
