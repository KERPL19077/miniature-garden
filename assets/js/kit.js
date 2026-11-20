/* Ulipsu Digital Project kit: reusable scene builders on top of runtime.js (DP).
   Kit.cards (choice), Kit.slots (drag/tap/keyboard match), Kit.num (keypad), Kit.personal, Kit.finish (review + certificate + PDF). */
'use strict';
(function () {
var K = window.DP, $ = K.$, $$ = K.$$, esc = K.esc, Kit = {};
function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
Kit.rng = function (seed) { var a = hash(String(seed)); return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
Kit.shuffle = function (arr, r) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
Kit.pick = function (arr, r) { return arr[Math.floor(r() * arr.length)]; };
Kit.and = function (a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
Kit.tick = function () { return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 25 L21 36 L40 14" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
Kit.money = function (n) { return '₹' + String(Math.round(n)).replace(/(\d)(?=(\d\d)+\d$)/g, '$1,'); };
function top(o, lines) { return '<div class="toprow">' + K.guide(lines) + '<div class="fb" id="fb" hidden></div></div>'; }
function nextFoot() { K.setFoot({ main: 'Next', en: true, go: function () { K.next(); } }); }

/* ---- choice cards (unscored; they start the learner's chain) ---- */
Kit.cards = function (o) {
  return { id: o.id, step: 1, name: o.name, cue: function () { var u = $$('.pick:not(.sel)'), n = (o.multi || 1) - (Array.isArray(K.S().x[o.key]) ? K.S().x[o.key].length : K.S().x[o.key] ? 1 : 0); return n <= 0 ? { tap: '#b-main' } : { seq: u.slice(0, n) }; },
    render: function (el) {
      var x = K.S().x, lock = K.started(), multi = o.multi || 0; if (multi && !Array.isArray(x[o.key])) x[o.key] = [];
      el.innerHTML = '<h2 class="ask">' + o.title + '</h2><div class="cards' + o.opts.length + '">' + o.opts.map(function (p) { return '<button class="card pick" data-k="' + p.id + '"' + (lock ? ' disabled' : '') + '>' + (p.html ? '<div class="cimg">' + p.html + '</div>' : '') + '<b>' + p.t + '</b>' + (p.sub ? '<span>' + p.sub + '</span>' : '') + '<i class="tick">' + Kit.tick() + ' Chosen</i></button>'; }).join('') + '</div>' + (lock ? '<p class="note">Locked: you have started the tasks.</p>' : '');
      function has(k) { return multi ? x[o.key].indexOf(k) >= 0 : x[o.key] === k; }
      function paint() { $$('.pick', el).forEach(function (b) { b.classList.toggle('sel', has(b.dataset.k)); }); var ok = multi ? x[o.key].length === multi : !!x[o.key]; K.setFoot({ main: 'Next', en: ok, st: ok ? '' : (multi ? 'Pick ' + multi + '. Picked: ' + x[o.key].length : 'Pick one to continue.'), go: function () { K.next(); } }); }
      el.addEventListener('click', function (e) { var b = e.target.closest('.pick'); if (!b || b.disabled) return; var k = b.dataset.k;
        if (multi) { var i = x[o.key].indexOf(k); if (i >= 0) x[o.key].splice(i, 1); else { if (x[o.key].length >= multi) x[o.key].shift(); x[o.key].push(k); } } else x[o.key] = k;
        (o.reset || []).forEach(function (r) { delete x[r]; }); K.save(); K.SFX.tap(); paint(); });
      paint();
    } };
};

/* ---- drag / tap-then-tap / keyboard matching board ---- */
Kit.slots = function (o) {
  return { id: o.id, step: 1, name: o.name, items: [o.id], cue: function () { return $('#b-main').disabled && !K.done(o.id) ? { drag: { from: '#pool .chip', to: '.slot:not(.full)' } } : { tap: '#b-main' }; },
    render: function (el) {
      var D = K.D(), x = K.S().x, chips = o.chips(D), slots = o.slots(D), key = 'a_' + o.id, asg = x[key] = x[key] || {}, fin = K.done(o.id), sel = null, drag = null, busy = false;
      var real = chips.filter(function (c) { return c.slot; });
      function truth() { if (o.solveAsg) return o.solveAsg(D); var t = {}; real.forEach(function (c) { t[c.id] = c.slot; }); return t; }
      function okAt(c, s) { return o.ok ? o.ok(c, s, D) : c.slot === s; }
      if (fin) { x[key] = asg = truth(); }
      el.innerHTML = top(o, o.guide(D)) + '<div class="board ' + (o.cls || '') + '"><div class="slots ' + (o.cols ? 'c' + o.cols : '') + '" id="slots">' + (o.board ? o.board(D, slotEl) : slots.map(slotEl).join('')) + '</div><div class="pool" id="pool"></div></div>';
      function slotEl(s) { return '<div class="slot ' + (s.cls || '') + '" data-slot="' + s.id + '" tabindex="0" role="group" aria-label="' + esc(s.aria || s.id) + '">' + (s.label ? '<span class="slab">' + s.label + '</span>' : '') + '<div class="sbody"></div></div>'; }
      function chipHtml(c, st) { return '<button class="chip ' + (c.cls || '') + (st ? ' ' + st : '') + (sel === c.id ? ' sel' : '') + '" data-id="' + c.id + '"' + (fin ? ' disabled' : '') + ' style="' + (c.style || '') + '">' + c.html + '</button>'; }
      var badIds = {};
      function paint() {
        $$('.slot', el).forEach(function (se) { var sid = se.dataset.slot, sd = slots.filter(function (s) { return s.id === sid; })[0], mine = chips.filter(function (c) { return asg[c.id] === sid; }); se.querySelector('.sbody').innerHTML = mine.map(function (c) { return chipHtml(c, fin ? 'ok' : badIds[c.id] ? 'bad' : ''); }).join(''); se.classList.toggle('full', mine.length >= (sd.cap || 1)); });
        $('#pool').innerHTML = chips.filter(function (c) { return !asg[c.id]; }).map(function (c) { return chipHtml(c); }).join('');
        var n = real.filter(function (c) { return asg[c.id]; }).length; if (o.onPaint) o.onPaint(asg, D, el, chips); if (!K.done(o.id)) K.setFoot({ main: 'Check', en: !busy && (o.ready ? o.ready(asg, D) : n === real.length), item: o.id, go: check });
      }
      function place(id, sid) {
        if (K.done(o.id) || busy) return; var sd = slots.filter(function (s) { return s.id === sid; })[0];
        if (sd) { var mine = chips.filter(function (c) { return asg[c.id] === sid && c.id !== id; }); if (mine.length >= (sd.cap || 1)) delete asg[mine[0].id]; asg[id] = sid; } else delete asg[id];
        badIds = {}; sel = null; K.save(); K.SFX.tap(); paint();
      }
      function slotAt(cx, cy) { var l = document.elementsFromPoint(cx, cy); for (var i = 0; i < l.length; i++) { var s = l[i].closest && l[i].closest('.slot'); if (s && el.contains(s)) return s; } return null; }
      el.addEventListener('pointerdown', function (e) { var c = e.target.closest('.chip'); if (!c || c.disabled || busy) return; drag = { c: c, id: c.dataset.id, sx: e.clientX, sy: e.clientY, moved: false, g: null }; });
      K.winOn('pointermove', function (e) { if (!drag) return; if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 10) return;
        if (!drag.moved) { drag.moved = true; var g = drag.c.cloneNode(true); g.classList.add('ghost'); var r = drag.c.getBoundingClientRect(), k = $('#stage').getBoundingClientRect().width / 1920; g.style.width = r.width / k + 'px'; $('#stage').appendChild(g); drag.g = g; drag.c.classList.add('lift'); }
        var p = K.stagePt(e); drag.g.style.left = p.x - 60 + 'px'; drag.g.style.top = p.y - 40 + 'px'; $$('.slot.over', el).forEach(function (s) { s.classList.remove('over'); }); var s = slotAt(e.clientX, e.clientY); if (s) s.classList.add('over'); });
      K.winOn('pointerup', function (e) { if (!drag) return; var d = drag; drag = null; if (d.g) d.g.remove(); $$('.slot.over', el).forEach(function (s) { s.classList.remove('over'); }); d.c.classList.remove('lift');
        if (d.moved) { var s = slotAt(e.clientX, e.clientY); place(d.id, s ? s.dataset.slot : null); } else { sel = sel === d.id ? null : d.id; K.SFX.tap(); paint(); } });
      el.addEventListener('click', function (e) { var c = e.target.closest('.chip'); if (c) { if (e.detail === 0 && !c.disabled) { sel = sel === c.dataset.id ? null : c.dataset.id; paint(); var nc = $('.chip.sel', el); if (nc) nc.focus(); } return; } var s = e.target.closest('.slot'); if (s && sel) place(sel, s.dataset.slot); else if (e.target.closest('#pool') && sel) place(sel, null); });
      el.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && sel) { var s = e.target.closest('.slot'); if (s) { e.preventDefault(); place(sel, s.dataset.slot); } } });
      function check() {
        busy = true; var wrong = [], t = truth(), vr = o.verify ? o.verify(asg, D) : null; if (!vr) chips.forEach(function (c) { if (c.slot ? !(asg[c.id] && okAt(c, asg[c.id])) : !!asg[c.id]) wrong.push(c.id); });
        var ok = vr ? vr.ok : !wrong.length, s = K.attempt(o.id, ok, Object.keys(asg).map(function (k) { return k + ':' + asg[k]; }).join(' '));
        if (ok) { K.SFX.ok(); fin = true; busy = false; badIds = {}; paint(); K.fb('ok', 'Correct.', o.good || ''); nextFoot(); return; } K.SFX.bad();
        if (s.rev) { fin = true; busy = false; x[key] = asg = truth(); badIds = {}; paint(); K.fb('rev', 'Answer shown.', o.reveal || ''); nextFoot(); return; }
        wrong.forEach(function (id) { badIds[id] = 1; }); paint();
        K.fb(s.a === 1 ? 'no' : 'hint', s.a === 1 ? 'Not yet.' : 'Hint.', (s.a === 1 ? (o.bad1 ? o.bad1(D, vr || wrong.length) : wrong.length + ' marked with a cross: look again. ') : (o.hint ? o.hint(D) : 'Read each clue carefully. ')) + K.lostHtml(o.id));
        K.tm(function () { if (!vr) wrong.forEach(function (id) { delete asg[id]; }); badIds = {}; busy = false; K.save(); paint(); }, 1500);
      }
      K.solve = function () { var tr = truth(); chips.forEach(function (c) { if (tr[c.id]) asg[c.id] = tr[c.id]; else delete asg[c.id]; }); paint(); };
      paint(); if (fin) { K.fb('ok', 'Done.', ''); nextFoot(); }
    } };
};

/* ---- numeric entry with the built-in keypad ---- */
Kit.num = function (o) {
  return { id: o.id, step: 1, name: o.name, items: [o.id], cue: function () { var f = $$('.field').filter(function (e) { return e.textContent === '?'; })[0]; return f ? { seq: [f, '.key[data-k="5"]'] } : { tap: '#b-main' }; },
    render: function (el) {
      var D = K.D(), F = o.fields(D), fin = K.done(o.id);
      el.innerHTML = top(o, o.guide(D)) + '<div class="paper calc" id="host"><div class="left">' + (o.top ? o.top(D) : '') + '<div class="fields ' + (o.fcls || '') + '">' + F.map(function (f, i) { return '<div class="frow"><span>' + (f.lbl || '') + '</span><button class="field" data-i="' + i + '">?</button><span class="unit">' + (f.unit || '') + '</span></div>'; }).join('') + '</div></div>' + K.padHtml() + '</div>';
      var host = $('#host'), kp = K.keypad(host, F.length, function (v) { if (!K.done(o.id)) K.setFoot({ main: 'Check', en: v.every(function (a) { return a !== '' && a !== '.'; }), item: o.id, go: check }); });
      function lock() { var fs = $$('.field', host); F.forEach(function (f, i) { fs[i].textContent = f.ans; fs[i].classList.add('ok'); }); kp.lock(); nextFoot(); }
      function check() {
        var v = kp.vals().map(parseFloat), r = F.map(function (f, i) { return Math.abs(v[i] - f.ans) <= (f.tol || 0) + 1e-9; }), ok = r.every(Boolean), s = K.attempt(o.id, ok, v.join('x')); r.forEach(function (g, i) { kp.mark(i, g ? 'ok' : 'no'); });
        if (ok) { K.SFX.ok(); K.fb('ok', 'Correct.', o.good || ''); lock(); return; } K.SFX.bad();
        if (s.rev) { K.fb('rev', 'Answer shown.', o.reveal(D)); lock(); return; }
        K.fb(s.a === 1 ? 'no' : 'hint', s.a === 1 ? 'Not yet.' : 'Hint.', (s.a === 1 ? (o.bad1 ? o.bad1(D, v) : 'A tick means right. Fix the crossed box. ') : o.hint(D)) + ' ' + K.lostHtml(o.id)); K.setFoot({ main: 'Check', en: true, item: o.id, go: check });
      }
      K.solve = function () { var fs = $$('.field', host); F.forEach(function (f, i) { fs[i].click(); String(f.ans).split('').forEach(function (ch) { $('.key[data-k="' + ch + '"]', host).click(); }); }); };
      if (fin) lock();
    } };
};

/* ---- findings + certificate colours (unscored) ---- */
Kit.personal = function (o) {
  return { id: 'personalise', step: 1, name: 'Make it yours', cue: function () { return { tap: '#b-main' }; },
    render: function (el) {
      var D = K.D(), x = K.S().x; if (x.findings == null) x.findings = o.findings(K.S(), D); x.theme = x.theme || o.themes[0].id; var cap = o.cap || 500;
      el.innerHTML = '<div class="split2"><div class="paper"><div><div class="eyebrow">' + (o.label || 'Your findings') + '</div><p class="findings" id="ft"></p></div><button class="btn pri" id="edit">Edit</button></div><div><h2 class="ask">Certificate colours</h2><div class="themes">' + o.themes.map(function (t) { return '<button class="card pick theme" data-t="' + t.id + '"><div class="sw3"><i style="background:' + t.ink + '"></i><i style="background:' + t.acc + '"></i><i style="background:' + t.hi + '"></i></div><b>' + t.n + '</b><i class="tick">' + Kit.tick() + ' Chosen</i></button>'; }).join('') + '</div></div></div>';
      function paint() { $('#ft').textContent = x.findings; $$('.theme', el).forEach(function (b) { b.classList.toggle('sel', b.dataset.t === x.theme); }); }
      el.addEventListener('click', function (e) { var b = e.target.closest('.theme'); if (!b) return; x.theme = b.dataset.t; K.save(); K.SFX.tap(); paint(); });
      $('#edit').addEventListener('click', function () { K.showLayer('<h2>' + (o.label || 'Your findings') + '</h2><textarea id="ta" maxlength="' + cap + '"></textarea><p class="ra"><span class="count" id="cn"></span><button class="btn pri" id="dn">Done</button></p>', 'editor'); var ta = $('#ta'); ta.value = x.findings; function c() { $('#cn').textContent = ta.value.length + ' / ' + cap; } c(); ta.addEventListener('input', c); $('#dn').addEventListener('click', function () { x.findings = ta.value.slice(0, cap); K.save(); K.hideLayer(); paint(); }); });
      paint(); nextFoot();
    } };
};

/* ---- review, certificate pages, PDF ---- */
Kit.finish = function (o) {
  function th(S) { var id = S.x.theme || o.themes[0].id; return o.themes.filter(function (t) { return t.id === id; })[0] || o.themes[0]; }
  function chainHtml(S, D) { return o.chain(S, D).map(function (c, i) { return '<div class="cr"><span class="n">' + (i + 1) + '</span><div><b>' + esc(c.choice) + '</b><span>' + esc(c.consequence) + '</span></div></div>'; }).join(''); }
  function sty(t) { return '--ci:' + t.ink + ';--ca:' + t.acc + ';--ch:' + t.hi + ';--cp:' + t.paper; }
  function p0(S, D, f) { var t = th(S), nm = S.name || o.defaultName || 'Young Learner', dt = new Date(f.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), b = o.badges(S, D);
    return '<div class="certwrap"><div class="cert" style="' + sty(t) + '"><div class="cin"><img class="clogo" src="assets/img/ulipsu-logo.svg" alt="Ulipsu"><h1>Certificate of Achievement</h1><p class="pre">proudly presented to</p><p class="nm">' + esc(nm) + '</p><p class="for">' + esc(o.line(S, D)) + '</p><p class="out">' + esc(o.headline(S, D)) + '</p><div class="seals">' + b.map(function (s, i) { return '<div class="seal' + (i ? ' two' : '') + '"><b>' + esc(s.b) + '</b><span>' + esc(s.s) + '</span></div>'; }).join('') + '</div><p class="date">' + dt + '</p></div></div></div>'; }
  function p1(S, D, f) { var t = th(S); return '<div class="split journey" style="' + sty(t) + '"><div class="paper review"><div class="eyebrow">Your choices and what they led to</div>' + chainHtml(S, D) + '</div><div class="paper review"><div class="eyebrow">Your results</div>' + K.C().items.map(function (d) { var s = S.items[d.id] || {}; return '<div class="rr"><b>' + esc(o.itemNames[d.id]) + '</b><span>' + K.how(d.id) + '</span></div>'; }).join('') + '<div class="rr tot"><b>Score ' + f.points + ' / 1000</b><span>Rank Points ' + f.rank + ' / 100</span></div></div></div>'; }
  function p2(S, D, f) { var t = th(S); return '<div class="split journey" style="' + sty(t) + '"><div class="stagebox art">' + o.art(S, D) + '</div><div class="paper review fin"><div class="eyebrow">Congratulations</div><h2>You did it!</h2><p class="fine">' + esc(K.C().disclaimer) + ' ' + esc(K.C().aiNote) + '</p><p class="outcome dark">' + esc(o.headline(S, D)) + '</p></div></div>'; }
  function pdf(pdf, S, D, info) {
    var W = 842, H = 595, t = th(S), nm = info.name || o.defaultName || 'Young Learner', dt = info.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), ch = o.chain(S, D), b = o.badges(S, D);
    function frame() { pdf.page(); pdf.rect(0, 0, W, H, t.paper); pdf.rect(22, 22, W - 44, H - 44, null, t.ink, 3); pdf.rect(32, 32, W - 64, H - 64, null, t.hi, 1.2);
      [[32, 32, 1, 1], [W - 32, 32, -1, 1], [32, H - 32, 1, -1], [W - 32, H - 32, -1, -1]].forEach(function (c) { pdf.poly([[c[0], c[1]], [c[0] + c[2] * 30, c[1]], [c[0], c[1] + c[3] * 30]], t.acc); });
      pdf.text(W / 2, H - 48, K.C().disclaimer, 7.5, 'sans', '#4A5568', 'c'); pdf.text(W / 2, H - 39, K.C().aiNote + '  Project ' + K.C().id + ' v' + K.C().version, 7.5, 'sans', '#4A5568', 'c'); }
    frame(); pdf.logo(W / 2 - 80, 56, 160); pdf.text(W / 2, 168, 'CERTIFICATE', 38, 'serifb', t.ink, 'c', 5); pdf.text(W / 2, 192, 'OF ACHIEVEMENT', 15, 'sans', t.acc, 'c', 6); pdf.line(W / 2 - 90, 204, W / 2 + 90, 204, t.hi, 1.5);
    pdf.text(W / 2, 228, 'proudly presented to', 13, 'serifi', '#4A5568', 'c'); pdf.text(W / 2, 268, nm, 32, 'serifb', t.ink, 'c'); pdf.line(W / 2 - 150, 278, W / 2 + 150, 278, t.ink, 0.8);
    pdf.para(80, 300, o.line(S, D), 13, W - 160, 16, 'serifi', '#2D3748', 'c'); pdf.text(W / 2, 346, o.headline(S, D), 24, 'serifb', t.acc, 'c');
    [W / 2 - 150, W / 2 + 150].forEach(function (cx, i) { var s = b[i]; pdf.star(cx, 420, 52, 46, 16, i ? t.acc : t.ink, t.hi, 2); pdf.circle(cx, 420, 38, null, t.hi, 1); pdf.text(cx, 418, s.b, 11, 'bold', '#FFFFFF', 'c'); pdf.text(cx, 432, s.s, 7, 'sans', '#FFFFFF', 'c'); });
    pdf.text(W / 2, 410, dt, 12, 'serifi', '#2D3748', 'c'); pdf.line(W / 2 - 60, 416, W / 2 + 60, 416, t.hi, 1); pdf.text(W / 2, 430, 'Date of completion', 8, 'sans', '#4A5568', 'c');
    pdf.line(90, 500, 250, 500, t.ink, 0.8); pdf.text(170, 512, 'Ulipsu Digital Projects', 9, 'sans', '#2D3748', 'c'); pdf.line(W - 250, 500, W - 90, 500, t.ink, 0.8); pdf.text(W - 170, 512, o.guideName + ', your guide', 9, 'sans', '#2D3748', 'c');
    frame(); pdf.logo(48, 44, 96); pdf.text(W - 52, 66, 'Your journey', 24, 'serifb', t.ink, 'r');
    var y = 120; ch.forEach(function (c, i) { pdf.circle(66, y - 4, 11, t.acc); pdf.text(66, y, String(i + 1), 11, 'bold', '#FFFFFF', 'c'); pdf.text(88, y, c.choice, 13, 'bold', t.ink); y = pdf.para(88, y + 16, c.consequence, 11, 380, 14, 'sans', '#2D3748') + 14; });
    pdf.rect(500, 100, 296, 340, '#FFFFFF', t.hi, 1); pdf.text(516, 124, 'Your results', 14, 'serifb', t.ink);
    K.C().items.forEach(function (d, i) { var s = S.items[d.id] || {}, yy = 150 + i * Math.min(36, 270 / K.C().items.length); pdf.text(516, yy, o.itemNames[d.id], 12, 'bold', '#2D3748'); pdf.text(516, yy + 14, s.rev ? 'Answer shown (3 tries used)' : (s.a === 1 ? 'Right on the 1st try' : 'Right on try ' + s.a), 11, 'sans', s.rev ? '#9C4221' : '#276749'); });
    if (S.x.findings) pdf.para(60, 480, '"' + S.x.findings + '"', 12, 720, 16, 'serifi', '#2D3748');
    frame(); pdf.logo(48, 44, 96); pdf.text(W - 52, 66, o.artTitle || 'Your finished work', 24, 'serifb', t.ink, 'r'); o.pdfArt(pdf, 60, 100, 380, 380, t, S, D);
    pdf.text(500, 150, 'Congratulations!', 30, 'serifb', t.acc); pdf.para(500, 180, o.outro, 13, 290, 18, 'serifi', '#2D3748'); pdf.para(500, 290, o.headline(S, D), 17, 300, 21, 'serifb', t.ink); pdf.star(560, 400, 62, 52, 16, t.ink, t.hi, 2); pdf.text(560, 398, 'WELL', 16, 'bold', '#FFFFFF', 'c', 2); pdf.text(560, 418, 'DONE', 16, 'bold', '#FFFFFF', 'c', 2);
  }
  return { reviewHtml: function (S, D) { return '<div class="split"><div class="paper review"><div class="eyebrow">Your journey</div>' + chainHtml(S, D) + '</div><div class="stagebox art"><div class="eyebrow light">Your work</div>' + o.art(S, D) + '<p class="outcome">' + esc(o.headline(S, D)) + '</p></div></div>'; },
    certPages: [p0, p1, p2], pdf: pdf, chain: o.chain,
    reportHtml: function (S, D, sc) { return '<h1>' + esc(K.C().title) + '</h1><p>' + esc(o.headline(S, D)) + '</p><p>Score ' + sc.points + ' / 1000. Rank Points ' + sc.rank + ' / 100.</p><ol>' + o.chain(S, D).map(function (c) { return '<li><b>' + esc(c.choice) + '</b> ' + esc(c.consequence) + '</li>'; }).join('') + '</ol><p>' + esc(S.x.findings || '') + '</p><p>' + esc(K.C().disclaimer) + ' ' + esc(K.C().aiNote) + '</p>'; } };
};

Kit.run = function (o) { var f = Kit.finish(o); K.run({ C: window.CONTENT, guide: o.guideSvg, scenes: o.scenes, dataKey: o.dataKey, data: o.data, chain: f.chain, reviewHtml: f.reviewHtml, certPages: f.certPages, pdf: f.pdf, reportHtml: f.reportHtml }); };
window.Kit = Kit;
})();
