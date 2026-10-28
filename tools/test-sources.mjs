// One-off: download TheMealDB's full catalogue (names, ingredients, photos) to test/mealdb-all for matching.
import fs from 'node:fs';import sharp from 'sharp';
const UA={'User-Agent':'MisePrototype/1.0 (student project; https://aleghisi04-creator.github.io/mise/)'};
fs.mkdirSync('test/mealdb-all',{recursive:true});const all=[];
for(const c of 'abcdefghijklmnopqrstuvwxyz'){const r=await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${c}`,{headers:UA});const j=await r.json().catch(()=>({}));
  for(const m of j.meals||[]){const ing=[];for(let i=1;i<=20;i++){const v=(m['strIngredient'+i]||'').trim();if(v)ing.push(v);}
    all.push({id:m.idMeal,name:m.strMeal,cat:m.strCategory,area:m.strArea,tags:m.strTags,ing,thumb:m.strMealThumb});}
  await new Promise(x=>setTimeout(x,500));}
fs.writeFileSync('test/mealdb.json',JSON.stringify(all));
for(const m of all){try{const b=Buffer.from(await (await fetch(m.thumb,{headers:UA})).arrayBuffer());await sharp(b).resize(640,480,{fit:'cover'}).jpeg({quality:74,mozjpeg:true}).toFile(`test/mealdb-all/${m.id}.jpg`);}catch(e){console.log('fail',m.id);}}
console.log(all.length);
