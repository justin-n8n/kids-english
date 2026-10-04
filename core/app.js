/* 單字怪獸冒險 — 共用遊戲引擎 */
(function(){
"use strict";
const D = window.GAME_DATA, CFG = window.GAME_CONFIG || {}, MON = window.MONSTERS;
const KID = D.kid, KEY = "ek_" + KID + "_v1";
const app = document.getElementById("app");
const W = {}; D.words.forEach(w => W[w.id] = w);
const G = {}; D.groups.forEach(g => G[g.id] = g);
const GROUPS_OF = {}; D.groups.forEach(g => g.words.forEach(id => (GROUPS_OF[id] = GROUPS_OF[id] || []).push(g.id)));
const GROUP_MON = {}; D.groups.forEach((g, i) => GROUP_MON[g.id] = MON.list[i % MON.list.length].id);
const STAR_MONS = MON.list.slice(D.groups.length, D.groups.length + (D.starMonCount || 8)).map(m => m.id);
const EGG_COST = 15, ROUND_N = 10;
const MIN = 60e3, DAY = 864e5;
const INTERVAL = [0, 10 * MIN, DAY, 2 * DAY, 4 * DAY, 7 * DAY];

/* ---------- state ---------- */
function blank(){ return { v:1, words:{}, stars:0, totalStars:0, starBank:0, sm:{}, gm:{}, partner:null, rounds:0,
  settings:{ slow:false, zy: !!D.zhuyinDefault }, queue:[], created: Date.now() }; }
let S;
try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "null") || {}); } catch(e){ S = blank(); }
S.settings = Object.assign({ slow:false, zy:!!D.zhuyinDefault }, S.settings || {});
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
function ws(id){ return S.words[id] || (S.words[id] = { lv:0, seen:0, right:0, wrong:0, streak:0, last:0, due:0, wb:false }); }
const peek = id => S.words[id] || { lv:0, seen:0, right:0, wrong:0, streak:0, last:0, due:0, wb:false };
const learned = id => peek(id).lv >= 3;

/* ---------- utils ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const uniq = a => [...new Set(a)];
const pad = n => String(n).padStart(2, "0");
const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const stamp = () => { const d = new Date(); return ymd(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()); };
function fmtZy(r){ return r.endsWith("˙") ? "˙" + r.slice(0, -1) : r; }
function zy(arr){ return (arr || []).map(([c, r]) => r ? `<ruby>${esc(c)}<rt>${fmtZy(r)}</rt></ruby>` : esc(c)).join(""); }
const zhPlain = arr => (arr || []).map(x => x[0]).join("");
const ttsText = w => (w.en || w).replace(/3D/g, "3 D").replace(/___/g, "blank");
function $(sel, root){ return (root || app).querySelector(sel); }
function $$(sel, root){ return [...(root || app).querySelectorAll(sel)]; }
function on(sel, fn){ $$(sel).forEach(el => el.addEventListener("click", e => fn(el, e))); }
function toast(msg){ const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
function applySettings(){ document.body.classList.toggle("zy-off", !S.settings.zy); }

/* ---------- speech & sound ---------- */
const hasTTS = "speechSynthesis" in window;
let voice = null;
function pickVoice(){ if (!hasTTS) return; const vs = speechSynthesis.getVoices();
  voice = vs.find(v => /en[-_]US/i.test(v.lang) && /google/i.test(v.name)) || vs.find(v => /en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; }
if (hasTTS) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speakSeq(list){ if (!hasTTS) return; speechSynthesis.cancel();
  list.forEach(([text, slow]) => { const u = new SpeechSynthesisUtterance(ttsText(text)); u.lang = "en-US"; if (voice) u.voice = voice;
    u.rate = slow ? 0.55 : (S.settings.slow ? 0.72 : 0.92); speechSynthesis.speak(u); }); }
const speak = (t, slow) => speakSeq([[t, !!slow]]);
let actx = null;
function beep(notes, dur){ try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t0 = actx.currentTime;
  notes.forEach((f, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + i * dur); g.gain.exponentialRampToValueAtTime(0.25, t0 + i * dur + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * dur);
    o.connect(g); g.connect(actx.destination); o.start(t0 + i * dur); o.stop(t0 + (i + 1) * dur + 0.05); }); } catch(e){} }
const sfx = { good: () => beep([660, 880], 0.11), soft: () => beep([330, 262], 0.14), hatch: () => beep([523, 659, 784, 1047], 0.13) };

/* ---------- weeks (瑄瑄) ---------- */
function weekInfo(){
  if (!D.groups[0].start) return null;
  const t = new Date(); t.setDate(t.getDate() + 2); const ts = ymd(t);      // 週六日算下一週
  let idx = 0; D.groups.forEach((g, i) => { if (g.start <= ts) idx = i; });
  return { cur: D.groups[idx], test: idx > 0 ? D.groups[idx - 1] : null, idx };
}
function prioIds(){ const w = weekInfo(); if (!w) return new Set(); return new Set([...(w.test ? w.test.words : []), ...w.cur.words]); }
function unseenOrder(){
  const all = D.words.map(w => w.id); let order = all;
  const w = weekInfo();
  if (w) { const gs = D.groups, ti = w.test ? w.idx - 1 : w.idx;
    order = uniq([...(w.test ? w.test.words : []), ...w.cur.words, ...gs.slice(0, Math.max(0, ti)).flatMap(g => g.words), ...gs.slice(w.idx + 1).flatMap(g => g.words), ...all]); }
  return order.filter(id => peek(id).seen === 0);
}

