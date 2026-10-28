// Finds an openly licensed photo for each recipe and saves it in photos/.
// Order: Openverse search by dish name, then Wikimedia Commons search, then the Wikipedia article image.
import fs from 'node:fs';
import sharp from 'sharp';
const recipes=JSON.parse(fs.readFileSync('tools/recipes.json','utf8'));
fs.mkdirSync('photos',{recursive:true});
const indexPath='photos/index.json';
const index=fs.existsSync(indexPath)?JSON.parse(fs.readFileSync(indexPath,'utf8')):{};
const used=new Set(Object.values(index).map(p=>p.href));
const UA={'User-Agent':'MisePrototype/1.0 (student project; https://aleghisi04-creator.github.io/mise/)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const STOP=new Set(['with','and','the','a','of','in','on','for','to','easy','quick','best','simple','our','my','style','homemade','one','pan','pot','sheet','skillet']);
const short=n=>n.replace(/[^\p{L}\s-]/gu,' ').split(/\s+/).filter(w=>w&&!STOP.has(w.toLowerCase())).slice(0,3).join(' ');
async function json(url){for(let i=0;i<3;i++){const r=await fetch(url,{headers:UA});if(r.status===429){await sleep(15000*(i+1));continue;}if(!r.ok)return null;return r.json();}return null;}
let ovOff=false;
async function openverse(q){if(ovOff)return [];const d=await json(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&category=photograph&mature=false&page_size=8`);
  if(!d){ovOff=true;console.log('Openverse unavailable or rate limited, using Wikimedia from here');return [];}await sleep(3500);
  return (d.results||[]).filter(i=>i.url&&i.foreign_landing_url).map(i=>({url:i.url,href:i.foreign_landing_url,title:i.title||'',credit:`${i.creator||'Unknown'} · ${String(i.license||'cc').toUpperCase()}${i.license_version?' '+i.license_version:''} via Openverse`}));}
async function commons(q){const d=await json(`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(q+' filetype:bitmap')}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=720`);
  const pages=Object.values(d?.query?.pages||{}).sort((a,b)=>a.index-b.index);
  return pages.filter(p=>p.imageinfo?.[0]?.thumburl&&/\.jpe?g$/i.test(p.title)).map(p=>{const ii=p.imageinfo[0],m=ii.extmetadata||{};const who=String(m.Artist?.value||'Unknown').replace(/<[^>]+>/g,'').trim().slice(0,60);
    return {url:ii.thumburl,href:ii.descriptionurl,title:p.title,credit:`${who} · ${m.LicenseShortName?.value||'see source'} via Wikimedia Commons`};});}
async function wikiImage(t){const d=await json(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail|name&pithumbsize=720&redirects=1&titles=${encodeURIComponent(t)}`);
  const p=Object.values(d?.query?.pages||{})[0];if(!p?.thumbnail)return [];const f='File:'+p.pageimage;
  return [{url:p.thumbnail.source,href:`https://commons.wikimedia.org/wiki/${encodeURIComponent(f.replace(/ /g,'_'))}`,title:f,credit:'Wikimedia Commons'}];}
async function save(r,c){const res=await fetch(c.url,{headers:UA});if(!res.ok)return false;const buf=Buffer.from(await res.arrayBuffer());
  try{await sharp(buf).rotate().resize(640,480,{fit:'cover'}).jpeg({quality:72,mozjpeg:true}).toFile(`photos/${r.id}.jpg`);}catch{return false;}
  index[r.id]={credit:c.credit,href:c.href};used.add(c.href);return true;}
let n=0;
for(const r of recipes){
  if(r.own||index[r.id])continue;
  const tries=[()=>openverse(r.name),()=>commons(r.name),()=>commons(short(r.name)),...(r.wiki||[]).slice(0,1).map(t=>()=>wikiImage(t))];
  let ok=false;
  for(const t of tries){let list=[];try{list=await t();}catch{}
    for(const c of list.filter(c=>!used.has(c.href)).slice(0,3)){if(await save(r,c)){ok=true;break;}}
    if(ok)break;}
  console.log(ok?'ok  ':'none',r.id);if(ok&&++n%20===0)fs.writeFileSync(indexPath,JSON.stringify(index,null,0));
}
fs.writeFileSync(indexPath,JSON.stringify(index,null,0));
console.log(`photos: ${Object.keys(index).length} of ${recipes.length}`);
