// One-off: compare two public photo APIs for a few recipes. Writes test/<source>/<id>.jpg and test/status.json.
import fs from 'node:fs';import sharp from 'sharp';
const R=JSON.parse(fs.readFileSync('tools/recipes.json','utf8')).filter(r=>!r.own);
const pick=['Chickpea','Pasta','Chicken','Salmon','Soup','Salad','Tacos','Curry','Omelet','Risotto','Burger','Fried Rice'].map(w=>R.find(r=>r.name.includes(w))).filter(Boolean);
const UA={'User-Agent':'MisePrototype/1.0 (student project; https://aleghisi04-creator.github.io/mise/)'};
const status={};const log=(k,v)=>{(status[k]??=[]).push(v);};
async function get(u){try{const r=await fetch(u,{headers:UA});const t=await r.text();let j=null;try{j=JSON.parse(t)}catch{};return {s:r.status,j,t:t.slice(0,200)};}catch(e){return {s:'err '+e.message};}}
const srcs={
  openverse_stock:async q=>{const d=await get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&source=stocksnap,rawpixel&page_size=5`);return [d.s+' '+(d.j?'':d.t),(d.j?.results||[]).map(i=>i.url)];},
  mealdb:async q=>{const w=q.split(' ').filter(x=>x.length>3);for(const x of [q,...w]){const d=await get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(x)}`);if(d.j?.meals)return [d.s+' via '+x,d.j.meals.map(m=>m.strMealThumb)];}return ['none',[]];},
};
fs.mkdirSync('test',{recursive:true});
for(const r of pick){for(const [k,f] of Object.entries(srcs)){const [s,urls]=await f(r.name);log(k,`${r.id}: ${s} n=${urls.length}`);
  if(urls[0]){try{const b=Buffer.from(await (await fetch(urls[0],{headers:UA})).arrayBuffer());fs.mkdirSync(`test/${k}`,{recursive:true});await sharp(b).resize(400,300,{fit:'cover'}).jpeg({quality:70}).toFile(`test/${k}/${r.id}.jpg`);}catch(e){log(k,'dl fail '+e.message);}}
  await new Promise(x=>setTimeout(x,3000));}}
fs.writeFileSync('test/status.json',JSON.stringify({pick:pick.map(r=>r.name),status},null,1));