/* ---------- question selection ---------- */
function selectIds(n, filter){
  filter = filter || (() => true);
  const now = Date.now(), prio = prioIds();
  const all = D.words.map(w => w.id).filter(filter);
  const seen = all.filter(id => peek(id).seen > 0);
  const unseen = unseenOrder().filter(filter);
  const wb = seen.filter(id => peek(id).wb).sort((a, b) => peek(a).lv - peek(b).lv || peek(a).last - peek(b).last);
  const due = seen.filter(id => !peek(id).wb && peek(id).lv < 5 && peek(id).due <= now)
                  .sort((a, b) => (peek(a).due - (prio.has(a) ? DAY : 0)) - (peek(b).due - (prio.has(b) ? DAY : 0)));
  const mastered = shuffle(seen.filter(id => peek(id).lv >= 4));
  const picks = [];
  const add = (arr, k) => { for (const id of arr) { if (picks.length >= n || k <= 0) break; if (!picks.includes(id)) { picks.push(id); k--; } } };
  add(wb, 4);
  const nNew = wb.length >= 6 ? 1 : Math.min(5, 3 + Math.max(0, 2 - wb.length));
  add(unseen, nNew);
  add(due, 2);
  add(mastered, 1);
  add(shuffle(seen).sort((a, b) => (prio.has(b) - prio.has(a)) || (peek(a).lv - peek(b).lv)), n);
  add(unseen, n);
  add(shuffle(all), n);
  return shuffle(picks);
}
const isAlpha = s => /^[A-Za-z]+$/.test(s);
const hasCloze = w => w.ex && new RegExp("\\b" + w.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(w.ex);
const dialogQ = id => D.words.find(q => q.type === "phrase" && (q.answers || []).includes(W[id].en));
function chooseType(id, challenge){
  const w = W[id], lv = peek(id).lv;
  if (w.type === "phrase") {
    const dq = dialogQ(id) ? "dialog" : "listenzh";
    if (challenge) return pick(["zh2en", "situ", dq, "order"]);
    return [ "intro", "situ", dq, "order" ][lv] || pick(["situ", "order", dq]);
  }
  const ph = !!w.phonics, spellOK = D.spellKeyboard && isAlpha(w.en);
  if (challenge) return lv >= 3 ? (spellOK && lv >= 4 ? "keyboard" : "tiles") : pick(["zh2en", "listen"]);
  if (lv === 0) return "intro";
  if (lv === 1) return pick(ph ? ["phonics", "listen", "zh2en"] : ["zh2en", "listen"]);
  if (lv === 2) return pick(["en2zh", hasCloze(w) ? "cloze" : "zh2en"].concat(ph ? ["phonics"] : []));
  if (lv === 3) return "tiles";
  return spellOK ? "keyboard" : pick(["tiles", "listen6"]);
}

/* ---------- options ---------- */
function distract(id, n, field){
  const w = W[id], same = new Set(GROUPS_OF[id] || []);
  const key = x => field === "zh" ? zhPlain(x.zh) : x.en.toLowerCase();
  const pool = D.words.filter(x => x.id !== id && x.type === w.type && key(x) !== key(w) && !(field === "dialog" && ((dialogQ(id).answers || []).includes(x.en) || x.en === dialogQ(id).en)));
  const near = shuffle(pool.filter(x => (GROUPS_OF[x.id] || []).some(g => same.has(g))));
  const far = shuffle(pool.filter(x => !near.includes(x)));
  const out = [], seenK = new Set([key(w)]);
  for (const x of near.concat(far)) { if (out.length >= n) break; if (!seenK.has(key(x))) { seenK.add(key(x)); out.push(x); } }
  return out;
}

/* ---------- round runner ---------- */
let R = null;
function startRound(mode, opt){
  opt = opt || {};
  let items;
  if (mode === "challenge") {
    const ids = shuffle(uniq(G[opt.gid].words)).slice(0, 15);
    items = ids.map(id => ({ id, type: chooseType(id, true) }));
  } else if (mode === "free") {
    const f = FREE[opt.kind];
    if (f.match) return startMatch(selectIds(6, f.filter), true);
    items = selectIds(ROUND_N, f.filter).map(id => ({ id, type: f.type(id) }));
  } else {
    items = selectIds(ROUND_N).map(id => ({ id, type: chooseType(id, false) }));
  }
  R = { mode, kind: opt.kind || "", gid: opt.gid || "", items, i: 0, res: [], t0: Date.now(), touched: new Set(), retry: false, starsWon: 0 };
  pushScreen();
  S.rounds++;
  const seenIds = items.map(x => x.id).filter(id => peek(id).seen > 0);
  if (mode === "adventure" && S.rounds % 3 === 0 && seenIds.length >= 4) return startMatch(seenIds.slice(0, 4), false);
  renderQ();
}
function qbar(){
  const dots = R.items.map((_, k) => `<i class="${k < R.res.length ? (R.res[k].ok ? "ok" : "no") : (k === R.i ? "cur" : "")}"></i>`).join("");
  const tag = R.mode === "challenge" ? `<span class="pill">⚔️ 道館挑戰</span>` : "";
  return `<div class="qbar"><button class="btn small" data-home aria-label="回首頁">🏠</button>${tag}<div class="dots">${dots}</div>${settingsBtns()}</div>`;
}
function bindCommon(){ on("[data-home]", () => { hasTTS && speechSynthesis.cancel(); finishRound(true); }); bindSettings(); }
function speakBtns(text){ return hasTTS ? `<div class="speak-row"><button class="btn speak sky" data-say="${esc(text)}" aria-label="發音">🔊</button><button class="btn speak slow" data-say-slow="${esc(text)}" aria-label="慢速發音">🐢</button></div>` : ""; }
function bindSpeak(){ on("[data-say]", el => speak(el.dataset.say)); on("[data-say-slow]", el => speak(el.dataset.saySlow, true)); }

function renderQ(){
  const it = R.items[R.i], w = W[it.id];
  const T = QT[it.type] || QT.zh2en;
  app.innerHTML = qbar() + `<div class="qcard">${T.html(w, it)}<div class="feedback" id="fb"></div><div id="after"></div></div>`;
  bindCommon(); bindSpeak();
  T.bind && T.bind(w, it);
}
function answer(ok, opt){
  opt = opt || {};
  const it = R.items[R.i], w = W[it.id], fb = $("#fb"), after = $("#after");
  if (R.retry) {
    if (ok) { sfx.good(); fb.className = "feedback good"; fb.textContent = "對了！"; speak(w.en); setTimeout(next, 900); }
    else { fb.className = "feedback try"; fb.innerHTML = `答案是 <span class="en">${esc(w.en)}</span>，下一題加油！`; speak(w.en); setTimeout(next, 1800); }
    return;
  }
  R.res.push({ id: it.id, ok });
  updateWord(it.id, ok);
  if (ok) {
    sfx.good(); S.stars++; S.totalStars++; S.starBank++; R.starsWon++;
    fb.className = "feedback good"; fb.textContent = pick(["答對了！⭐", "好棒！⭐", "太厲害了！⭐", "Great! ⭐", "Good job! ⭐"]);
    if (opt.sayAfter !== false) speak(opt.say || w.en);
    after.innerHTML = `<button class="btn primary" data-next style="margin-top:12px">下一題</button>`;
    on("[data-next]", next); R._auto = setTimeout(next, opt.sentence ? 2600 : 1500);
  } else {
    sfx.soft(); fb.className = "feedback try";
    fb.innerHTML = `正確答案是：<span class="en">${esc(w.en)}</span>` + (w.zh ? `　${zy(w.zh)}` : "");
    speak(opt.say || w.en);
    if (R.mode === "challenge") { after.innerHTML = `<button class="btn primary" data-next style="margin-top:12px">下一題</button>`; on("[data-next]", next); }
    else { after.innerHTML = `<button class="btn sun" data-retry style="margin-top:12px">🔁 再試一次</button>`;
      on("[data-retry]", () => { R.retry = true; renderQ(); }); }
  }
  save();
}
function next(){ clearTimeout(R._auto); R.retry = false; R.i++; if (R.i >= R.items.length) finishRound(false); else renderQ(); }
function updateWord(id, ok){
  const s = ws(id), now = Date.now(); s.seen++; s.last = now;
  if (ok) { s.right++; s.streak++; s.lv = Math.min(5, s.lv + 1); if (s.wb && s.streak >= 2) s.wb = false; }
  else { s.wrong++; s.streak = 0; s.lv = Math.max(0, s.lv - 1); s.wb = true; }
  s.due = now + INTERVAL[s.lv]; R.touched.add(id);
}

/* ---------- question types ---------- */
function optsHTML(list, cls){ return `<div class="opts">${list.map((o, k) => `<button class="btn opt ${cls || ""}" data-k="${k}">${o.label}</button>`).join("")}</div>`; }
function makeOpts(w, field, n){
  const ds = distract(w.id, (n || 4) - 1, field);
  const label = x => field === "zh" ? zy(x.zh) : esc(x.en);
  return shuffle([{ label: label(w), ok: true, x: w }, ...ds.map(x => ({ label: label(x), ok: false, x }))]);
}
function bindOpts(list, opt){
  on(".opt", el => { if (el.dataset.done) return; const o = list[+el.dataset.k];
    $$(".opt").forEach(b => { b.dataset.done = 1; const oo = list[+b.dataset.k]; if (oo.ok) b.classList.add("right"); else if (b === el) b.classList.add("wrong"); else b.classList.add("dim"); });
    answer(o.ok, opt); });
}
const QT = {
  intro: {
    html: w => `<div class="ask">✨ 新的${w.type === "phrase" ? "句子" : "單字"}！</div>
      <div class="word-big">${esc(w.en)}</div>${speakBtns(w.en)}<div class="zh-big">${zy(w.zh)}</div>
      ${w.ex ? `<div class="sent">${esc(w.ex)}</div><div class="sent-zh">${zy(w.exzh)}</div>
      ${hasTTS ? `<button class="btn small sky" data-say="${esc(w.ex)}">🔊 聽例句</button>` : ""}` : ""}
      ${w.situ ? `<div class="sent-zh" style="margin-top:8px">💡 ${zy(w.situ)} <b class="en">${esc(w.en)}</b></div>` : ""}
      <div style="margin-top:18px"><button class="btn primary" data-go style="min-width:240px">我記住了！ 👉</button></div>`,
    bind: (w, it) => { speakSeq([[w.en], [w.en, true]]); on("[data-go]", () => { it.type = w.type === "phrase" ? "zh2en" : "listen"; renderQ(); }); }
  },
  listen: {
    html: (w, it) => { it._o = makeOpts(w, "en", it.type === "listen6" ? 6 : 4); return `<div class="ask">👂 聽一聽，是哪個字？</div>${speakBtns(w.en)}${optsHTML(it._o, "en")}`; },
    bind: (w, it) => { speak(w.en); bindOpts(it._o); }
  },
  zh2en: {
    html: (w, it) => { it._o = makeOpts(w, "en"); return `<div class="ask">👀 這是哪個英文？</div><div class="zh-big">${zy(w.zh)}</div>${optsHTML(it._o, w.type === "phrase" ? "en sm" : "en")}`; },
    bind: (w, it) => bindOpts(it._o)
  },
  en2zh: {
    html: (w, it) => { it._o = makeOpts(w, "zh"); return `<div class="ask">🤔 這個字是什麼意思？</div><div class="word-big">${esc(w.en)}</div>${speakBtns(w.en)}${optsHTML(it._o)}`; },
    bind: (w, it) => { speak(w.en); bindOpts(it._o); }
  },
  cloze: {
    html: (w, it) => { it._o = makeOpts(w, "en");
      const re = new RegExp("\\b" + w.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
      const s = esc(w.ex).replace(re, `<span class="blank">　?　</span>`);
      return `<div class="ask">📖 句子裡缺了哪個字？</div><div class="sent">${s}</div><div class="sent-zh">${zy(w.exzh)}</div>${optsHTML(it._o, "en")}`; },
    bind: (w, it) => bindOpts(it._o, { say: w.ex, sentence: true })
  },
  phonics: {
    html: (w, it) => { const L = w.en[0].toLowerCase(); const letters = shuffle([L, ...shuffle("abcdefghijklmnopqrstuvwxyz".split("").filter(c => c !== L)).slice(0, 3)]);
      it._o = letters.map(c => ({ label: c.toUpperCase() + " " + c, ok: c === L }));
      return `<div class="ask">🔤 聽一聽，第一個字母是？</div>${speakBtns(w.en)}${optsHTML(it._o, "en")}`; },
    bind: (w, it) => { speak(w.en); bindOpts(it._o); }
  },
  situ: {
    html: (w, it) => { it._o = makeOpts(w, "en"); return `<div class="ask">💬 這時候要說什麼？</div><div class="sent-zh" style="font-size:28px">${zy(w.situ)}</div>${optsHTML(it._o, "en sm")}`; },
    bind: (w, it) => bindOpts(it._o)
  },
  dialog: {
    html: (w, it) => { const q = dialogQ(w.id); it._q = q; it._o = makeOpts(w, "dialog");
      return `<div class="ask">🗣️ 朋友問你：</div><div class="sent" style="font-size:36px">${esc(q.en)}</div>${speakBtns(q.en)}<div class="ask">要怎麼回答？</div>${optsHTML(it._o, "en sm")}`; },
    bind: (w, it) => { speak(it._q.en); bindOpts(it._o); }
  },
  listenzh: {
    html: (w, it) => { it._o = makeOpts(w, "zh"); return `<div class="ask">👂 聽一聽，是什麼意思？</div>${speakBtns(w.en)}${optsHTML(it._o)}`; },
    bind: (w, it) => { speak(w.en); bindOpts(it._o); }
  },
  tiles: {
    html: (w, it) => {
      const chars = [...w.en.toLowerCase()];
      const letters = chars.filter(c => /[a-z0-9]/.test(c));
      const extra = peek(w.id).lv >= 4 ? 3 : 2;
      const pool = shuffle([...letters, ...shuffle("abcdefghijklmnopqrstuvwxyz".split("").filter(c => !letters.includes(c))).slice(0, extra)]);
      it._chars = chars; it._pool = pool; it._fill = []; it._lock = false;
      return `<div class="ask">🐝 拼拼看！</div><div class="zh-big">${zy(w.zh)}</div>${speakBtns(w.en)}
        <div class="slots" id="slots"></div><div class="tiles">${pool.map((c, k) => `<button class="btn tile" data-t="${k}">${esc(c)}</button>`).join("")}</div>
        <div style="margin-top:12px"><button class="btn small" data-clear>↩️ 清除</button></div>`;
    },
    bind: (w, it) => {
      speakSeq([[w.en], [w.en, true]]);
      const draw = () => { let k = 0; $("#slots").innerHTML = it._chars.map(c => /[a-z0-9]/.test(c)
          ? (() => { const f = it._fill[k++]; return `<div class="slot ${f != null ? "filled" : ""}" data-s="${k - 1}">${f != null ? esc(it._pool[f]) : ""}</div>`; })()
          : `<div class="slot fixed">${c === " " ? "" : esc(c)}</div>`).join("");
        $$(".tile").forEach(b => b.classList.toggle("used", it._fill.includes(+b.dataset.t)));
        $$("[data-s]").forEach(s => s.onclick = () => { if (it._lock) return; it._fill.splice(+s.dataset.s, 1); draw(); }); };
      const need = it._chars.filter(c => /[a-z0-9]/.test(c)).length;
      on(".tile", b => { if (it._lock || it._fill.includes(+b.dataset.t) || it._fill.length >= need) return; it._fill.push(+b.dataset.t); draw();
        if (it._fill.length === need) check(); });
      on("[data-clear]", () => { if (!it._lock) { it._fill = []; draw(); } });
      const check = () => { it._lock = true; const typed = it._fill.map(f => it._pool[f]).join(""), target = it._chars.filter(c => /[a-z0-9]/.test(c)).join("");
        const ok = typed === target; $$(".slot:not(.fixed)").forEach(s => s.classList.add(ok ? "ok" : "no"));
        if (!ok) $("#slots").insertAdjacentHTML("afterend", `<div class="answer-show">${esc(w.en)}</div>`);
        answer(ok); };
      draw();
    }
  },
  keyboard: {
    html: (w, it) => { it._typed = ""; it._lock = false;
      const keys = "abcdefghijklmnopqrstuvwxyz".split("");
      return `<div class="ask">🐝 Spelling Bee！聽發音拼出來</div><div class="zh-big">${zy(w.zh)}</div>${speakBtns(w.en)}
        <div class="slots" id="slots"></div>
        <div class="kbd">${keys.map(c => `<button class="btn key" data-key="${c}">${c}</button>`).join("")}<button class="btn key wide" data-back>⌫ 刪除</button></div>`; },
    bind: (w, it) => {
      speakSeq([[w.en], [w.en, true]]);
      const target = w.en.toLowerCase();
      const draw = () => { $("#slots").innerHTML = [...target].map((_, k) => `<div class="slot ${it._typed[k] ? "filled" : ""}">${esc(it._typed[k] || "")}</div>`).join(""); };
      on("[data-key]", b => { if (it._lock || it._typed.length >= target.length) return; it._typed += b.dataset.key; draw();
        if (it._typed.length === target.length) { it._lock = true; const ok = it._typed === target;
          $$(".slot").forEach((s, k) => s.classList.add(it._typed[k] === target[k] ? "ok" : "no"));
          if (!ok) $("#slots").insertAdjacentHTML("afterend", `<div class="answer-show">${esc(w.en)}</div>`);
          answer(ok); } });
      on("[data-back]", () => { if (!it._lock) { it._typed = it._typed.slice(0, -1); draw(); } });
      draw();
    }
  },
  order: {
    html: (w, it) => { it._words = w.en.split(" "); it._pool = shuffle(it._words.map((t, k) => ({ t, k }))); it._built = []; it._lock = false;
      return `<div class="ask">🧩 把句子排好</div><div class="zh-big" style="font-size:34px">${zy(w.zh)}</div>${speakBtns(w.en)}
        <div class="built" id="built"></div><div class="tiles" id="pool"></div>`; },
    bind: (w, it) => {
      const draw = () => {
        $("#built").innerHTML = it._built.map((p, k) => `<button class="btn chip" data-b="${k}">${esc(p.t)}</button>`).join("") || `<span class="muted">點下面的字卡</span>`;
        $("#pool").innerHTML = it._pool.map((p, k) => it._built.includes(p) ? "" : `<button class="btn chip" data-p="${k}">${esc(p.t)}</button>`).join("");
        $$("[data-p]").forEach(b => b.onclick = () => { if (it._lock) return; it._built.push(it._pool[+b.dataset.p]); draw(); if (it._built.length === it._words.length) check(); });
        $$("[data-b]").forEach(b => b.onclick = () => { if (it._lock) return; it._built.splice(+b.dataset.b, 1); draw(); });
      };
      const check = () => { it._lock = true; const ok = it._built.map(p => p.t).join(" ") === w.en; if (!ok) $("#built").insertAdjacentHTML("afterend", `<div class="answer-show" style="font-size:30px">${esc(w.en)}</div>`); answer(ok); };
      draw();
    }
  },
};
QT.listen6 = QT.listen;

/* ---------- match (翻牌配對) ---------- */
function startMatch(ids, standalone){
  if (standalone) { pushScreen(); R = { mode: "free", kind: "match", items: [], res: [], i: 0, t0: Date.now(), touched: new Set(), starsWon: 0 }; }
  ids = ids.slice(0, standalone ? 6 : 4);
  const cards = shuffle(ids.flatMap(id => [{ id, side: "en" }, { id, side: "zh" }]));
  let open = [], done = new Set(), tries = 0;
  const render = () => {
    app.innerHTML = `<div class="qbar"><button class="btn small" data-home>🏠</button><span class="pill">🃏 ${standalone ? "翻牌配對" : "暖身：翻牌配對"}</span><div class="dots"></div>${settingsBtns()}</div>
      <div class="qcard"><div class="ask">把英文和中文配成一對！</div><div class="match">${cards.map((c, k) => {
        const isOpen = open.includes(k) || done.has(c.id); const w = W[c.id];
        return `<button class="btn mcard ${isOpen ? "open" : ""} ${done.has(c.id) ? "done" : ""} ${c.side === "en" && isOpen ? "en" : ""}" data-c="${k}">${isOpen ? (c.side === "en" ? esc(w.en) : zy(w.zh)) : "❓"}</button>`; }).join("")}</div>
      <div class="feedback" id="fb"></div></div>`;
    bindCommon();
    on("[data-c]", el => { const k = +el.dataset.c; if (open.length >= 2 || open.includes(k) || done.has(cards[k].id)) return;
      open.push(k); if (cards[k].side === "en") speak(W[cards[k].id].en); render();
      if (open.length === 2) { tries++; const [a, b] = open.map(x => cards[x]);
        setTimeout(() => { if (a.id === b.id) { done.add(a.id); sfx.good(); } open = []; render();
          if (done.size === ids.length) { const fb = $("#fb"); fb.className = "feedback good"; fb.textContent = "全部配對成功！⭐";
            S.stars++; S.totalStars++; S.starBank++; R.starsWon++; save();
            setTimeout(() => standalone ? finishRound(false) : renderQ(), 1300); } }, a.id === b.id ? 450 : 1000); } });
  };
  render();
}

/* ---------- free practice ---------- */
const isWord = id => W[id].type === "word";
const FREE = D.kid === "annie" ? {
  spell:  { ic: "🐝", name: "聽音拼字", filter: isWord, type: id => peek(id).lv >= 4 ? "keyboard" : "tiles" },
  zh2en:  { ic: "👀", name: "看中文選英文", filter: isWord, type: () => "zh2en" },
  match:  { ic: "🃏", name: "翻牌配對", match: true, filter: isWord },
  cloze:  { ic: "📖", name: "例句練習", filter: id => hasCloze(W[id]), type: () => "cloze" },
} : {
  zh2en:  { ic: "👀", name: "看中文選英文", filter: isWord, type: () => "zh2en" },
  listen: { ic: "👂", name: "聽音選字", filter: isWord, type: () => "listen" },
  phonics:{ ic: "🔤", name: "Phonics 字母音", filter: id => W[id].phonics, type: () => "phonics" },
  talk:   { ic: "💬", name: "句型對話", filter: id => W[id].type === "phrase", type: id => pick(["situ", dialogQ(id) ? "dialog" : "order", "order"]) },
  cloze:  { ic: "📖", name: "例句練習", filter: id => isWord(id) && hasCloze(W[id]), type: () => "cloze" },
  spell:  { ic: "🐝", name: "拼字", filter: id => isWord(id), type: () => "tiles" },
  match:  { ic: "🃏", name: "翻牌配對", match: true, filter: isWord },
};

/* ---------- rewards ---------- */
function groupStats(g){ const ids = uniq(g.words); const L = ids.filter(learned).length, seen = ids.filter(id => peek(id).seen > 0).length;
  return { n: ids.length, L, seen, frac: L / ids.length, top: ids.every(id => peek(id).lv >= 4) }; }
function groupStage(g){ const st = groupStats(g), gm = S.gm[g.id] || {};
  if (gm.passed && st.top) return 3; if (gm.passed) return 2; if (st.frac >= 0.5) return 1; if (st.seen > 0) return 0; return -1; }
const canChallenge = g => groupStats(g).frac >= 0.8;
function checkRewards(){
  const ev = [];
  D.groups.forEach(g => { const gm = S.gm[g.id] = S.gm[g.id] || { stage: -1 }; const st = groupStage(g);
    if (st > gm.stage) { if (st >= 1) ev.push({ mon: GROUP_MON[g.id], stage: st, title: st === 1 ? "孵出來了！" : "進化了！", sub: g.name + " 的守護怪獸" });
      if (st >= 1 && !S.partner) S.partner = GROUP_MON[g.id]; gm.stage = st; } });
  while (S.starBank >= EGG_COST) { const left = STAR_MONS.filter(id => !S.sm[id]); if (!left.length) break;
    S.starBank -= EGG_COST; const id = pick(left); S.sm[id] = { stage: 1, at: S.totalStars }; S.partner = id;
    ev.push({ mon: id, stage: 1, title: "蛋孵出來了！", sub: "集滿 " + EGG_COST + " 顆星星的獎勵" }); }
  Object.entries(S.sm).forEach(([id, m]) => { const want = S.totalStars - m.at >= 100 ? 3 : S.totalStars - m.at >= 40 ? 2 : 1;
    if (want > m.stage) { m.stage = want; ev.push({ mon: id, stage: want, title: "進化了！", sub: "一直答對題目，牠長大了" }); } });
  save(); return ev;
}
function showEvents(ev, done){
  if (!ev.length) return done && done();
  const e = ev.shift(), m = MON.get(e.mon); sfx.hatch();
  const ov = document.createElement("div"); ov.className = "overlay";
  ov.innerHTML = `<div class="box"><div class="wobble" style="display:inline-block">${MON.draw(e.mon, 0)}</div></div>`;
  document.body.appendChild(ov);
  setTimeout(() => { ov.innerHTML = `<div class="box pop"><h2 style="margin:0">🎉 ${esc(m.zh)} ${esc(e.title)}</h2>${MON.draw(e.mon, e.stage)}
    <div style="font-size:28px;font-weight:800"><span class="en">${esc(m.en)}</span>　${esc(m.zh)}</div><div class="muted">${esc(e.sub)}${e.stage > 1 ? "（第 " + e.stage + " 階段）" : ""}</div>
    <button class="btn primary" style="margin-top:14px;min-width:200px" data-ok>好耶！</button></div>`;
    speak(m.en); ov.querySelector("[data-ok]").onclick = () => { ov.remove(); showEvents(ev, done); }; }, 1500);
}

/* ---------- finish & records ---------- */
function finishRound(quit){
  if (!R) return renderHome();
  clearTimeout(R._auto);
  const total = R.res.length, correct = R.res.filter(r => r.ok).length;
  if (total > 0 || (R.kind === "match" && !quit)) record(total, correct);
  if (quit) { R = null; return renderHome(); }
  const wrong = uniq(R.res.filter(r => !r.ok).map(r => r.id));
  let challengeMsg = "";
  if (R.mode === "challenge") { const pass = correct / Math.max(1, total) >= 0.8;
    const ok = uniq(R.res.filter(r => r.ok).map(r => r.id)).filter(id => !wrong.includes(id));
    if (pass) { S.gm[R.gid] = S.gm[R.gid] || { stage: -1 }; S.gm[R.gid].passed = true; }
    S.starBank += EGG_COST;   // 道館挑戰一定送一顆蛋
    challengeMsg = `<div style="font-size:26px;font-weight:800;margin:8px 0">✅ 學會 ${ok.length} 個　💪 再練 ${wrong.length} 個</div>
      <div class="muted">${pass ? "道館挑戰成功！守護怪獸要進化了！" : "已經很棒了！再多練幾回就能讓守護怪獸進化。"} 🥚 送你一顆蛋！</div>`; }
  const ev = checkRewards();
  const seenN = D.words.filter(w => peek(w.id).seen > 0).length, LN = D.words.filter(w => learned(w.id)).length;
  app.innerHTML = `<div class="topbar"><div class="title">🐾 ${esc(D.title)}</div>${settingsBtns()}</div>
    <div class="qcard result center">
      ${S.partner ? `<div class="partner">${MON.draw(S.partner, S.sm[S.partner] ? S.sm[S.partner].stage : Math.max(1, (S.gm[Object.keys(GROUP_MON).find(g => GROUP_MON[g] === S.partner)] || {}).stage || 1))}</div>` : ""}
      <div class="bigstar">⭐ +${R.starsWon}</div>
      ${total ? `<div style="font-size:26px;font-weight:800">答對 ${correct} / ${total} 題</div>` : ""}
      ${challengeMsg}
      ${wrong.length ? `<div class="muted" style="margin-top:10px">這些字下一回會再出現，多練幾次就會了：</div><div class="list-words">${wrong.map(id => `<span>${esc(W[id].en)}</span>`).join("")}</div>` : (total ? `<div style="font-size:22px;margin-top:8px">全部答對，太厲害了！🎉</div>` : "")}
      <div class="muted" style="margin-top:8px">已經認識 ${seenN} / ${D.words.length} 個　學會了 ${LN} 個</div>
      <div class="row-btns"><button class="btn primary go" data-again style="font-size:30px;min-height:84px">⚡ 再一回</button><button class="btn" data-home2>🏠 回首頁</button></div>
    </div>`;
  bindSettings();
  const again = R.mode === "free" ? () => startRound("free", { kind: R.kind }) : () => startRound("adventure");
  R = null;
  on("[data-again]", again); on("[data-home2]", renderHome);
  setTimeout(() => showEvents(ev), 400);
}
function record(total, correct){
  const modeName = R.mode === "challenge" ? "道館挑戰" : R.mode === "free" ? "自由練習：" + (FREE[R.kind] ? FREE[R.kind].name : R.kind) : "冒險";
  const rec = { kid: D.name, time: stamp(), date: ymd(new Date()), mode: modeName, group: R.gid ? G[R.gid].name : "",
    total, correct, seconds: Math.round((Date.now() - R.t0) / 1000),
    wrong: uniq(R.res.filter(r => !r.ok).map(r => W[r.id].en)).join(", "),
    seenCount: D.words.filter(w => peek(w.id).seen > 0).length, learnedCount: D.words.filter(w => learned(w.id)).length,
    totalWords: D.words.length, stars: S.totalStars };
  const words = [...R.touched].map(id => { const s = peek(id), w = W[id];
    return { id, en: w.en, zh: zhPlain(w.zh), group: (GROUPS_OF[id] || []).map(g => G[g].name).join("、"), level: s.lv,
      seen: s.seen, right: s.right, wrong: s.wrong, learned: s.lv >= 3 ? "✅" : "", wrongBook: s.wb ? "📕" : "", last: stamp() }; });
  S.queue.push({ kid: D.kid, name: D.name, round: rec, words });
  if (S.queue.length > 300) S.queue = S.queue.slice(-300);
  save(); flush();
}
let flushing = false;
async function flush(){
  if (flushing || !CFG.endpoint || !navigator.onLine || !S.queue.length) return;
  flushing = true;
  try { while (S.queue.length) { await fetch(CFG.endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(S.queue[0]) });
      S.queue.shift(); save(); } } catch(e){} finally { flushing = false; }
}
window.addEventListener("online", flush);

/* ---------- settings buttons ---------- */
function settingsBtns(){
  return `<button class="btn toggle ${S.settings.slow ? "on" : ""}" data-set="slow" aria-label="語音速度">${S.settings.slow ? "🐢" : "🐇"}<span class="lbl">${S.settings.slow ? "慢速" : "正常"}</span></button>
    <button class="btn toggle ${S.settings.zy ? "on" : ""}" data-set="zy" aria-label="注音">ㄅ<span class="lbl">${S.settings.zy ? "注音開" : "注音關"}</span></button>`;
}
function bindSettings(){ on("[data-set]", el => { const k = el.dataset.set; S.settings[k] = !S.settings[k]; save(); applySettings();
  el.classList.toggle("on", S.settings[k]);
  el.innerHTML = k === "slow" ? `${S.settings.slow ? "🐢" : "🐇"}<span class="lbl">${S.settings.slow ? "慢速" : "正常"}</span>` : `ㄅ<span class="lbl">${S.settings.zy ? "注音開" : "注音關"}</span>`;
  if (k === "slow") speak("Hello!"); }); }

/* ---------- screens ---------- */
function pushScreen(){ try { history.pushState({ s: 1 }, ""); } catch(e){} }
window.addEventListener("popstate", () => { if (R) { R = null; } renderHome(); });
function partnerHTML(){
  const id = S.partner; let st = 0;
  if (id) st = S.sm[id] ? S.sm[id].stage : Math.max(0, (S.gm[Object.keys(GROUP_MON).find(g => GROUP_MON[g] === id)] || {}).stage || 0);
  if (!id || st < 1) return `<div class="partner">${MON.draw(GROUP_MON[D.groups[0].id], 0)}<div class="name">答對題目，蛋就會孵出來！</div></div>`;
  const m = MON.get(id); return `<div class="partner">${MON.draw(id, st)}<div class="name"><span class="en">${esc(m.en)}</span>${esc(m.zh)}</div></div>`;
}
function renderHome(){
  R = null; applySettings();
  const seenN = D.words.filter(w => peek(w.id).seen > 0).length, LN = D.words.filter(w => learned(w.id)).length, N = D.words.length;
  const wk = weekInfo(), prio = prioIds();
  const ready = D.groups.filter(g => canChallenge(g) && !(S.gm[g.id] || {}).passed);
  const eggLeft = EGG_COST - (S.starBank % EGG_COST);
  app.innerHTML = `<div class="topbar"><div class="title">🐾 ${esc(D.title)}</div><span class="pill">⭐ ${S.stars}</span>${settingsBtns()}</div>
    <section class="hero">
      ${partnerHTML()}
      <div>
        <div style="font-size:22px;font-weight:800">${esc(D.name)}，今天也來冒險吧！</div>
        <div class="meter" aria-label="認識的單字"><i style="width:${Math.round(seenN / N * 100)}%"></i></div>
        <div class="muted">已經認識 ${seenN} / ${N} 個　學會了 ${LN} 個　🥚 再 ${eggLeft} ⭐ 孵一顆蛋</div>
        ${wk ? `<div class="week-box"><div>📝 這週要考<b>${wk.test ? esc(wk.test.name) : "—"}</b>${wk.test ? esc(wk.test.title) : ""}</div><div>📒 這週新作業<b>${esc(wk.cur.name)}</b>${esc(wk.cur.title)}</div></div>` : ""}
        <div style="margin-top:16px"><button class="btn primary go" data-go>⚡ 開始冒險</button></div>
      </div>
    </section>
    <div class="row-btns">
      <button class="btn" data-free>🎯 自由練習</button>
      <button class="btn" data-dex>📖 我的圖鑑</button>
      ${ready.length ? `<button class="btn sun" data-chal="${ready[0].id}">⚔️ 道館挑戰：${esc(ready[0].name)}</button>` : ""}
    </div>
    <h2>${wk ? "🏟️ 每週道館" : "🗺️ 冒險地圖"}</h2>
    <div class="groups">${D.groups.map(g => { const st = groupStats(g), stage = groupStage(g), mid = GROUP_MON[g.id];
      const isNow = wk && (g === wk.cur || g === wk.test); const chal = canChallenge(g);
      return `<button class="btn group ${isNow ? "now" : ""} ${chal && !(S.gm[g.id] || {}).passed ? "challenge" : ""}" data-g="${g.id}">
        ${stage < 0 ? MON.draw(mid, 1, { silhouette: true }) : MON.draw(mid, stage)}
        <div style="flex:1;min-width:0"><div class="gname">${esc(g.name)}${wk && g === wk.test ? " 📝" : ""}${wk && g === wk.cur ? " 📒" : ""}</div>
        <div class="gsub">${g.title ? esc(g.title) + "　" : ""}學會 ${st.L}/${st.n}${(S.gm[g.id] || {}).passed ? "　🏅" : ""}</div>
        <div class="meter"><i style="width:${Math.round(st.frac * 100)}%"></i></div></div></button>`; }).join("")}</div>
    <p class="muted" style="margin-top:18px">每個區域學會 80% 的字，就能挑戰道館，讓守護怪獸進化！</p>`;
  bindSettings();
  on("[data-go]", () => { speak(" "); startRound("adventure"); });
  on("[data-free]", renderFree);
  on("[data-dex]", renderDex);
  on("[data-chal]", el => startRound("challenge", { gid: el.dataset.chal }));
  on("[data-g]", el => { const g = G[el.dataset.g]; if (canChallenge(g)) startRound("challenge", { gid: g.id });
    else toast(`${g.name}：學會 ${groupStats(g).L}/${groupStats(g).n}，學會 80% 就能挑戰道館`); });
  flush();
}
function renderFree(){
  pushScreen();
  app.innerHTML = `<div class="topbar"><button class="btn small" data-home>🏠</button><div class="title">🎯 自由練習</div>${settingsBtns()}</div>
    <div class="modes">${Object.entries(FREE).map(([k, f]) => `<button class="btn" data-mode="${k}"><span class="ic">${f.ic}</span>${esc(f.name)}</button>`).join("")}</div>
    <p class="muted" style="margin-top:16px">自由練習也會記錄，答錯的字一樣會放進錯題本。</p>`;
  on("[data-home]", renderHome); bindSettings();
  on("[data-mode]", el => { speak(" "); startRound("free", { kind: el.dataset.mode }); });
}
function renderDex(){
  pushScreen();
  const cells = [];
  D.groups.forEach(g => { const id = GROUP_MON[g.id], st = groupStage(g); cells.push({ id, st, sub: g.name }); });
  STAR_MONS.forEach(id => cells.push({ id, st: S.sm[id] ? S.sm[id].stage : -1, sub: "星星蛋" }));
  const got = cells.filter(c => c.st >= 1).length;
  app.innerHTML = `<div class="topbar"><button class="btn small" data-home>🏠</button><div class="title">📖 我的圖鑑　${got} / ${cells.length}</div>${settingsBtns()}</div>
    <p class="muted">點一下已經抓到的怪獸，牠就會當你的夥伴。</p>
    <div class="dex">${cells.map(c => { const m = MON.get(c.id);
      return `<button class="btn cell ${S.partner === c.id ? "partner" : ""}" data-p="${c.st >= 1 ? c.id : ""}">${c.st >= 1 ? MON.draw(c.id, c.st) : c.st === 0 ? MON.draw(c.id, 0) : MON.draw(c.id, 1, { silhouette: true })}
        ${c.st >= 1 ? `<span class="en">${esc(m.en)}</span><b>${esc(m.zh)}</b>` : `<b>？？？</b>`}<span class="muted" style="font-size:14px">${esc(c.sub)}</span></button>`; }).join("")}</div>`;
  on("[data-home]", renderHome); bindSettings();
  on("[data-p]", el => { if (el.dataset.p) { S.partner = el.dataset.p; save(); renderDex(); speak(MON.get(el.dataset.p).en); } });
}

/* ---------- boot ---------- */
window.__game = { S, W, D, selectIds, chooseType, weekInfo, save, flush, R: () => R, startRound, renderQ, startMatch };   // 除錯用
renderHome();
})();
