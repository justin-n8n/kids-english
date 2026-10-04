/* 原創單字怪獸（全部原創設計，非任何既有作品角色） */
(function(){
const M = [
 {id:"bubbo",   en:"Bubbo",    zh:"泡泡獺",   c1:"#4FA9F0", c2:"#D8F0FF", shape:"round", ears:"bear",    tail:"fish",  fx:"bubble"},
 {id:"flarepup",en:"Flarepup", zh:"火花犬",   c1:"#FF8A3D", c2:"#FFE3B8", shape:"round", ears:"cat",     tail:"flame", fx:"flame"},
 {id:"sproutle",en:"Sproutle", zh:"芽芽龜",   c1:"#5CC46E", c2:"#E4F8C9", shape:"wide",  ears:"leaf",    tail:"round", fx:"leaf"},
 {id:"sparkoo", en:"Sparkoo",  zh:"電光鴞",   c1:"#8C6CF0", c2:"#E9E2FF", shape:"pear",  ears:"antenna", tail:"none",  fx:"bolt"},
 {id:"pebblo",  en:"Pebblo",   zh:"小石熊",   c1:"#A47C5B", c2:"#EBD9C6", shape:"wide",  ears:"bear",    tail:"round", fx:"rock"},
 {id:"frostie", en:"Frostie",  zh:"冰冰企鵝", c1:"#6CC9E6", c2:"#FFFFFF", shape:"tall",  ears:"none",    tail:"none",  fx:"ice"},
 {id:"puffwing",en:"Puffwing", zh:"雲朵鳥",   c1:"#F3F6FF", c2:"#FFFFFF", shape:"round", ears:"wing",    tail:"swirl", fx:"cloud", ink:"#7C8BC9"},
 {id:"moonya",  en:"Moonya",   zh:"月光貓",   c1:"#5B4BB8", c2:"#C9C0FF", shape:"pear",  ears:"cat",     tail:"swirl", fx:"moon"},
 {id:"dewdrop", en:"Dewdrop",  zh:"露珠蝸",   c1:"#2EC4B6", c2:"#D7FFF8", shape:"tall",  ears:"antenna", tail:"none",  fx:"bubble"},
 {id:"cocoroo", en:"Cocoroo",  zh:"可可袋鼠", c1:"#C9935A", c2:"#F8E3C8", shape:"tall",  ears:"bunny",   tail:"round", fx:"star"},
 {id:"blossi",  en:"Blossi",   zh:"花花鹿",   c1:"#FF8FB8", c2:"#FFE6F0", shape:"pear",  ears:"horn",    tail:"round", fx:"flower"},
 {id:"shellby", en:"Shellby",  zh:"貝殼蟹",   c1:"#FF6F61", c2:"#FFE0DB", shape:"wide",  ears:"antenna", tail:"none",  fx:"shell"},
 {id:"glowbug", en:"Glowbug",  zh:"螢光蟲",   c1:"#B5E02F", c2:"#F4FFD1", shape:"round", ears:"antenna", tail:"round", fx:"glow"},
 {id:"rumbly",  en:"Rumbly",   zh:"轟轟恐龍", c1:"#6FA287", c2:"#DDF1E5", shape:"pear",  ears:"horn",    tail:"swirl", fx:"rock"},
 {id:"mistfox", en:"Mistfox",  zh:"霧霧狐",   c1:"#B79CF2", c2:"#F2EBFF", shape:"pear",  ears:"cat",     tail:"flame", fx:"cloud"},
 {id:"honeyo",  en:"Honeyo",   zh:"蜜糖熊",   c1:"#F2B233", c2:"#FFF1C9", shape:"round", ears:"bear",    tail:"round", fx:"star"},
 {id:"snowpo",  en:"Snowpo",   zh:"雪球海豹", c1:"#DDEBFA", c2:"#FFFFFF", shape:"wide",  ears:"none",    tail:"fish",  fx:"ice", ink:"#6E86B8"},
 {id:"pipsy",   en:"Pipsy",    zh:"嗶嗶雞",   c1:"#FFD23F", c2:"#FFF6CC", shape:"round", ears:"wing",    tail:"none",  fx:"star"},
 {id:"coralin", en:"Coralin",  zh:"珊瑚魚",   c1:"#FF7DA0", c2:"#FFE3EC", shape:"wide",  ears:"fin",     tail:"fish",  fx:"bubble"},
 {id:"thundra", en:"Thundra",  zh:"雷雲龍",   c1:"#34508F", c2:"#BFD0FF", shape:"tall",  ears:"horn",    tail:"swirl", fx:"bolt"},
 {id:"mochi",   en:"Mochi",    zh:"麻糬狸",   c1:"#EFD9B4", c2:"#FFF8EC", shape:"round", ears:"bear",    tail:"round", fx:"flower", ink:"#8F6F4A"},
 {id:"cinder",  en:"Cinder",   zh:"炭炭蜥",   c1:"#E2483D", c2:"#FFD3C9", shape:"tall",  ears:"horn",    tail:"flame", fx:"flame"},
 {id:"twiggy",  en:"Twiggy",   zh:"樹枝猴",   c1:"#8A9A3B", c2:"#EEF2C8", shape:"pear",  ears:"leaf",    tail:"swirl", fx:"leaf"},
 {id:"starlo",  en:"Starlo",   zh:"星星海星", c1:"#3F3DA8", c2:"#D3D2FF", shape:"round", ears:"none",    tail:"star",  fx:"star"},
 {id:"rainbo",  en:"Rainbo",   zh:"彩虹鯨",   c1:"#5AB0E8", c2:"#E6F5FF", shape:"wide",  ears:"fin",     tail:"fish",  fx:"rainbow"},
];
const INK = "#24305E";
function shade(hex, f){ // f<0 darker
  const n=parseInt(hex.slice(1),16); let r=n>>16,g=(n>>8)&255,b=n&255;
  const t=f<0?0:255, p=Math.abs(f);
  r=Math.round((t-r)*p+r); g=Math.round((t-g)*p+g); b=Math.round((t-b)*p+b);
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function bodyPath(shape){
  switch(shape){
    case "tall": return {cx:60,cy:66,rx:28,ry:36};
    case "wide": return {cx:60,cy:72,rx:40,ry:28};
    case "pear": return {cx:60,cy:68,rx:33,ry:33};
    default:     return {cx:60,cy:68,rx:34,ry:32};
  }
}
function ears(m,b,ink,c1,c2,stage){
  const top=b.cy-b.ry, L=b.cx-b.rx*0.55, R=b.cx+b.rx*0.55, s=`stroke="${ink}" stroke-width="3" stroke-linejoin="round"`;
  switch(m.ears){
    case "cat": return `<path d="M${L-12} ${top+12} L${L-6} ${top-16} L${L+12} ${top+4} Z" fill="${c1}" ${s}/><path d="M${R+12} ${top+12} L${R+6} ${top-16} L${R-12} ${top+4} Z" fill="${c1}" ${s}/>`;
    case "bunny": return `<ellipse cx="${L}" cy="${top-14}" rx="8" ry="22" fill="${c1}" ${s} transform="rotate(-12 ${L} ${top-14})"/><ellipse cx="${R}" cy="${top-14}" rx="8" ry="22" fill="${c1}" ${s} transform="rotate(12 ${R} ${top-14})"/><ellipse cx="${L}" cy="${top-14}" rx="3.5" ry="14" fill="${c2}" transform="rotate(-12 ${L} ${top-14})"/><ellipse cx="${R}" cy="${top-14}" rx="3.5" ry="14" fill="${c2}" transform="rotate(12 ${R} ${top-14})"/>`;
    case "bear": return `<circle cx="${L-4}" cy="${top+6}" r="11" fill="${c1}" ${s}/><circle cx="${R+4}" cy="${top+6}" r="11" fill="${c1}" ${s}/><circle cx="${L-4}" cy="${top+6}" r="5" fill="${c2}"/><circle cx="${R+4}" cy="${top+6}" r="5" fill="${c2}"/>`;
    case "antenna": return `<path d="M${L+6} ${top+6} Q${L-6} ${top-14} ${L-10} ${top-20}" fill="none" ${s}/><path d="M${R-6} ${top+6} Q${R+6} ${top-14} ${R+10} ${top-20}" fill="none" ${s}/><circle cx="${L-10}" cy="${top-21}" r="6" fill="#FFD23F" ${s}/><circle cx="${R+10}" cy="${top-21}" r="6" fill="#FFD23F" ${s}/>`;
    case "leaf": return `<path d="M60 ${top+4} C46 ${top-6} 44 ${top-24} 54 ${top-30} C60 ${top-18} 62 ${top-8} 60 ${top+4} Z" fill="#5CC46E" ${s}/><path d="M60 ${top+4} C72 ${top-4} 78 ${top-18} 74 ${top-26} C66 ${top-18} 62 ${top-8} 60 ${top+4} Z" fill="#8ADB7A" ${s}/>`;
    case "horn": return `<path d="M${L} ${top+8} L${L-4} ${top-14} L${L+10} ${top+4} Z" fill="#FFF1C9" ${s}/><path d="M${R} ${top+8} L${R+4} ${top-14} L${R-10} ${top+4} Z" fill="#FFF1C9" ${s}/>`;
    case "fin": return `<path d="M${b.cx-10} ${top+4} Q${b.cx} ${top-22} ${b.cx+16} ${top+4} Z" fill="${shade(c1,-0.15)}" ${s}/>`;
    case "wing": return `<path d="M${b.cx-b.rx+2} ${b.cy} q-22 -6 -20 -24 q10 4 24 10 Z" fill="${c2}" ${s}/><path d="M${b.cx+b.rx-2} ${b.cy} q22 -6 20 -24 q-10 4 -24 10 Z" fill="${c2}" ${s}/>`;
    default: return "";
  }
}
function tail(m,b,ink,c1){
  const x=b.cx+b.rx-4, y=b.cy+b.ry*0.35, s=`stroke="${ink}" stroke-width="3" stroke-linejoin="round"`;
  switch(m.tail){
    case "flame": return `<path d="M${x} ${y} C${x+16} ${y-2} ${x+20} ${y-18} ${x+14} ${y-30} C${x+26} ${y-24} ${x+30} ${y-6} ${x+18} ${y+8} Z" fill="#FFB13D" ${s}/><path d="M${x+6} ${y+2} C${x+14} ${y-2} ${x+18} ${y-10} ${x+16} ${y-18} C${x+22} ${y-10} ${x+20} ${y} ${x+12} ${y+6} Z" fill="#FF6B3D"/>`;
    case "fish": return `<path d="M${x-2} ${y} L${x+22} ${y-14} L${x+18} ${y+2} L${x+24} ${y+16} Z" fill="${shade(c1,-0.12)}" ${s}/>`;
    case "round": return `<circle cx="${x+6}" cy="${y+2}" r="9" fill="${shade(c1,0.35)}" ${s}/>`;
    case "swirl": return `<path d="M${x} ${y} q20 4 20 -14 q0 -10 -10 -10 q-8 0 -8 8" fill="none" stroke="${ink}" stroke-width="9" stroke-linecap="round"/><path d="M${x} ${y} q20 4 20 -14 q0 -10 -10 -10 q-8 0 -8 8" fill="none" stroke="${c1}" stroke-width="4.5" stroke-linecap="round"/>`;
    case "star": return star(x+10,y-4,10,"#FFD23F",ink);
    default: return "";
  }
}
function star(cx,cy,r,fill,ink){
  let p=""; for(let i=0;i<10;i++){const a=Math.PI/5*i-Math.PI/2, rr=i%2?r*0.45:r; p+=(i?"L":"M")+(cx+rr*Math.cos(a)).toFixed(1)+" "+(cy+rr*Math.sin(a)).toFixed(1);}
  return `<path d="${p}Z" fill="${fill}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`;
}
function stageExtra(m,b,ink,stage){
  if(stage<2) return "";
  const top=b.cy-b.ry, s=`stroke="${ink}" stroke-width="3" stroke-linejoin="round"`;
  let out="";
  const map={
    flame:`<path d="M60 ${top+2} c-8 -8 -4 -18 0 -22 c4 6 10 8 6 18 Z" fill="#FF8A3D" ${s}/>`,
    leaf:`<circle cx="${b.cx-b.rx+8}" cy="${b.cy-6}" r="6" fill="#FF8FB8" ${s}/>`,
    bolt:`<path d="M${b.cx+b.rx-6} ${b.cy-18} l10 0 l-6 10 l8 0 l-14 16 l4 -12 l-7 0 Z" fill="#FFD23F" ${s}/>`,
    bubble:`<circle cx="${b.cx-b.rx-6}" cy="${top+10}" r="6" fill="#fff" fill-opacity=".7" ${s}/><circle cx="${b.cx-b.rx-14}" cy="${top-4}" r="4" fill="#fff" fill-opacity=".7" stroke="${ink}" stroke-width="2"/>`,
    rock:`<path d="M${b.cx-12} ${top+6} l6 -10 l8 2 l4 8 Z" fill="#B9B2A6" ${s}/>`,
    ice:`<path d="M60 ${top-2} l-6 -12 l6 -8 l6 8 Z" fill="#CFF3FF" ${s}/>`,
    cloud:`<path d="M${b.cx-b.rx-4} ${b.cy+b.ry-4} a8 8 0 0 1 10 -10 a10 10 0 0 1 18 4 a7 7 0 0 1 -2 12 h-22 a6 6 0 0 1 -4 -6 Z" fill="#fff" ${s}/>`,
    moon:`<path d="M${b.cx+b.rx-2} ${top+2} a12 12 0 1 0 10 16 a9 9 0 1 1 -10 -16 Z" fill="#FFE27A" ${s}/>`,
    star: star(b.cx-b.rx+4, top+8, 8, "#FFD23F", ink),
    flower:`<g transform="translate(${b.cx-b.rx+10} ${top+8})"><circle r="4" cx="0" cy="-6" fill="#fff" ${s}/><circle r="4" cx="6" cy="0" fill="#fff" ${s}/><circle r="4" cx="0" cy="6" fill="#fff" ${s}/><circle r="4" cx="-6" cy="0" fill="#fff" ${s}/><circle r="3.5" fill="#FFD23F" ${s}/></g>`,
    shell:`<path d="M${b.cx-14} ${b.cy+6} a14 12 0 0 1 28 0 Z" fill="#FFE0DB" ${s}/>`,
    glow:`<circle cx="${b.cx}" cy="${b.cy+b.ry-6}" r="9" fill="#F7FF7A" ${s}/>`,
    rainbow:`<path d="M${b.cx-20} ${top+2} a20 18 0 0 1 40 0" fill="none" stroke="#FF6F61" stroke-width="4"/><path d="M${b.cx-15} ${top+2} a15 13 0 0 1 30 0" fill="none" stroke="#FFD23F" stroke-width="4"/><path d="M${b.cx-10} ${top+2} a10 8 0 0 1 20 0" fill="none" stroke="#5CC46E" stroke-width="4"/>`,
  };
  out += map[m.fx]||"";
  if(stage>=3){
    out += `<path d="M${b.cx-14} ${top-2} l4 -14 l6 8 l4 -12 l4 12 l6 -8 l4 14 Z" fill="#FFD23F" ${s}/>`;
    out = star(14,22,7,"#FFF3A0",ink)+star(106,30,6,"#FFF3A0",ink)+star(100,104,5,"#FFF3A0",ink)+out;
  }
  return out;
}
function draw(id, stage, opts){
  opts=opts||{};
  const m = M.find(x=>x.id===id) || M[0];
  if(stage===0) return egg(m, opts);
  const ink = m.ink||INK, sil = opts.silhouette;
  const c1 = sil?"#C9CFE6":m.c1, c2 = sil?"#C9CFE6":m.c2, K = sil?"#9AA3C7":ink;
  const b = bodyPath(m.shape);
  const sc = stage===1?0.78:stage===2?0.92:1.0;
  const eyeR = stage===1?6.5:5.5;
  const ey=b.cy-b.ry*0.18, ex=b.rx*0.38;
  let face = sil? `<text x="60" y="${b.cy+10}" text-anchor="middle" font-size="34" font-weight="800" fill="#fff" font-family="Baloo 2, sans-serif">?</text>` :
   `<circle cx="${b.cx-ex}" cy="${ey}" r="${eyeR}" fill="${INK}"/><circle cx="${b.cx+ex}" cy="${ey}" r="${eyeR}" fill="${INK}"/>
    <circle cx="${b.cx-ex+2}" cy="${ey-2.5}" r="2.2" fill="#fff"/><circle cx="${b.cx+ex+2}" cy="${ey-2.5}" r="2.2" fill="#fff"/>
    <ellipse cx="${b.cx-ex-6}" cy="${ey+10}" rx="5" ry="3" fill="#FF8FA3" opacity=".7"/><ellipse cx="${b.cx+ex+6}" cy="${ey+10}" rx="5" ry="3" fill="#FF8FA3" opacity=".7"/>
    <path d="M${b.cx-6} ${ey+9} q6 6 12 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
  const g = `${sil?"":tail(m,b,K,c1)}${ears(m,b,K,c1,c2,stage)}
    <ellipse cx="${b.cx}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}" fill="${c1}" stroke="${K}" stroke-width="3.5"/>
    <ellipse cx="${b.cx}" cy="${b.cy+b.ry*0.3}" rx="${b.rx*0.62}" ry="${b.ry*0.55}" fill="${c2}"/>
    <ellipse cx="${b.cx-b.rx*0.55}" cy="${b.cy+b.ry-2}" rx="9" ry="6" fill="${c1}" stroke="${K}" stroke-width="3"/>
    <ellipse cx="${b.cx+b.rx*0.55}" cy="${b.cy+b.ry-2}" rx="9" ry="6" fill="${c1}" stroke="${K}" stroke-width="3"/>
    ${face}${sil?"":stageExtra(m,b,K,stage)}`;
  return `<svg viewBox="0 0 120 120" class="mon" role="img" aria-label="${sil?"還沒遇到的怪獸":m.zh}"><ellipse cx="60" cy="112" rx="30" ry="5" fill="#24305E" opacity=".12"/><g transform="translate(60 112) scale(${sc}) translate(-60 -112)">${g}</g></svg>`;
}
function egg(m, opts){
  const sil=opts&&opts.silhouette;
  const c=sil?"#C9CFE6":m.c1;
  return `<svg viewBox="0 0 120 120" class="mon egg" role="img" aria-label="怪獸蛋"><ellipse cx="60" cy="112" rx="26" ry="5" fill="#24305E" opacity=".12"/>
  <path d="M60 18 C86 18 96 60 96 78 C96 98 80 110 60 110 C40 110 24 98 24 78 C24 60 34 18 60 18 Z" fill="#FFFDF5" stroke="${INK}" stroke-width="3.5"/>
  <circle cx="46" cy="56" r="8" fill="${c}"/><circle cx="72" cy="44" r="6" fill="${c}"/><circle cx="70" cy="82" r="10" fill="${c}"/><circle cx="44" cy="92" r="5" fill="${c}"/></svg>`;
}
window.MONSTERS = { list:M, draw, get:(id)=>M.find(x=>x.id===id) };
})();
